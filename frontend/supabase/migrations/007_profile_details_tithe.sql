-- Profil complet (prénom, nom) + dîme (% configurable) + lecture des profils
-- entre co-membres d'un workspace (pour afficher username/avatar des membres).
--
-- À appliquer dans Supabase Dashboard → SQL Editor → coller → Run.
-- (Nécessite que les migrations 001 → 006 soient déjà appliquées.)

-- ============================================================================
-- 1. Colonnes profil
-- ============================================================================

alter table public.profiles
  add column if not exists first_name text;

alter table public.profiles
  add column if not exists last_name text;

-- tithe_enabled existe depuis la migration 001 ; on ajoute le pourcentage.
alter table public.profiles
  add column if not exists tithe_percent numeric not null default 10
  check (tithe_percent >= 0 and tithe_percent <= 100);

-- ============================================================================
-- 2. Lecture des profils entre co-membres d'un workspace
-- ============================================================================

-- SECURITY DEFINER pour éviter la récursion RLS (même pattern que la 003).
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

-- Un membre peut lire le profil (username, avatar, prénom) des autres membres
-- de SES workspaces — pas de tout le monde.
drop policy if exists "profiles select workspace comembers" on public.profiles;
create policy "profiles select workspace comembers"
  on public.profiles for select
  using (public.shares_workspace_with(id));
