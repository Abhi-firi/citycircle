-- Security tests for posts and comments. Run in a rolled-back transaction.

do $$
declare
  m uuid := gen_random_uuid();   -- member of delhi/vc
  o uuid := gen_random_uuid();   -- outsider (not a member)
  ad uuid := gen_random_uuid();  -- admin
  p1 uuid;
  p2 uuid;
  n bigint;
  denied boolean;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
    u::text || '@test.invalid', '', now(), '{}', '{}', now(), now(), '', '', '', ''
  from unnest(array[m, o, ad]) as u;

  insert into public.admins (user_id) values (ad);
  insert into public.community_memberships (user_id, city_slug, domain_slug) values (m, 'delhi', 'vc');
  insert into public.community_memberships (user_id, city_slug, domain_slug) values (m, 'delhi', 'coders');

  ------------------------------------------------ waitlist community: no member posts
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  set local role authenticated;

  denied := false;
  begin
    insert into public.posts (city_slug, domain_slug, author_id, body) values ('delhi', 'vc', m, 'too early');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: member posted in a community that is not live'; end if;

  ------------------------------------------------ admin seeds a post while still waitlist
  perform set_config('request.jwt.claims', json_build_object('sub', ad, 'role', 'authenticated')::text, true);
  insert into public.posts (city_slug, domain_slug, author_id, body)
    values ('delhi', 'vc', ad, 'Welcome to VC Delhi') returning id into p1;

  ------------------------------------------------ open delhi/vc (owner role)
  reset role;
  insert into public.community_status (city_slug, domain_slug, status) values ('delhi', 'vc', 'live');

  ------------------------------------------------ member
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.posts;
  if n <> 1 then raise exception 'FAIL: member should see the community post (saw %)', n; end if;

  insert into public.posts (city_slug, domain_slug, author_id, body)
    values ('delhi', 'vc', m, 'Hello everyone') returning id into p2;

  denied := false;
  begin
    insert into public.posts (city_slug, domain_slug, author_id, body) values ('delhi', 'vc', ad, 'as admin');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: member posted as someone else'; end if;

  denied := false;
  begin
    insert into public.posts (city_slug, domain_slug, author_id, body) values ('delhi', 'coders', m, 'not live');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: member posted in a different, non-live community'; end if;

  denied := false;
  begin
    insert into public.posts (city_slug, domain_slug, author_id, body) values ('delhi', 'vc', m, '   ');
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: blank post accepted'; end if;

  insert into public.comments (post_id, author_id, body) values (p1, m, 'Glad to be here');

  denied := false;
  begin
    delete from public.posts where id = p1;
    get diagnostics n = row_count;
    if n = 0 then denied := true; end if;
  end;
  if not denied then raise exception 'FAIL: member deleted someone else''s post'; end if;

  ------------------------------------------------ outsider sees nothing, cannot write
  perform set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);

  select count(*) into n from public.posts;
  if n <> 0 then raise exception 'FAIL: outsider can read posts (%)', n; end if;
  select count(*) into n from public.comments;
  if n <> 0 then raise exception 'FAIL: outsider can read comments (%)', n; end if;

  denied := false;
  begin
    insert into public.posts (city_slug, domain_slug, author_id, body) values ('delhi', 'vc', o, 'let me in');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: outsider posted'; end if;

  denied := false;
  begin
    insert into public.comments (post_id, author_id, body) values (p1, o, 'hi');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: outsider commented'; end if;

  ------------------------------------------------ rate limit: member already has 1 post, 9 more ok, 11th fails
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  for i in 1..9 loop
    insert into public.posts (city_slug, domain_slug, author_id, body) values ('delhi', 'vc', m, 'post ' || i);
  end loop;
  denied := false;
  begin
    insert into public.posts (city_slug, domain_slug, author_id, body) values ('delhi', 'vc', m, 'one too many');
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: post rate limit not enforced'; end if;

  ------------------------------------------------ anon sees nothing
  set local role anon;
  denied := false;
  begin
    perform count(*) from public.posts;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: anon could query posts'; end if;

  ------------------------------------------------ admin can delete anyone's post
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', ad, 'role', 'authenticated')::text, true);
  delete from public.posts where id = p2;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin could not delete a post'; end if;

  raise notice 'posts and comments tests passed';
end
$$;
