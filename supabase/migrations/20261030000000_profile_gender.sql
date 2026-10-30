-- Optional gender on the profile, so members can tell male, female and other profiles apart.
-- Shown to other signed-in members like the rest of the profile.
alter table public.profiles
  add column gender text check (gender in ('male', 'female', 'other'));
