-- Connections between members (My Network), and member-only profile visibility.
--   * Profiles are readable by logged-in members only (not by anonymous visitors).
--   * A connection starts as a request from one member to another and becomes
--     "accepted" only when the other member accepts. Only the two people involved
--     can see it, and either of them can remove it.
--   * suggested_people() lists members who share a city or a community with you.

drop policy if exists "profiles are public" on public.profiles;

create policy "members read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- One connection per pair, whichever direction it was requested in.
create unique index connections_pair_idx
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index connections_addressee_idx on public.connections (addressee_id, status);
create index connections_requester_idx on public.connections (requester_id, status);

alter table public.connections enable row level security;

create policy "parties read their connections"
  on public.connections for select
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "members send requests"
  on public.connections for insert
  to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');

create policy "addressee accepts a request"
  on public.connections for update
  to authenticated
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (addressee_id = (select auth.uid()) and status = 'accepted');

create policy "parties remove a connection"
  on public.connections for delete
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Only the status can be changed, never who is connected to whom.
revoke update on public.connections from authenticated, anon;
grant update (status) on public.connections to authenticated;

create trigger connections_set_updated_at
  before update on public.connections
  for each row execute function public.set_updated_at();

-- At most 50 new requests per person per day.
create or replace function public.enforce_connection_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.connections
      where requester_id = new.requester_id and created_at > now() - interval '1 day') >= 50 then
    raise exception 'Request limit reached. Please try again tomorrow.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger connections_rate_limit
  before insert on public.connections
  for each row execute function public.enforce_connection_rate_limit();

-- ------------------------------------------------------------ suggestions
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
  ) s
  where s.shared > 0 or s.same_city
  order by s.shared desc, s.same_city desc, s.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke all on function public.suggested_people(integer) from public, anon;
grant execute on function public.suggested_people(integer) to authenticated;
