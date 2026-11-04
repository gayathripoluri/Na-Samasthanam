-- Comment reports and suspension appeals arrive in the team queue instead of by
-- email. Members' own email addresses are never involved, and the team's alert
-- address lives only in a server secret.

alter table public.flags drop constraint flags_source_check;
alter table public.flags add constraint flags_source_check
  check (source in ('member', 'needs_support', 'comment_report', 'appeal'));

alter table public.flags
  add column comment_id uuid references public.comments on delete set null,
  add column reported_author text,
  add column reported_comment text,
  add column reason text,
  add column urgent boolean not null default false;

-- One flag per post and one report per comment, per member. A member can now
-- report several comments on the same post.
alter table public.flags drop constraint flags_post_id_reporter_id_key;
create unique index flags_member_once on public.flags (post_id, reporter_id)
  where source = 'member';
create unique index flags_report_once on public.flags (comment_id, reporter_id)
  where source = 'comment_report';
create index flags_urgent_idx on public.flags (status, urgent desc, created_at);

-- Only "Flag for support" marks a post as flagged for the member.
create or replace function public.my_flags() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select post_id from public.flags
  where reporter_id = auth.uid() and post_id is not null and source = 'member';
$$;

create or replace function public.close_flag() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'followed_up' and old.status <> 'followed_up' then
    new.followed_up_by := auth.uid();
    new.followed_up_at := now();
    if new.post_id is null then
      new.post_text := '';
      new.reported_comment := null;
    end if;
  end if;
  return new;
end;
$$;

-- Only a post's author can report a comment on it, and never her own or the
-- team's. The commenter is not told.
create function public.report_comment(p_comment uuid, p_reason text, p_urgent boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  reported public.comments;
  parent public.posts;
begin
  if char_length(coalesce(p_reason, '')) not between 1 and 100 then
    raise exception 'not_allowed';
  end if;
  select c.* into reported from public.comments c where c.id = p_comment;
  select p.* into parent from public.posts p where p.id = reported.post_id;
  if parent.id is null
    or parent.author_id <> auth.uid()
    or reported.as_team
    or reported.author_id is not distinct from auth.uid() then
    raise exception 'not_allowed';
  end if;
  insert into public.flags (
    post_id, post_author, post_text, reporter_id, source,
    comment_id, reported_author, reported_comment, reason, urgent
  )
  values (
    parent.id, parent.author_alias, parent.body, auth.uid(), 'comment_report',
    reported.id, reported.author_alias, reported.body, p_reason, coalesce(p_urgent, false)
  );
exception
  when unique_violation then raise exception 'already_reported';
end;
$$;

-- Suspended members can ask the team to review, one open appeal at a time.
create function public.submit_appeal(p_message text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  member public.profiles;
begin
  select * into member from public.profiles
  where id = auth.uid() and suspended_at is not null;
  if member.id is null or char_length(coalesce(trim(p_message), '')) not between 1 and 2000 then
    raise exception 'not_allowed';
  end if;
  if exists (
    select 1 from public.flags
    where reporter_id = auth.uid() and source = 'appeal' and status = 'open'
  ) then
    raise exception 'already_appealed';
  end if;
  insert into public.flags (post_author, post_text, reporter_id, source)
  values (member.alias, trim(p_message), auth.uid(), 'appeal');
end;
$$;

revoke execute on function
  public.report_comment(uuid, text, boolean), public.submit_appeal(text)
from public, anon, authenticated;

grant execute on function
  public.report_comment(uuid, text, boolean), public.submit_appeal(text)
to authenticated;
