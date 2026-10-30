-- Store the gender chosen at sign-up (required in the UI) on the new profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  g text := lower(trim(new.raw_user_meta_data ->> 'gender'));
begin
  insert into public.profiles (id, full_name, gender)
  values (
    new.id,
    left(
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
               split_part(new.email, '@', 1),
               'Member'),
      100
    ),
    case when g in ('male', 'female', 'other') then g else null end
  );
  return new;
end;
$$;
