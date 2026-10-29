-- Security and trigger tests for notifications. Rolled-back transaction.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  cid uuid;
  pid uuid;
  nid uuid;
  n bigint;
  denied boolean;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
    u::text || '@test.invalid', '', now(), '{}', '{}', now(), now(), '', '', '', ''
  from unnest(array[a, b, c]) as u;

  insert into public.community_memberships (user_id, city_slug, domain_slug)
    values (a, 'pune', 'coders'), (b, 'pune', 'coders');

  ------------------------------------------------ A requests B -> B notified
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.connections (requester_id, addressee_id) values (a, b) returning id into cid;

  select count(*) into n from public.notifications;
  if n <> 0 then raise exception 'FAIL: requester saw a notification meant for B (%)', n; end if;

  denied := false;
  begin
    insert into public.notifications (user_id, type) values (a, 'comment');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: member inserted a notification'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select id into nid from public.notifications where type = 'connection_request' and actor_id = a;
  if nid is null then raise exception 'FAIL: B was not notified of the request'; end if;

  ------------------------------------------------ outsider cannot read or change it
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.notifications;
  if n <> 0 then raise exception 'FAIL: outsider can read notifications (%)', n; end if;
  update public.notifications set read_at = now() where id = nid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: outsider marked a notification read'; end if;
  delete from public.notifications where id = nid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: outsider deleted a notification'; end if;

  ------------------------------------------------ B marks read, cannot edit other columns
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  denied := false;
  begin
    update public.notifications set user_id = c where id = nid;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: B redirected a notification'; end if;

  update public.notifications set read_at = now() where id = nid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: owner could not mark read'; end if;

  -- B accepts -> A notified
  update public.connections set status = 'accepted' where id = cid;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.notifications where type = 'connection_accepted' and actor_id = b;
  if n <> 1 then raise exception 'FAIL: A was not notified of acceptance (%)', n; end if;

  ------------------------------------------------ comment on A's post by B -> A notified; self-comment no
  reset role;
  insert into public.community_status (city_slug, domain_slug, status) values ('pune', 'coders', 'waitlist');
  set local role authenticated;
  -- admin-free path: make the community live as owner, then post and comment as members
  reset role;
  update public.community_status set status = 'live' where city_slug = 'pune' and domain_slug = 'coders';
  select count(*) into n from public.notifications where type = 'community_live' and user_id in (a, b);
  if n <> 2 then raise exception 'FAIL: members not notified that community is live (%)', n; end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.posts (city_slug, domain_slug, author_id, body) values ('pune', 'coders', a, 'hello') returning id into pid;
  insert into public.comments (post_id, author_id, body) values (pid, a, 'my own comment');
  select count(*) into n from public.notifications where type = 'comment';
  if n <> 0 then raise exception 'FAIL: self-comment created a notification'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  insert into public.comments (post_id, author_id, body) values (pid, b, 'nice');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.notifications where type = 'comment' and actor_id = b and post_id = pid;
  if n <> 1 then raise exception 'FAIL: author not notified of comment (%)', n; end if;

  ------------------------------------------------ anonymous sees nothing
  set local role anon;
  denied := false;
  begin
    perform count(*) from public.notifications;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: anon could query notifications'; end if;

  raise notice 'notifications tests passed';
end
$$;
