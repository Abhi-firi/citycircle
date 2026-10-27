-- Community waitlist / membership.
-- A member can only see and change their OWN rows. Anyone can see aggregate
-- counts per community through a function that returns numbers only.

create table public.community_memberships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  city_slug text not null check (
    city_slug in ('delhi','noida','gurugram','mumbai','pune','bangalore','hyderabad','chennai')
  ),
  domain_slug text not null check (
    domain_slug in (
      'angel-investors','vc','startup-founders','coders','product-managers',
      'recruiters-hr','sales-business-development','creators-influencers',
      'residential-real-estate-builders','commercial-real-estate-builders'
    )
  ),
  created_at timestamptz not null default now(),
  primary key (user_id, city_slug, domain_slug)
);

create index community_memberships_community_idx
  on public.community_memberships (city_slug, domain_slug);

alter table public.community_memberships enable row level security;

create policy "members read their own memberships"
  on public.community_memberships for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "members join as themselves"
  on public.community_memberships for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "members leave their own memberships"
  on public.community_memberships for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Per-member cap. A trigger (not a policy) so a bulk insert cannot bypass it.
create or replace function public.enforce_membership_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.community_memberships m where m.user_id = new.user_id) >= 20 then
    raise exception 'Membership limit reached (20 communities)' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger community_memberships_cap
  before insert on public.community_memberships
  for each row execute function public.enforce_membership_cap();

-- Public counts only. No user ids are exposed.
create or replace function public.community_member_counts()
returns table (city_slug text, domain_slug text, member_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select m.city_slug, m.domain_slug, count(*)
  from public.community_memberships m
  group by m.city_slug, m.domain_slug
$$;

revoke all on function public.community_member_counts() from public;
grant execute on function public.community_member_counts() to anon, authenticated;
