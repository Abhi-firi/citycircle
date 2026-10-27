-- LinkedIn and website links are no longer collected. Remove the columns.
alter table public.profiles
  drop column if exists linkedin_url,
  drop column if exists website_url;
