-- Admin role and community status.
--   admins            who may run the admin panel. No insert/update/delete policy,
--                     so rows are added only by the grant-admin workflow (direct DB access).
--   community_status  whether a community is still a waitlist or live. Everyone can read,
--                     only admins can change.

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "admins can see their own row"
  on public.admins for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table public.community_status (
  city_slug text not null check (
    city_slug in ('delhi','noida','gurugram','mumbai','pune','bangalore','hyderabad','chennai')
  ),
  domain_slug text not null check (
    domain_slug in ('angel-investors','vc','startup-founders','coders','product-managers',
                    'recruiters-hr','sales-business-development','creators-influencers',
                    'residential-real-estate-builders','commercial-real-estate-builders')
  ),
  status text not null default 'waitlist' check (status in ('waitlist', 'live')),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (city_slug, domain_slug)
);

alter table public.community_status enable row level security;

create policy "community status is public"
  on public.community_status for select
  to anon, authenticated
  using (true);

create policy "admins insert community status"
  on public.community_status for insert
  to authenticated
  with check (public.is_admin());

create policy "admins update community status"
  on public.community_status for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins delete community status"
  on public.community_status for delete
  to authenticated
  using (public.is_admin());

create trigger community_status_set_updated_at
  before update on public.community_status
  for each row execute function public.set_updated_at();
