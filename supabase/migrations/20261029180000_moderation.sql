-- Moderation: blocking, reporting and suspensions.
--   blocks       a member hides another member (both ways) and cuts the connection.
--   reports      a member reports a post, comment or member. Admins review them.
--   suspensions  admins stop a member from posting, commenting and sending requests.

-- ------------------------------------------------------------- suspensions
create table public.suspensions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  reason text check (char_length(reason) <= 500),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.suspensions enable row level security;

create policy "admins and the member read suspensions"
  on public.suspensions for select
  to authenticated
  using (public.is_admin() or user_id = (select auth.uid()));

create policy "admins suspend"
  on public.suspensions for insert
  to authenticated
  with check (public.is_admin());

create policy "admins lift suspensions"
  on public.suspensions for delete
  to authenticated
  using (public.is_admin());

create or replace function public.is_suspended(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.suspensions where user_id = p_user);
$$;

revoke all on function public.is_suspended(uuid) from public, anon;
grant execute on function public.is_suspended(uuid) to authenticated;

-- ------------------------------------------------------------------ blocks
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy "blocker reads own blocks"
  on public.blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));

create policy "members block"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "blocker unblocks"
  on public.blocks for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

-- True when either person has blocked the other. The blocked person cannot read the
-- blocks table, so this runs as the owner.
create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

-- Blocking ends any connection or pending request between the two.
create or replace function public.cut_connection_on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.connections
  where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
     or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  return new;
end;
$$;

create trigger blocks_cut_connection
  after insert on public.blocks
  for each row execute function public.cut_connection_on_block();

-- ----------------------------------------------- apply blocks and suspensions
drop policy "members read profiles" on public.profiles;
create policy "members read profiles"
  on public.profiles for select
  to authenticated
  using (not public.is_blocked_between((select auth.uid()), id));

drop policy "members and admins read posts" on public.posts;
create policy "members and admins read posts"
  on public.posts for select
  to authenticated
  using (
    (public.is_admin() or public.is_community_member(city_slug, domain_slug))
    and not public.is_blocked_between((select auth.uid()), author_id)
  );

drop policy "members post in live communities, admins anywhere" on public.posts;
create policy "members post in live communities, admins anywhere"
  on public.posts for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and not public.is_suspended((select auth.uid()))
    and (
      public.is_admin()
      or (public.is_community_member(city_slug, domain_slug) and public.is_community_live(city_slug, domain_slug))
    )
  );

drop policy "readers of a post read its comments" on public.comments;
create policy "readers of a post read its comments"
  on public.comments for select
  to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id)
    and not public.is_blocked_between((select auth.uid()), author_id)
  );

drop policy "members comment in live communities, admins anywhere" on public.comments;
create policy "members comment in live communities, admins anywhere"
  on public.comments for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and not public.is_suspended((select auth.uid()))
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and (public.is_admin() or public.is_community_live(p.city_slug, p.domain_slug))
    )
  );

drop policy "members send requests" on public.connections;
create policy "members send requests"
  on public.connections for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and not public.is_suspended((select auth.uid()))
    and not public.is_blocked_between(requester_id, addressee_id)
  );

create or replace function public.suggested_people(p_limit integer default 10)
returns table (id uuid, full_name text, headline text, city_slug text, shared_communities integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.full_name, s.headline, s.city_slug, s.shared
  from (
    select
      p.id, p.full_name, p.headline, p.city_slug, p.created_at,
      (
        select count(*)::integer
        from public.community_memberships a
        join public.community_memberships b
          on a.city_slug = b.city_slug and a.domain_slug = b.domain_slug
        where a.user_id = p.id and b.user_id = (select auth.uid())
      ) as shared,
      (p.city_slug is not null
        and p.city_slug = (select me.city_slug from public.profiles me where me.id = (select auth.uid()))) as same_city
    from public.profiles p
    where p.id <> (select auth.uid())
      and not exists (
        select 1 from public.connections c
        where (c.requester_id = (select auth.uid()) and c.addressee_id = p.id)
           or (c.addressee_id = (select auth.uid()) and c.requester_id = p.id)
      )
      and not exists (
        select 1 from public.blocks bl
        where (bl.blocker_id = (select auth.uid()) and bl.blocked_id = p.id)
           or (bl.blocked_id = (select auth.uid()) and bl.blocker_id = p.id)
      )
  ) s
  where s.shared > 0 or s.same_city
  order by s.shared desc, s.same_city desc, s.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- ----------------------------------------------------------------- reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'member')),
  target_id uuid not null,
  target_author_id uuid references public.profiles (id) on delete set null,
  target_excerpt text,
  reason text not null check (reason in ('spam', 'harassment', 'scam', 'inappropriate', 'other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index reports_status_created_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

create policy "reporter and admins read reports"
  on public.reports for select
  to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());

-- A member can only report something they are allowed to see.
create policy "members report what they can see"
  on public.reports for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and (
      (target_type = 'post' and exists (select 1 from public.posts p where p.id = target_id))
      or (target_type = 'comment' and exists (select 1 from public.comments c where c.id = target_id))
      or (target_type = 'member' and exists (select 1 from public.profiles m where m.id = target_id))
    )
  );

create policy "admins update reports"
  on public.reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke update on public.reports from authenticated, anon;
grant update (status, resolved_by, resolved_at) on public.reports to authenticated;

-- Fills in who and what was reported (so the report survives if the content is
-- deleted), and stops self-reports and report spam.
create or replace function public.prepare_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.target_type = 'post' then
    select author_id, left(body, 200) into new.target_author_id, new.target_excerpt
    from public.posts where id = new.target_id;
  elsif new.target_type = 'comment' then
    select author_id, left(body, 200) into new.target_author_id, new.target_excerpt
    from public.comments where id = new.target_id;
  else
    select id, left(full_name, 200) into new.target_author_id, new.target_excerpt
    from public.profiles where id = new.target_id;
  end if;

  if new.target_author_id = new.reporter_id then
    raise exception 'You cannot report yourself.' using errcode = 'check_violation';
  end if;

  if (select count(*) from public.reports
      where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Report limit reached. Please try again tomorrow.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger reports_prepare
  before insert on public.reports
  for each row execute function public.prepare_report();

-- The blocker cannot read the profile of someone they blocked (it is hidden both ways),
-- so this lists who they blocked, to let them unblock.
create or replace function public.my_blocked_members()
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = (select auth.uid())
  order by b.created_at desc;
$$;

revoke all on function public.my_blocked_members() from public, anon;
grant execute on function public.my_blocked_members() to authenticated;
