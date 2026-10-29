-- In-app notifications, created only by database triggers (never by the app).
--   connection_request   someone sent you a connection request
--   connection_accepted  someone accepted your request
--   comment              someone commented on your post
--   community_live       a community you joined opened
-- A member can read, mark as read and delete their own notifications only.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('connection_request', 'connection_accepted', 'comment', 'community_live')),
  actor_id uuid references public.profiles (id) on delete cascade,
  city_slug text,
  domain_slug text,
  post_id uuid references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "owner reads notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "owner marks notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "owner deletes notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- No insert policy: only the triggers below (security definer) can create rows.
revoke insert on public.notifications from authenticated, anon;
revoke update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

-- ------------------------------------------------------------ triggers
create or replace function public.notify_connection_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, actor_id)
    values (new.addressee_id, 'connection_request', new.requester_id);
  elsif old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications (user_id, type, actor_id)
    values (new.requester_id, 'connection_accepted', new.addressee_id);
  end if;
  return new;
end;
$$;

create trigger connections_notify
  after insert or update on public.connections
  for each row execute function public.notify_connection_change();

create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
begin
  select author_id, city_slug, domain_slug into p from public.posts where id = new.post_id;
  if found and p.author_id <> new.author_id then
    insert into public.notifications (user_id, type, actor_id, city_slug, domain_slug, post_id)
    values (p.author_id, 'comment', new.author_id, p.city_slug, p.domain_slug, new.post_id);
  end if;
  return new;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_comment();

create or replace function public.notify_community_live()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'live' and (tg_op = 'INSERT' or old.status is distinct from 'live') then
    insert into public.notifications (user_id, type, city_slug, domain_slug)
    select m.user_id, 'community_live', new.city_slug, new.domain_slug
    from public.community_memberships m
    where m.city_slug = new.city_slug and m.domain_slug = new.domain_slug;
  end if;
  return new;
end;
$$;

create trigger community_status_notify
  after insert or update on public.community_status
  for each row execute function public.notify_community_live();
