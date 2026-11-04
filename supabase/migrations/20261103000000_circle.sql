-- Naa Samasthanam: the shared circle.
-- Row-level security is the real privacy boundary: the browser is never trusted.
-- Members are anonymous accounts (no email or phone). Team members are email
-- accounts added to team_members by hand, so nobody can claim the role.

-- Team ---------------------------------------------------------------------
create table public.team_members (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.team_members enable row level security;

create function public.is_team() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members where user_id = auth.uid());
$$;

-- Profiles: private to their owner. Others only ever see the alias copied onto
-- posts, comments and conversations.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  alias text not null check (
    char_length(alias) between 6 and 20
    and alias !~ '\s'
    and alias ~ '_'
    and alias ~ '[0-9]'
    and replace(alias, '_', '') !~ '[[:punct:]]'
  ),
  alias_key text generated always as (lower(alias)) stored unique,
  reasons text[] not null default '{}',
  saved_affirmations text[] not null default '{}',
  message_privacy text not null default 'Circle members only'
    check (message_privacy in ('Circle members only', 'No one')),
  suggest_support boolean not null default true,
  strikes int not null default 0,
  suspended_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create function public.can_post() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and suspended_at is null
  );
$$;

create policy "own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Choosing an alias creates the profile. Calling again changes the alias.
create function public.claim_alias(p_alias text, p_reasons text[] default '{}')
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if lower(p_alias) in ('team', 'admin', 'moderator', 'naa_samasthanam', 'support') then
    raise exception 'alias_reserved';
  end if;
  insert into public.profiles (id, alias, reasons)
  values (auth.uid(), p_alias, coalesce(p_reasons, '{}'))
  on conflict (id) do update set alias = excluded.alias, reasons = excluded.reasons
  returning * into result;
  return result;
exception
  when unique_violation then raise exception 'alias_taken';
  when check_violation then raise exception 'alias_invalid';
end;
$$;

-- A blocked comment. Three suspend the account.
create function public.record_strike() returns public.profiles
language sql security definer set search_path = '' as $$
  update public.profiles
  set strikes = strikes + 1,
      suspended_at = case when strikes + 1 >= 3 then coalesce(suspended_at, now()) else suspended_at end
  where id = auth.uid()
  returning *;
$$;

-- Posts ---------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles on delete cascade,
  author_alias text not null,
  feed text not null default 'circle' check (feed in ('circle', 'support')),
  topic text not null default '',
  body text not null check (char_length(body) between 1 and 5000),
  edited boolean not null default false,
  archived boolean not null default false,
  support_count int not null default 0,
  created_at timestamptz not null default now()
);
create index posts_feed_created_idx on public.posts (created_at desc);
alter table public.posts enable row level security;

create function public.fill_post() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.author_id := auth.uid();
  select alias into new.author_alias from public.profiles where id = auth.uid();
  if new.author_alias is null then
    raise exception 'not_a_member';
  end if;
  return new;
end;
$$;
create trigger fill_post before insert on public.posts
  for each row execute function public.fill_post();

create function public.mark_post_edited() returns trigger
language plpgsql as $$
begin
  if new.body is distinct from old.body then
    new.edited := true;
  end if;
  return new;
end;
$$;
create trigger mark_post_edited before update on public.posts
  for each row execute function public.mark_post_edited();

create policy "read visible posts" on public.posts
  for select to authenticated using (
    public.is_team()
    or author_id = auth.uid()
    or (public.is_member() and not archived)
  );
create policy "write own posts" on public.posts
  for insert to authenticated with check (author_id = auth.uid() and public.can_post());
-- Suspended members can still edit, archive or delete their own words.
create policy "edit own posts" on public.posts
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "delete own posts or team" on public.posts
  for delete to authenticated using (author_id = auth.uid() or public.is_team());

-- Comments ------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  author_id uuid references auth.users on delete set null,
  author_alias text not null,
  as_team boolean not null default false,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
alter table public.comments enable row level security;

create function public.fill_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.author_id := auth.uid();
  if new.as_team then
    if not public.is_team() then
      raise exception 'not_team';
    end if;
    new.author_alias := 'Naa Samasthanam team';
  else
    select alias into new.author_alias from public.profiles where id = auth.uid();
    if new.author_alias is null then
      raise exception 'not_a_member';
    end if;
  end if;
  return new;
end;
$$;
create trigger fill_comment before insert on public.comments
  for each row execute function public.fill_comment();

create policy "read comments on visible posts" on public.comments
  for select to authenticated using (
    exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "write comments" on public.comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id)
    and (public.can_post() or (as_team and public.is_team()))
  );
create policy "delete own comments or team" on public.comments
  for delete to authenticated using (author_id = auth.uid() or public.is_team());

-- Support hearts ------------------------------------------------------------
create table public.supports (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  primary key (post_id, user_id)
);
alter table public.supports enable row level security;

create policy "own supports" on public.supports
  for select to authenticated using (user_id = auth.uid());
create policy "add own support" on public.supports
  for insert to authenticated with check (
    user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "remove own support" on public.supports
  for delete to authenticated using (user_id = auth.uid());

create function public.count_support() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.posts
  set support_count = support_count + case when tg_op = 'INSERT' then 1 else -1 end
  where id = coalesce(new.post_id, old.post_id);
  return null;
end;
$$;
create trigger count_support after insert or delete on public.supports
  for each row execute function public.count_support();

-- Flags: the team's follow-up queue. Members can raise one but can never read
-- the queue. The post is copied in, so a flag survives if the post is deleted;
-- that copy is erased once the team has followed up.
create table public.flags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts on delete set null,
  post_author text not null,
  post_text text not null,
  reporter_id uuid references auth.users on delete set null,
  source text not null default 'member' check (source in ('member', 'needs_support')),
  status text not null default 'open' check (status in ('open', 'followed_up')),
  followed_up_by uuid references auth.users on delete set null,
  followed_up_at timestamptz,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);
create index flags_open_idx on public.flags (status, created_at);
alter table public.flags enable row level security;

create function public.fill_flag() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  flagged public.posts;
begin
  if new.source = 'member' then
    select * into flagged from public.posts where id = new.post_id;
    new.reporter_id := auth.uid();
    new.post_author := flagged.author_alias;
    new.post_text := flagged.body;
  end if;
  return new;
end;
$$;
create trigger fill_flag before insert on public.flags
  for each row execute function public.fill_flag();

create function public.close_flag() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'followed_up' and old.status <> 'followed_up' then
    new.followed_up_by := auth.uid();
    new.followed_up_at := now();
    if new.post_id is null then
      new.post_text := '';
    end if;
  end if;
  return new;
end;
$$;
create trigger close_flag before update on public.flags
  for each row execute function public.close_flag();

-- Every Needs Support post goes to the team without anyone having to flag it.
create function public.queue_support_post() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.feed = 'support' then
    insert into public.flags (post_id, post_author, post_text, source)
    values (new.id, new.author_alias, new.body, 'needs_support');
  end if;
  return null;
end;
$$;
create trigger queue_support_post after insert on public.posts
  for each row execute function public.queue_support_post();

create policy "team reads flags" on public.flags
  for select to authenticated using (public.is_team());
create policy "team updates flags" on public.flags
  for update to authenticated using (public.is_team()) with check (public.is_team());
create policy "members raise flags" on public.flags
  for insert to authenticated with check (
    reporter_id = auth.uid()
    and public.is_member()
    and exists (select 1 from public.posts p where p.id = post_id)
  );

-- Lets a member see which posts she flagged, without any access to the queue.
create function public.my_flags() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select post_id from public.flags where reporter_id = auth.uid() and post_id is not null;
$$;

-- Messages: only the two people in a conversation can read them, team included.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles on delete cascade,
  recipient_id uuid not null references public.profiles on delete cascade,
  requester_alias text not null,
  recipient_alias text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  requester_read_at timestamptz not null default now(),
  recipient_read_at timestamptz not null default 'epoch',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create unique index conversations_pair_idx on public.conversations (
  least(requester_id, recipient_id), greatest(requester_id, recipient_id)
);
alter table public.conversations enable row level security;

create policy "own conversations" on public.conversations
  for select to authenticated using (auth.uid() in (requester_id, recipient_id));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
alter table public.messages enable row level security;

create policy "read own messages" on public.messages
  for select to authenticated using (
    exists (select 1 from public.conversations c where c.id = conversation_id)
  );
create policy "send in accepted conversations" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and public.can_post()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.status = 'accepted'
    )
  );

create function public.touch_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      requester_read_at = case when requester_id = new.sender_id then new.created_at else requester_read_at end,
      recipient_read_at = case when recipient_id = new.sender_id then new.created_at else recipient_read_at end
  where id = new.conversation_id;
  return null;
end;
$$;
create trigger touch_conversation after insert on public.messages
  for each row execute function public.touch_conversation();

-- Reach out to the author of a post she can see. Authors are never looked up by
-- id, and a declined request can't be sent again.
create function public.start_conversation(p_post uuid, p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  sender public.profiles;
  target public.profiles;
  new_id uuid;
begin
  select * into sender from public.profiles where id = auth.uid() and suspended_at is null;
  if sender.id is null then
    raise exception 'not_allowed';
  end if;
  select pr.* into target
  from public.posts po join public.profiles pr on pr.id = po.author_id
  where po.id = p_post and not po.archived;
  if target.id is null or target.id = sender.id then
    raise exception 'not_allowed';
  end if;
  if target.message_privacy = 'No one' or target.suspended_at is not null then
    raise exception 'not_accepting';
  end if;
  insert into public.conversations (requester_id, recipient_id, requester_alias, recipient_alias)
  values (sender.id, target.id, sender.alias, target.alias)
  returning id into new_id;
  insert into public.messages (conversation_id, sender_id, body)
  values (new_id, sender.id, p_message);
  return new_id;
exception
  when unique_violation then raise exception 'already_requested';
end;
$$;

create function public.respond_to_request(p_conversation uuid, p_accept boolean) returns void
language sql security definer set search_path = '' as $$
  update public.conversations
  set status = case when p_accept then 'accepted' else 'declined' end
  where id = p_conversation and recipient_id = auth.uid() and status = 'pending';
$$;

create function public.mark_conversation_read(p_conversation uuid) returns void
language sql security definer set search_path = '' as $$
  update public.conversations
  set requester_read_at = case when requester_id = auth.uid() then now() else requester_read_at end,
      recipient_read_at = case when recipient_id = auth.uid() then now() else recipient_read_at end
  where id = p_conversation and auth.uid() in (requester_id, recipient_id);
$$;

-- Permissions ---------------------------------------------------------------
-- Start from nothing, then grant only the columns each action needs. Things
-- like strikes, suspension, alias and support_count can't be set from a browser.
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant update (reasons, saved_affirmations, message_privacy, suggest_support) on public.profiles to authenticated;
grant select, delete on public.posts to authenticated;
grant insert (feed, topic, body) on public.posts to authenticated;
grant update (body, archived) on public.posts to authenticated;
grant select, delete on public.comments to authenticated;
grant insert (post_id, body, as_team) on public.comments to authenticated;
grant select, delete on public.supports to authenticated;
grant insert (post_id) on public.supports to authenticated;
grant select on public.flags to authenticated;
grant insert (post_id) on public.flags to authenticated;
grant update (status) on public.flags to authenticated;
grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;

grant execute on function
  public.is_team(), public.is_member(), public.can_post(),
  public.claim_alias(text, text[]), public.record_strike(), public.my_flags(),
  public.start_conversation(uuid, text), public.respond_to_request(uuid, boolean),
  public.mark_conversation_read(uuid)
to authenticated;
