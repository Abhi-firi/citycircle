-- Phase 2: profiles split by visibility.
--   profiles          public (anyone can read)
--   profile_details   members only (logged-in users can read)
--   profile_recruiter owner only for now (opt-in recruiter data: open to work,
--                     notice period, expected CTC). Recruiter access comes later
--                     with the paid plan and an audited function.
-- Row Level Security is on for every table. No policy means no access.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 100),
  headline text check (char_length(headline) <= 160),
  about text check (char_length(about) <= 2000),
  city_slug text check (
    city_slug in ('delhi','noida','gurugram','mumbai','pune','bangalore','hyderabad','chennai')
  ),
  domain_slugs text[] not null default '{}' check (cardinality(domain_slugs) <= 10),
  current_role_title text check (char_length(current_role_title) <= 100),
  current_company text check (char_length(current_company) <= 100),
  skills text[] not null default '{}' check (cardinality(skills) <= 30),
  linkedin_url text check (char_length(linkedin_url) <= 300),
  website_url text check (char_length(website_url) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "users insert their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------- profile_details
create table public.profile_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  experience_years smallint check (experience_years between 0 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_details enable row level security;

create policy "members can read details"
  on public.profile_details for select
  to authenticated
  using (true);

create policy "users insert their own details"
  on public.profile_details for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users update their own details"
  on public.profile_details for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger profile_details_set_updated_at
  before update on public.profile_details
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------- profile_recruiter
create table public.profile_recruiter (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  open_to_work boolean not null default false,
  notice_period_days smallint check (notice_period_days in (0, 15, 30, 60, 90)),
  expected_ctc_min_lpa numeric(6,2) check (expected_ctc_min_lpa >= 0),
  expected_ctc_max_lpa numeric(6,2) check (expected_ctc_max_lpa >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expected_ctc_max_lpa is null or expected_ctc_min_lpa is null
         or expected_ctc_max_lpa >= expected_ctc_min_lpa)
);

alter table public.profile_recruiter enable row level security;

create policy "owner reads recruiter data"
  on public.profile_recruiter for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "owner inserts recruiter data"
  on public.profile_recruiter for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "owner updates recruiter data"
  on public.profile_recruiter for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "owner deletes recruiter data"
  on public.profile_recruiter for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger profile_recruiter_set_updated_at
  before update on public.profile_recruiter
  for each row execute function public.set_updated_at();

-- ------------------------------------------------- profile on sign-up trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
               split_part(new.email, '@', 1),
               'Member'),
      100
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
