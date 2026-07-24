-- ============================================================================
-- SCRIPT COMBINÉ : migrations 005 + 006 + 007 + 008 en un seul Run.
-- Supabase Dashboard → SQL Editor → coller TOUT ce fichier → Run.
-- Idempotent : peut être relancé sans risque.
--
-- Corrige : "Bucket not found" (photo) + "Could not find the 'username' /
-- 'first_name' column" (pseudo, prénom, dîme) + type workspace "association".
-- ============================================================================

-- ============================================================================
-- 005 — Photos de profil + photos de workspace
-- ============================================================================

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.workspaces
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars user upload own folder" on storage.objects;
create policy "avatars user upload own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      (
        (storage.foldername(name))[1] = 'workspaces'
        and public.is_workspace_admin(((storage.foldername(name))[2])::uuid)
      )
    )
  );

drop policy if exists "avatars user update own folder" on storage.objects;
create policy "avatars user update own folder"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      (
        (storage.foldername(name))[1] = 'workspaces'
        and public.is_workspace_admin(((storage.foldername(name))[2])::uuid)
      )
    )
  );

drop policy if exists "avatars user delete own folder" on storage.objects;
create policy "avatars user delete own folder"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      (
        (storage.foldername(name))[1] = 'workspaces'
        and public.is_workspace_admin(((storage.foldername(name))[2])::uuid)
      )
    )
  );

-- ============================================================================
-- 006 — Username + description workspace
-- ============================================================================

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

alter table public.workspaces
  add column if not exists description text;

-- ============================================================================
-- 007 — Prénom / nom / % dîme + lecture profils entre co-membres
-- ============================================================================

alter table public.profiles
  add column if not exists first_name text;

alter table public.profiles
  add column if not exists last_name text;

alter table public.profiles
  add column if not exists tithe_percent numeric not null default 10
  check (tithe_percent >= 0 and tithe_percent <= 100);

create or replace function public.shares_workspace_with(target uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members m1
    join public.workspace_members m2 on m1.workspace_id = m2.workspace_id
    where m1.user_id = auth.uid()
      and m2.user_id = target
  );
$$;

revoke all on function public.shares_workspace_with(uuid) from public;
grant execute on function public.shares_workspace_with(uuid) to authenticated;

drop policy if exists "profiles select workspace comembers" on public.profiles;
create policy "profiles select workspace comembers"
  on public.profiles for select
  using (public.shares_workspace_with(id));

-- ============================================================================
-- 008 — Type de workspace "association"
-- ============================================================================

alter table public.workspaces
  drop constraint if exists workspaces_kind_check;

alter table public.workspaces
  add constraint workspaces_kind_check
  check (kind in ('couple', 'family', 'coloc', 'association', 'other'));

-- ============================================================================
-- Recharge le cache de schéma PostgREST (sinon l'API peut mettre du temps
-- à voir les nouvelles colonnes → "Could not find column in schema cache")
-- ============================================================================

notify pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION — le résultat doit afficher TRUE partout
-- ============================================================================

select
  exists(select 1 from storage.buckets where id = 'avatars')                                                    as bucket_avatars_ok,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles'   and column_name='avatar_url')    as avatar_url_ok,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles'   and column_name='username')      as username_ok,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles'   and column_name='first_name')    as first_name_ok,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles'   and column_name='tithe_percent') as tithe_percent_ok,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='workspaces' and column_name='description')   as ws_description_ok,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='workspaces' and column_name='photo_url')     as ws_photo_ok,
  exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='shares_workspace_with') as comember_fn_ok;
