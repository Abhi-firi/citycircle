-- Posts and comments inside communities.
-- Rules:
--   * Only members of a community (or admins) can read its posts and comments.
--   * Members can post and comment only while the community is live. Admins can always
--     post, which lets the team seed a community before it opens.
--   * Authors and admins can delete. There is no editing yet.
--   * Simple rate limits stop spam: 10 posts and 30 comments per hour per person.

create or replace function public.is_community_member(p_city text, p_domain text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_memberships m
    where m.user_id = (select auth.uid()) and m.city_slug = p_city and m.domain_slug = p_domain
  );
$$;

create or replace function public.is_community_live(p_city text, p_domain text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_status s
    where s.city_slug = p_city and s.domain_slug = p_domain and s.status = 'live'
  );
$$;

revoke all on function public.is_community_member(text, text) from public, anon;
revoke all on function public.is_community_live(text, text) from public, anon;
grant execute on function public.is_community_member(text, text) to authenticated;
grant execute on function public.is_community_live(text, text) to authenticated;

-- ------------------------------------------------------------------- posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null check (
    city_slug in ('delhi','noida','gurugram','mumbai','pune','bangalore','hyderabad','chennai')
  ),
  domain_slug text not null check (
    domain_slug in ('angel-investors','vc','startup-founders','coders','product-managers',
                    'recruiters-hr','sales-business-development','creators-influencers',
                    'residential-real-estate-builders','commercial-real-estate-builders')
  ),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 3000),
  created_at timestamptz not null default now()
);

create index posts_community_created_idx on public.posts (city_slug, domain_slug, created_at desc);
create index posts_author_created_idx on public.posts (author_id, created_at desc);

alter table public.posts enable row level security;

create policy "members and admins read posts"
  on public.posts for select
  to authenticated
  using (public.is_admin() or public.is_community_member(city_slug, domain_slug));

create policy "members post in live communities, admins anywhere"
  on public.posts for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      public.is_admin()
      or (public.is_community_member(city_slug, domain_slug) and public.is_community_live(city_slug, domain_slug))
    )
  );

create policy "authors and admins delete posts"
  on public.posts for delete
  to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------- comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index comments_post_created_idx on public.comments (post_id, created_at);
create index comments_author_created_idx on public.comments (author_id, created_at desc);

alter table public.comments enable row level security;

-- The sub-select on posts is itself filtered by the posts read policy.
create policy "readers of a post read its comments"
  on public.comments for select
  to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "members comment in live communities, admins anywhere"
  on public.comments for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and (public.is_admin() or public.is_community_live(p.city_slug, p.domain_slug))
    )
  );

create policy "authors and admins delete comments"
  on public.comments for delete
  to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

-- ------------------------------------------------------------- rate limits
create or replace function public.enforce_post_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.posts
      where author_id = new.author_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Post limit reached. Please try again later.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger posts_rate_limit
  before insert on public.posts
  for each row execute function public.enforce_post_rate_limit();

create or replace function public.enforce_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.comments
      where author_id = new.author_id and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Comment limit reached. Please try again later.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger comments_rate_limit
  before insert on public.comments
  for each row execute function public.enforce_comment_rate_limit();
