-- Security tests for admins and community_status. Run in a rolled-back transaction.

do $$
declare
  a uuid := gen_random_uuid();   -- ordinary member
  b uuid := gen_random_uuid();   -- admin
  n bigint;
  denied boolean;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
    u::text || '@test.invalid', '', now(), '{}', '{}', now(), now(), '', '', '', ''
  from unnest(array[a, b]) as u;

  -- Only direct DB access can create an admin (done here as the migration owner).
  insert into public.admins (user_id) values (b);

  ---------------------------------------------------------------- member
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  if public.is_admin() then raise exception 'FAIL: ordinary member reported as admin'; end if;

  denied := false;
  begin
    insert into public.admins (user_id) values (a);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: member could make themselves admin'; end if;

  denied := false;
  begin
    insert into public.community_status (city_slug, domain_slug, status) values ('delhi', 'vc', 'live');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: member could insert community status'; end if;

  select count(*) into n from public.admins;
  if n <> 0 then raise exception 'FAIL: member can see admin rows (%)', n; end if;

  ---------------------------------------------------------------- admin
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  if not public.is_admin() then raise exception 'FAIL: admin not recognised'; end if;

  insert into public.community_status (city_slug, domain_slug, status, updated_by)
    values ('delhi', 'vc', 'live', b);
  update public.community_status set status = 'waitlist' where city_slug = 'delhi' and domain_slug = 'vc';

  denied := false;
  begin
    insert into public.community_status (city_slug, domain_slug, status) values ('delhi', 'coders', 'banana');
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: invalid status accepted'; end if;

  ---------------------------------------------------------------- member again
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  update public.community_status set status = 'live' where city_slug = 'delhi';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: member updated community status'; end if;

  select count(*) into n from public.community_status;
  if n <> 1 then raise exception 'FAIL: member should read community status (saw %)', n; end if;

  ---------------------------------------------------------------- anonymous
  set local role anon;
  select count(*) into n from public.community_status;
  if n <> 1 then raise exception 'FAIL: anon should read community status (saw %)', n; end if;

  denied := false;
  begin
    perform public.is_admin();
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: anon could call is_admin'; end if;

  raise notice 'admin and community_status tests passed';
end
$$;
