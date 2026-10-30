-- Security tests for post likes and editing. Rolled-back transaction.

do $$
declare
  a uuid := gen_random_uuid();   -- author, member of delhi/vc
  b uuid := gen_random_uuid();   -- member of delhi/vc
  o uuid := gen_random_uuid();   -- outsider
  p uuid;
  n bigint;
  stamp timestamptz;
  txt text;
  denied boolean;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
    u::text || '@test.invalid', '', now(), '{}', '{}', now(), now(), '', '', '', ''
  from unnest(array[a, b, o]) as u;

  insert into public.community_memberships (user_id, city_slug, domain_slug)
    values (a, 'delhi', 'vc'), (b, 'delhi', 'vc');
  insert into public.community_status (city_slug, domain_slug, status) values ('delhi', 'vc', 'live');

  ------------------------------------------------ author posts and edits
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.posts (city_slug, domain_slug, author_id, body) values ('delhi', 'vc', a, 'first draft') returning id into p;

  update public.posts set body = 'edited text' where id = p;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: author could not edit own post'; end if;
  select body, edited_at into txt, stamp from public.posts where id = p;
  if txt <> 'edited text' or stamp is null then raise exception 'FAIL: edit not saved or edited_at not stamped'; end if;

  denied := false;
  begin
    update public.posts set city_slug = 'pune' where id = p;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: author changed a non-body column'; end if;

  denied := false;
  begin
    update public.posts set edited_at = null where id = p;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: author wrote edited_at directly'; end if;

  denied := false;
  begin
    update public.posts set body = '   ' where id = p;
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: blank edit accepted'; end if;

  ------------------------------------------------ other member cannot edit, can like once
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  update public.posts set body = 'hijacked' where id = p;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: member edited someone else''s post'; end if;

  insert into public.post_likes (post_id, user_id) values (p, b);

  denied := false;
  begin
    insert into public.post_likes (post_id, user_id) values (p, b);
  exception when unique_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: double like accepted'; end if;

  denied := false;
  begin
    insert into public.post_likes (post_id, user_id) values (p, a);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: liked on behalf of someone else'; end if;

  ------------------------------------------------ author sees the like but cannot remove it
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.post_likes where post_id = p;
  if n <> 1 then raise exception 'FAIL: author should see 1 like (saw %)', n; end if;
  delete from public.post_likes where post_id = p and user_id = b;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: removed another person''s like'; end if;

  ------------------------------------------------ outsider cannot see or add likes
  perform set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
  select count(*) into n from public.post_likes;
  if n <> 0 then raise exception 'FAIL: outsider saw likes (saw %)', n; end if;
  denied := false;
  begin
    insert into public.post_likes (post_id, user_id) values (p, o);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: outsider liked a post they cannot read'; end if;

  ------------------------------------------------ owner can unlike
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  delete from public.post_likes where post_id = p and user_id = b;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: could not remove own like'; end if;

  ------------------------------------------------ anon has no access
  reset role;
  set local role anon;
  denied := false;
  begin
    perform count(*) from public.post_likes;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: anon could read likes'; end if;

  raise notice 'post likes and edit tests passed';
end
$$;
