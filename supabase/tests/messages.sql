-- Security tests for chat. Rolled-back transaction.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  ad uuid := gen_random_uuid();
  conv uuid;
  mid uuid;
  cid uuid;
  n bigint;
  denied boolean;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
    u::text || '@test.invalid', '', now(), '{}', '{}', now(), now(), '', '', '', ''
  from unnest(array[a, b, c, ad]) as u;

  insert into public.admins (user_id) values (ad);
  insert into public.connections (requester_id, addressee_id, status) values (a, b, 'accepted') returning id into cid;

  ------------------------------------------------ cannot start with a non-connection
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  denied := false;
  begin
    perform public.start_conversation(c);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: started a conversation with a stranger'; end if;

  denied := false;
  begin
    perform public.start_conversation(a);
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: started a conversation with self'; end if;

  denied := false;
  begin
    insert into public.conversations (user_a, user_b) values (least(a, c), greatest(a, c));
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: inserted a conversation directly'; end if;

  ------------------------------------------------ connected pair
  conv := public.start_conversation(b);
  if conv is null or conv <> public.start_conversation(b) then raise exception 'FAIL: conversation not reused'; end if;

  insert into public.messages (conversation_id, sender_id, body) values (conv, a, 'hello b') returning id into mid;

  denied := false;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, b, 'spoofed');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: A sent a message as B'; end if;

  denied := false;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, a, '   ');
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: blank message accepted'; end if;

  -- Sender cannot mark own message read.
  update public.messages set read_at = now() where id = mid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: sender marked own message as read'; end if;

  ------------------------------------------------ outsider C
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.messages;
  if n <> 0 then raise exception 'FAIL: outsider reads messages (%)', n; end if;
  select count(*) into n from public.conversations;
  if n <> 0 then raise exception 'FAIL: outsider reads conversations (%)', n; end if;

  denied := false;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, c, 'intruding');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: outsider sent into a conversation'; end if;

  ------------------------------------------------ recipient B
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.my_conversations() where unread = 1;
  if n <> 1 then raise exception 'FAIL: B should have 1 unread conversation (%)', n; end if;
  if public.unread_message_count() <> 1 then raise exception 'FAIL: unread count wrong'; end if;

  denied := false;
  begin
    update public.messages set body = 'edited' where id = mid;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: message body edited'; end if;

  update public.messages set read_at = now() where id = mid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: recipient could not mark read'; end if;
  if public.unread_message_count() <> 0 then raise exception 'FAIL: unread not cleared'; end if;

  insert into public.messages (conversation_id, sender_id, body) values (conv, b, 'hi a');

  ------------------------------------------------ rate limit
  for i in 1..29 loop
    insert into public.messages (conversation_id, sender_id, body) values (conv, b, 'm ' || i);
  end loop;
  denied := false;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, b, 'too many');
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: message rate limit not enforced'; end if;

  ------------------------------------------------ suspended member cannot send
  reset role;
  insert into public.suspensions (user_id) values (a);
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  denied := false;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, a, 'while suspended');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: suspended member sent a message'; end if;
  reset role;
  delete from public.suspensions where user_id = a;
  set local role authenticated;

  ------------------------------------------------ removed connection: readable, not writable
  reset role;
  delete from public.connections where id = cid;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.messages;
  if n < 1 then raise exception 'FAIL: history vanished after disconnect'; end if;
  denied := false;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, a, 'after disconnect');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: sent a message without a connection'; end if;

  ------------------------------------------------ blocking hides the conversation
  reset role;
  insert into public.connections (requester_id, addressee_id, status) values (a, b, 'accepted');
  insert into public.blocks (blocker_id, blocked_id) values (b, a);
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.messages;
  if n <> 0 then raise exception 'FAIL: blocked member still reads messages (%)', n; end if;
  select count(*) into n from public.my_conversations();
  if n <> 0 then raise exception 'FAIL: blocked conversation still listed (%)', n; end if;

  ------------------------------------------------ anonymous
  set local role anon;
  denied := false;
  begin
    perform count(*) from public.messages;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: anon could query messages'; end if;

  raise notice 'messages tests passed';
end
$$;
