-- Likes and editing for posts.
-- Rules:
--   * Only the author can edit a post, and only its text (body). The database stamps edited_at.
--     Authors must still be a member of the community and not suspended. Admins can delete
--     (already allowed) but not rewrite someone else's words.
--   * Anyone who can read a post can like it, once. Likes are removable only by their owner.
--   * A light rate limit (120 likes per hour per person) stops scripted spam.

alter table public.posts add column edited_at timestamptz;

revoke update on public.posts from authenticated, anon;
grant update (body) on public.posts to authenticated;

create policy "authors edit their own posts"
  on public.posts for update
  to authenticated
  using (
    author_id = (select auth.uid())
    and not public.is_suspended((select auth.uid()))
    and public.is_community_member(city_slug, domain_slug)
  )
  with check (
    author_id = (select auth.uid())
    and not public.is_suspended((select auth.uid()))
    and public.is_community_member(city_slug, domain_slug)
  );

create or replace function public.stamp_post_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger posts_stamp_edit
  before update on public.posts
  for each row execute function public.stamp_post_edit();

-- ------------------------------------------------------------------ likes
create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_user_idx on public.post_likes (user_id, created_at desc);

alter table public.post_likes enable row level security;

revoke all on public.post_likes from anon, authenticated;
grant select, insert, delete on public.post_likes to authenticated;

-- The sub-selects on posts are filtered by the posts read policy.
create policy "readers of a post read its likes"
  on public.post_likes for select
  to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "readers of a post can like it"
  on public.post_likes for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.is_suspended((select auth.uid()))
    and exists (select 1 from public.posts p where p.id = post_id)
  );

create policy "people remove their own likes"
  on public.post_likes for delete
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.enforce_like_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.post_likes
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 120 then
    raise exception 'Like limit reached. Please try again later.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger post_likes_rate_limit
  before insert on public.post_likes
  for each row execute function public.enforce_like_rate_limit();
