-- Photos de profil + photos de workspace.
--
-- 1. Colonnes URL sur profiles et workspaces
-- 2. Bucket Storage public "avatars" (lecture publique, écriture scopée)
--    Arborescence : avatars/<user_id>/avatar.jpg
--                   avatars/workspaces/<workspace_id>/photo.jpg
--
-- À appliquer dans Supabase Dashboard → SQL Editor → coller → Run.

-- ============================================================================
-- 1. Colonnes
-- ============================================================================

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.workspaces
  add column if not exists photo_url text;

-- ============================================================================
-- 2. Bucket avatars (public en lecture)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ============================================================================
-- 3. Policies storage.objects
-- ============================================================================

-- Lecture publique (le bucket est public mais la policy select est requise
-- pour les listages via l'API authentifiée)
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Un user écrit UNIQUEMENT dans son dossier <user_id>/...
drop policy if exists "avatars user upload own folder" on storage.objects;
create policy "avatars user upload own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (
      -- avatar perso : avatars/<user_id>/...
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      -- photo workspace : avatars/workspaces/<workspace_id>/... si admin
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
