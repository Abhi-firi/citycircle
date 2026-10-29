-- One-to-one text chat between connected members.
--   * A conversation can only be started (by start_conversation) between two people who
--     are connected, not blocked and not suspended.
--   * Only the two people can read it. Blocking hides it. Removing the connection keeps
--     the history readable but stops new messages.
--   * Only the recipient can mark a message as read. 30 messages per minute per sender.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create index conversations_user_b_idx on public.conversations (user_b);

alter table public.conversations enable row level security;

create policy "parties read their conversations"
  on public.conversations for select
  to authenticated
  using (
    (select auth.uid()) in (user_a, user_b)
    and not public.is_blocked_between(user_a, user_b)
  );

-- No insert, update or delete policies: conversations are created by start_conversation().
revoke insert, update, delete on public.conversations from authenticated, anon;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
create index messages_unread_idx on public.messages (conversation_id) where read_at is null;
create index messages_sender_created_idx on public.messages (sender_id, created_at desc);

alter table public.messages enable row level security;

create policy "parties read messages"
  on public.messages for select
  to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id));

-- Can the signed-in member send in this conversation right now?
create or replace function public.can_send_in(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    join public.connections k
      on k.status = 'accepted'
     and ((k.requester_id = c.user_a and k.addressee_id = c.user_b)
       or (k.requester_id = c.user_b and k.addressee_id = c.user_a))
    where c.id = p_conversation
      and (select auth.uid()) in (c.user_a, c.user_b)
      and not public.is_blocked_between(c.user_a, c.user_b)
      and not public.is_suspended((select auth.uid()))
  );
$$;

revoke all on function public.can_send_in(uuid) from public, anon;
grant execute on function public.can_send_in(uuid) to authenticated;

create policy "parties send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and read_at is null
    and public.can_send_in(conversation_id)
  );

create policy "recipient marks messages read"
  on public.messages for update
  to authenticated
  using (
    sender_id <> (select auth.uid())
    and exists (select 1 from public.conversations c where c.id = conversation_id)
  )
  with check (sender_id <> (select auth.uid()));

revoke update on public.messages from authenticated, anon;
grant update (read_at) on public.messages to authenticated;
-- No delete policy: messages stay.

create or replace function public.enforce_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'You are sending messages too fast.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.enforce_message_rate_limit();

-- Start (or find) the conversation with a connected member.
create or replace function public.start_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  a uuid;
  b uuid;
  cid uuid;
begin
  if me is null or p_other is null or p_other = me then
    raise exception 'Invalid conversation.' using errcode = 'check_violation';
  end if;
  if public.is_suspended(me) or public.is_blocked_between(me, p_other) then
    raise exception 'You cannot message this member.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.connections k
    where k.status = 'accepted'
      and ((k.requester_id = me and k.addressee_id = p_other) or (k.requester_id = p_other and k.addressee_id = me))
  ) then
    raise exception 'You can only message your connections.' using errcode = 'insufficient_privilege';
  end if;

  a := least(me, p_other);
  b := greatest(me, p_other);
  insert into public.conversations (user_a, user_b) values (a, b) on conflict (user_a, user_b) do nothing;
  select id into cid from public.conversations where user_a = a and user_b = b;
  return cid;
end;
$$;

revoke all on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

-- Inbox: one row per conversation with the other person, last message and unread count.
create or replace function public.my_conversations()
returns table (
  conversation_id uuid,
  other_id uuid,
  other_name text,
  other_headline text,
  last_body text,
  last_at timestamptz,
  unread integer
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
      where m.conversation_id = c.id and m.sender_id <> (select auth.uid()) and m.read_at is null)
  from public.conversations c
  join public.profiles o on o.id = case when c.user_a = (select auth.uid()) then c.user_b else c.user_a end
  where (select auth.uid()) in (c.user_a, c.user_b)
    and not public.is_blocked_between(c.user_a, c.user_b)
  order by 6 desc
  limit 100;
$$;

revoke all on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

-- Total unread messages, for the badge in the header.
create or replace function public.unread_message_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where (select auth.uid()) in (c.user_a, c.user_b)
    and m.sender_id <> (select auth.uid())
    and m.read_at is null
    and not public.is_blocked_between(c.user_a, c.user_b);
$$;

revoke all on function public.unread_message_count() from public, anon;
grant execute on function public.unread_message_count() to authenticated;
