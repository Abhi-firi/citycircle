-- Photos: profile pictures and post images.
--   avatars      public bucket, files in "<user id>/<random name>". Names are random, so the
--                links cannot be guessed, but anyone holding a link can open it.
--   post-images  private bucket, files in "<city>/<domain>/<user id>/<random name>".
--                Only members of that community (and admins) can read them, through
--                short-lived signed links. Members can upload while the community is live.
-- Images are resized in the browser before upload; buckets also enforce size and type.

alter table public.profiles add column avatar_path text check (char_length(avatar_path) <= 300);

alter table public.posts add column image_path text;
alter table public.posts add constraint posts_image_path_check check (
  image_path is null
  or (char_length(image_path) <= 300
      and image_path like city_slug || '/' || domain_slug || '/' || author_id::text || '/%')
);

-- --------------------------------------------------------------- buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-images', 'post-images', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------ avatar policies
create policy "members upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not public.is_suspended((select auth.uid()))
  );

create policy "members replace their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "members delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ------------------------------------------------------- post image policies
create policy "community members read post images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'post-images'
    and (
      public.is_admin()
      or public.is_community_member((storage.foldername(name))[1], (storage.foldername(name))[2])
    )
  );

create policy "members upload post images to live communities"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[3] = (select auth.uid())::text
    and not public.is_suspended((select auth.uid()))
    and (
      public.is_admin()
      or (
        public.is_community_member((storage.foldername(name))[1], (storage.foldername(name))[2])
        and public.is_community_live((storage.foldername(name))[1], (storage.foldername(name))[2])
      )
    )
  );

create policy "authors and admins delete post images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and ((storage.foldername(name))[3] = (select auth.uid())::text or public.is_admin())
  );

-- ---------------------------------------- functions that now return avatars
drop function public.suggested_people(integer);
create function public.suggested_people(p_limit integer default 10)
returns table (id uuid, full_name text, headline text, city_slug text, shared_communities integer, avatar_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.full_name, s.headline, s.city_slug, s.shared, s.avatar_path
  from (
    select
      p.id, p.full_name, p.headline, p.city_slug, p.created_at, p.avatar_path,
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

revoke all on function public.suggested_people(integer) from public, anon;
grant execute on function public.suggested_people(integer) to authenticated;

drop function public.my_conversations();
create function public.my_conversations()
returns table (
  conversation_id uuid,
  other_id uuid,
  other_name text,
  other_headline text,
  last_body text,
  last_at timestamptz,
  unread integer,
  other_avatar text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    o.id,
    o.full_name,
    o.headline,
    (select m.body from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1),
    coalesce((select max(m.created_at) from public.messages m where m.conversation_id = c.id), c.created_at),
    (select count(*)::integer from public.messages m
      where m.conversation_id = c.id and m.sender_id <> (select auth.uid()) and m.read_at is null),
    o.avatar_path
  from public.conversations c
  join public.profiles o on o.id = case when c.user_a = (select auth.uid()) then c.user_b else c.user_a end
  where (select auth.uid()) in (c.user_a, c.user_b)
    and not public.is_blocked_between(c.user_a, c.user_b)
  order by 6 desc
  limit 100;
$$;

revoke all on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;
