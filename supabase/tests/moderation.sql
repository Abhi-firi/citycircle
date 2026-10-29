-- Security tests for blocking, reporting and suspensions. Rolled-back transaction.

do $$
declare
  a uuid := gen_random_uuid();   -- member who will be blocked / reported
  b uuid := gen_random_uuid();   -- member who blocks and reports
  c uuid := gen_random_uuid();   -- bystander member
  o uuid := gen_random_uuid();   -- outsider (not in the community)
  ad uuid := gen_random_uuid();  -- admin
  pa uuid;
  ca uuid;
  rid uuid;
  cid uuid;
  n bigint;
  denied boolean;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
    u::text || '@test.invalid', '', now(), '{}', '{}', now(), now(), '', '', '', ''
  from unnest(array[a, b, c, o, ad]) as u;

  insert into public.admins (user_id) values (ad);
  insert into public.community_memberships (user_id, city_slug, domain_slug)
    values (a, 'pune', 'coders'), (b, 'pune', 'coders'), (c, 'pune', 'coders');
  insert into public.community_status (city_slug, domain_slug, status) values ('pune', 'coders', 'live');

  ------------------------------------------------ A posts and comments
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.posts (city_slug, domain_slug, author_id, body) values ('pune', 'coders', a, 'buy now!!!') returning id into pa;
  insert into public.comments (post_id, author_id, body) values (pa, a, 'click my link') returning id into ca;

  ------------------------------------------------ B and C can see it
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.posts;
  if n <> 1 then raise exception 'FAIL: C should see the post (%)', n; end if;

  ------------------------------------------------ reporting
  perform set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
  denied := false;
  begin
    insert into public.reports (reporter_id, target_type, target_id, reason) values (o, 'post', pa, 'spam');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: outsider reported a post they cannot see'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  insert into public.reports (reporter_id, target_type, target_id, reason, details)
    values (b, 'post', pa, 'spam', 'selling stuff') returning id into rid;
  insert into public.reports (reporter_id, target_type, target_id, reason) values (b, 'comment', ca, 'spam');

  denied := false;
  begin
    insert into public.reports (reporter_id, target_type, target_id, reason) values (b, 'post', pa, 'scam');
  exception when unique_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: duplicate report accepted'; end if;

  denied := false;
  begin
    insert into public.reports (reporter_id, target_type, target_id, reason) values (c, 'member', a, 'spam');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: B reported on behalf of C'; end if;

  denied := false;
  begin
    insert into public.reports (reporter_id, target_type, target_id, reason) values (b, 'member', b, 'spam');
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: self report accepted'; end if;

  denied := false;
  begin
    insert into public.reports (reporter_id, target_type, target_id, reason) values (b, 'member', a, 'banana');
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: invalid reason accepted'; end if;

  -- excerpt and author were captured by the trigger
  select count(*) into n from public.reports where id = rid and target_author_id = a and target_excerpt = 'buy now!!!';
  if n <> 1 then raise exception 'FAIL: report did not capture author and excerpt'; end if;

  ------------------------------------------------ reports are private
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.reports;
  if n <> 0 then raise exception 'FAIL: bystander can read reports (%)', n; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  denied := false;
  begin
    update public.reports set status = 'dismissed' where id = rid;
  exception when insufficient_privilege then denied := true;
  end;
  -- Either a privilege error or zero rows is acceptable: the report must stay open.
  select count(*) into n from public.reports where id = rid and status = 'open';
  if n <> 1 then raise exception 'FAIL: reporter changed report status'; end if;

  ------------------------------------------------ admin reviews
  perform set_config('request.jwt.claims', json_build_object('sub', ad, 'role', 'authenticated')::text, true);
  select count(*) into n from public.reports;
  if n <> 2 then raise exception 'FAIL: admin should see all reports (%)', n; end if;
  update public.reports set status = 'resolved', resolved_by = ad, resolved_at = now() where id = rid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not resolve a report'; end if;

  ------------------------------------------------ suspension
  denied := false;
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
    insert into public.suspensions (user_id, reason) values (a, 'spam');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: member suspended someone'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', ad, 'role', 'authenticated')::text, true);
  insert into public.suspensions (user_id, reason, created_by) values (a, 'spam', ad);

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.suspensions;
  if n <> 1 then raise exception 'FAIL: member cannot see own suspension (%)', n; end if;

  denied := false;
  begin
    insert into public.posts (city_slug, domain_slug, author_id, body) values ('pune', 'coders', a, 'still here');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: suspended member posted'; end if;

  denied := false;
  begin
    insert into public.comments (post_id, author_id, body) values (pa, a, 'still commenting');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: suspended member commented'; end if;

  denied := false;
  begin
    insert into public.connections (requester_id, addressee_id) values (a, c);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: suspended member sent a request'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', ad, 'role', 'authenticated')::text, true);
  delete from public.suspensions where user_id = a;

  ------------------------------------------------ blocking
  -- B and A are connected first, then B blocks A.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  insert into public.connections (requester_id, addressee_id) values (b, a) returning id into cid;

  denied := false;
  begin
    insert into public.blocks (blocker_id, blocked_id) values (a, c);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: B blocked on behalf of A'; end if;

  insert into public.blocks (blocker_id, blocked_id) values (b, a);

  select count(*) into n from public.connections;
  if n <> 0 then raise exception 'FAIL: blocking did not cut the connection (%)', n; end if;

  select count(*) into n from public.posts where author_id = a;
  if n <> 0 then raise exception 'FAIL: blocker still sees blocked member''s posts'; end if;
  select count(*) into n from public.comments where author_id = a;
  if n <> 0 then raise exception 'FAIL: blocker still sees blocked member''s comments'; end if;
  select count(*) into n from public.profiles where id = a;
  if n <> 0 then raise exception 'FAIL: blocker still sees blocked member''s profile'; end if;
  select count(*) into n from public.suggested_people(50) where id = a;
  if n <> 0 then raise exception 'FAIL: blocked member suggested'; end if;

  select count(*) into n from public.my_blocked_members() where id = a;
  if n <> 1 then raise exception 'FAIL: blocker cannot list blocked member (%)', n; end if;

  denied := false;
  begin
    insert into public.connections (requester_id, addressee_id) values (b, a);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: request sent to a blocked member'; end if;

  -- The blocked member cannot see B's side either, nor read the blocks table.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.blocks;
  if n <> 0 then raise exception 'FAIL: blocked member can see blocks (%)', n; end if;
  select count(*) into n from public.my_blocked_members();
  if n <> 0 then raise exception 'FAIL: blocked member sees a block list (%)', n; end if;
  select count(*) into n from public.profiles where id = b;
  if n <> 0 then raise exception 'FAIL: blocked member still sees blocker''s profile'; end if;

  denied := false;
  begin
    insert into public.connections (requester_id, addressee_id) values (a, b);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: blocked member could send a request to the blocker'; end if;

  -- C is unaffected.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.posts where author_id = a;
  if n <> 1 then raise exception 'FAIL: bystander lost sight of the post (%)', n; end if;

  -- Unblock restores visibility.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  delete from public.blocks where blocker_id = b and blocked_id = a;
  select count(*) into n from public.posts where author_id = a;
  if n <> 1 then raise exception 'FAIL: unblock did not restore posts (%)', n; end if;

  raise notice 'moderation tests passed';
end
$$;
