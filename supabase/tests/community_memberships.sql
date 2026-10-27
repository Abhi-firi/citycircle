-- Security tests for community_memberships. Run inside a transaction that is
-- rolled back, after the migrations. Any failed check raises an exception.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n bigint;
  denied boolean;
  doms text[] := array['angel-investors','vc','startup-founders','coders','product-managers',
                       'recruiters-hr','sales-business-development','creators-influencers',
                       'residential-real-estate-builders','commercial-real-estate-builders'];
begin
  -- Two throwaway users (profiles are created by the sign-up trigger).
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
    u::text || '@test.invalid', '', now(), '{}', '{}', now(), now(), '', '', '', ''
  from unnest(array[a, b]) as u;

  ---------------------------------------------------------------- user A
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.community_memberships (user_id, city_slug, domain_slug) values (a, 'delhi', 'vc');

  denied := false;
  begin
    insert into public.community_memberships (user_id, city_slug, domain_slug) values (a, 'delhi', 'vc');
  exception when unique_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: duplicate membership was allowed'; end if;

  denied := false;
  begin
    insert into public.community_memberships (user_id, city_slug, domain_slug) values (b, 'delhi', 'vc');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: A could join on behalf of B'; end if;

  denied := false;
  begin
    insert into public.community_memberships (user_id, city_slug, domain_slug) values (a, 'atlantis', 'vc');
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: unknown city was accepted'; end if;

  select count(*) into n from public.community_memberships;
  if n <> 1 then raise exception 'FAIL: A should see exactly 1 row, saw %', n; end if;

  -- Bulk insert must not bypass the cap of 20 (A has 1, tries 20 more).
  denied := false;
  begin
    insert into public.community_memberships (user_id, city_slug, domain_slug)
      select a, 'noida', d from unnest(doms) d
      union all select a, 'pune', d from unnest(doms) d;
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: bulk insert bypassed the membership cap'; end if;

  select count(*) into n from public.community_memberships;
  if n <> 1 then raise exception 'FAIL: failed bulk insert left rows behind (%)', n; end if;

  ---------------------------------------------------------------- user B
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select count(*) into n from public.community_memberships;
  if n <> 0 then raise exception 'FAIL: B can see other members'' rows (%)', n; end if;

  -- Exactly 20 is allowed, the 21st is refused.
  insert into public.community_memberships (user_id, city_slug, domain_slug)
    select b, 'mumbai', d from unnest(doms) d
    union all select b, 'chennai', d from unnest(doms) d;

  denied := false;
  begin
    insert into public.community_memberships (user_id, city_slug, domain_slug) values (b, 'delhi', 'vc');
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'FAIL: 21st membership was allowed'; end if;

  -- B cannot delete A's membership.
  delete from public.community_memberships where user_id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B deleted A''s membership'; end if;

  -- B can leave a community of their own.
  delete from public.community_memberships where user_id = b and city_slug = 'chennai' and domain_slug = 'vc';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: B could not leave own community'; end if;

  -------------------------------------------------------- anonymous visitor
  set local role anon;

  select count(*) into n from public.community_memberships;
  if n <> 0 then raise exception 'FAIL: anonymous visitor can read memberships (%)', n; end if;

  select member_count into n from public.community_member_counts()
    where city_slug = 'mumbai' and domain_slug = 'vc';
  if n is distinct from 1 then raise exception 'FAIL: public count for mumbai/vc should be 1, got %', n; end if;

  denied := false;
  begin
    insert into public.community_memberships (user_id, city_slug, domain_slug) values (a, 'pune', 'vc');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: anonymous visitor could join'; end if;

  raise notice 'community_memberships tests passed';
end;
$$;
