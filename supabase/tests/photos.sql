-- Security tests for photo storage rules. Rolled-back transaction.

do $$
declare
  a uuid := gen_random_uuid();   -- member of pune/coders
  b uuid := gen_random_uuid();   -- member of pune/coders
  o uuid := gen_random_uuid();   -- outsider
  n bigint;
  denied boolean;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
    u::text || '@test.invalid', '', now(), '{}', '{}', now(), now(), '', '', '', ''
  from unnest(array[a, b, o]) as u;

  insert into public.community_memberships (user_id, city_slug, domain_slug)
    values (a, 'pune', 'coders'), (b, 'pune', 'coders');
  insert into public.community_status (city_slug, domain_slug, status) values ('pune', 'coders', 'live');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  ------------------------------------------------ avatars
  insert into storage.objects (bucket_id, name, owner) values ('avatars', a::text || '/me.webp', a);

  denied := false;
  begin
    insert into storage.objects (bucket_id, name, owner) values ('avatars', b::text || '/steal.webp', a);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: uploaded an avatar into someone else''s folder'; end if;

  ------------------------------------------------ post images
  insert into storage.objects (bucket_id, name, owner)
    values ('post-images', 'pune/coders/' || a::text || '/p1.webp', a);

  denied := false;
  begin
    insert into storage.objects (bucket_id, name, owner)
      values ('post-images', 'pune/coders/' || b::text || '/p2.webp', a);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: uploaded a post image into someone else''s folder'; end if;

  denied := false;
  begin
    insert into storage.objects (bucket_id, name, owner)
      values ('post-images', 'delhi/vc/' || a::text || '/p3.webp', a);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: uploaded to a community the member is not in'; end if;

  -- post whose image path matches its community and author
  insert into public.posts (city_slug, domain_slug, author_id, body, image_path)
    values ('pune', 'coders', a, 'with photo', 'pune/coders/' || a::text || '/p1.webp');

  denied := false;
  begin
    insert into public.posts (city_slug, domain_slug, author_id, body, image_path)
      values ('pune', 'coders', a, 'bad path', 'pune/coders/' || b::text || '/p1.webp');
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: post accepted an image path from another author'; end if;

  ------------------------------------------------ readers
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from storage.objects where bucket_id = 'post-images';
  if n <> 1 then raise exception 'FAIL: community member cannot read post image (%)', n; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
  select count(*) into n from storage.objects where bucket_id = 'post-images';
  if n <> 0 then raise exception 'FAIL: outsider can read post images (%)', n; end if;

  denied := false;
  begin
    insert into storage.objects (bucket_id, name, owner)
      values ('post-images', 'pune/coders/' || o::text || '/x.webp', o);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: outsider uploaded a post image'; end if;

  raise notice 'photos tests passed';
end
$$;
