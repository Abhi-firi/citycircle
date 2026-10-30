-- The sign-up trigger stores a valid gender and ignores junk. Rolled-back transaction.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ga text;
  gb text;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values
    ('00000000-0000-0000-0000-000000000000', a, 'authenticated', 'authenticated', a::text || '@test.invalid', '', now(),
      '{}', '{"full_name":"A","gender":"female"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', b, 'authenticated', 'authenticated', b::text || '@test.invalid', '', now(),
      '{}', '{"full_name":"B","gender":"bogus"}', now(), now(), '', '', '', '');

  select gender into ga from public.profiles where id = a;
  select gender into gb from public.profiles where id = b;
  if ga is distinct from 'female' then raise exception 'valid gender not stored'; end if;
  if gb is not null then raise exception 'invalid gender should be null'; end if;
end $$;
