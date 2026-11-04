-- Admin portal. Team members work the follow-up queue. Admins also see members
-- and system numbers. Only the database decides who is an admin, and roles are
-- set by hand. Admins never get members' reasons or message contents.

alter table public.team_members
  add column role text not null default 'team' check (role in ('team', 'admin'));

create function public.my_team_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.team_members where user_id = auth.uid();
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.team_members where user_id = auth.uid() and role = 'admin'
  );
$$;

create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not_allowed';
  end if;
  return jsonb_build_object(
    'members', (select count(*) from public.profiles),
    'new_this_week', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'suspended', (select count(*) from public.profiles where suspended_at is not null),
    'posts', (select count(*) from public.posts),
    'support_posts', (select count(*) from public.posts where feed = 'support'),
    'comments', (select count(*) from public.comments),
    'messages', (select count(*) from public.messages),
    'open_flags', (select count(*) from public.flags where status = 'open'),
    'oldest_open_at', (select min(created_at) from public.flags where status = 'open'),
    'followed_up', (select count(*) from public.flags where status = 'followed_up'),
    'average_follow_up_minutes', (
      select round(avg(extract(epoch from followed_up_at - created_at)) / 60)
      from public.flags where status = 'followed_up'
    )
  );
end;
$$;

-- Deliberately leaves out reasons and saved affirmations.
create function public.admin_members()
returns table (
  member_id uuid, member_alias text, strikes int, suspended_at timestamptz,
  joined_at timestamptz, post_count bigint, comment_count bigint
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.alias, p.strikes, p.suspended_at, p.created_at,
    (select count(*) from public.posts po where po.author_id = p.id),
    (select count(*) from public.comments c where c.author_id = p.id)
  from public.profiles p
  where public.is_admin()
  order by p.created_at desc
  limit 500;
$$;

-- Lifting a suspension also clears strikes, so one slip can't re-suspend her.
create function public.admin_set_suspended(p_member uuid, p_suspended boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not_allowed';
  end if;
  update public.profiles
  set suspended_at = case when p_suspended then coalesce(suspended_at, now()) end,
      strikes = case when p_suspended then strikes else 0 end
  where id = p_member;
end;
$$;

revoke execute on function
  public.my_team_role(), public.is_admin(), public.admin_overview(),
  public.admin_members(), public.admin_set_suspended(uuid, boolean)
from public, anon, authenticated;

grant execute on function
  public.my_team_role(), public.is_admin(), public.admin_overview(),
  public.admin_members(), public.admin_set_suspended(uuid, boolean)
to authenticated;
