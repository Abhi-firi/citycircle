-- Security tests for connections and profile visibility. Rolled-back transaction.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  cid uuid;
  n bigint;
  denied boolean;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
    u::text || '@test.invalid', '', now(), '{}', '{}', now(), now(), '', '', '', ''
  from unnest(array[a, b, c]) as u;

  update public.profiles set city_slug = 'delhi' where id in (a, b, c);
  insert into public.community_memberships (user_id, city_slug, domain_slug) values (a, 'pune', 'vc'), (b, 'pune', 'vc');

  ------------------------------------------------ anonymous cannot read profiles
  set local role anon;
  select count(*) into n from public.profiles;
  if n <> 0 then raise exception 'FAIL: anon can read profiles (%)', n; end if;

  ------------------------------------------------ A sends a request to B
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.profiles;
  if n < 3 then raise exception 'FAIL: member cannot read profiles (%)', n; end if;

  insert into public.connections (requester_id, addressee_id) values (a, b) returning id into cid;

  denied := false;
  begin
    insert into public.connections (requester_id, addressee_id) values (b, a);
  exception when unique_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: reverse duplicate request allowed'; end if;

  denied := false;
  begin
    insert into public.connections (requester_id, addressee_id) values (a, a);
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: self connection allowed'; end if;

  denied := false;
  begin
    insert into public.connections (requester_id, addressee_id) values (b, c);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: A sent a request on behalf of B'; end if;

  denied := false;
  begin
    insert into public.connections (requester_id, addressee_id, status) values (a, c, 'accepted');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: request created already accepted'; end if;

  -- The requester cannot accept their own request.
  update public.connections set status = 'accepted' where id = cid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: requester accepted own request'; end if;

  ------------------------------------------------ outsider C sees nothing
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.connections;
  if n <> 0 then raise exception 'FAIL: outsider can see connections (%)', n; end if;

  delete from public.connections where id = cid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: outsider deleted a connection'; end if;

  ------------------------------------------------ B accepts
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  denied := false;
  begin
    update public.connections set requester_id = c where id = cid;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: B could rewrite who is connected'; end if;

  update public.connections set status = 'accepted' where id = cid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: addressee could not accept'; end if;

  ------------------------------------------------ suggestions
  select count(*) into n from public.suggested_people(10) where id = a;
  if n <> 0 then raise exception 'FAIL: connected person suggested'; end if;
  select count(*) into n from public.suggested_people(10) where id = c;
  if n <> 1 then raise exception 'FAIL: same-city member not suggested'; end if;
  select count(*) into n from public.suggested_people(10) where id = b;
  if n <> 0 then raise exception 'FAIL: user suggested to themselves'; end if;

  set local role anon;
  denied := false;
  begin
    perform * from public.suggested_people(5);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: anon could call suggested_people'; end if;

  ------------------------------------------------ either side can remove
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  delete from public.connections where id = cid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: party could not remove the connection'; end if;

  raise notice 'connections tests passed';
end
$$;
