-- Username sur le profil + description sur les workspaces.
-- À appliquer dans Supabase Dashboard → SQL Editor → coller → Run.

alter table public.profiles
  add column if not exists username text;

-- Un username doit être unique s'il est renseigné (NULL autorisé plusieurs fois).
create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

alter table public.workspaces
  add column if not exists description text;
