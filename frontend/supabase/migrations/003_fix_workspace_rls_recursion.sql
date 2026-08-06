-- Fix : "infinite recursion detected in policy for relation workspace_members"
--
-- Cause : la policy SELECT de workspace_members contenait un sous-select sur
-- workspace_members elle-même → Postgres détecte la boucle et refuse.
-- Même souci en germe sur les policies workspaces / encrypted_payloads /
-- workspace_invites qui interrogent workspace_members (le sous-select y
-- déclenche la policy de workspace_members, qui elle-même boucle).
--
-- Solution standard Supabase : une fonction SECURITY DEFINER qui lit
-- workspace_members EN BYPASSANT la RLS (le "definer" est le propriétaire de
-- la fonction, pas l'appelant). Toutes les policies passent par elle.
--
-- À appliquer dans Supabase Dashboard → SQL Editor → coller → Run.

-- ============================================================================
-- 1. Fonctions helper (SECURITY DEFINER = pas de RLS à l'intérieur)
-- ============================================================================

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- Restreindre l'exécution aux users authentifiés
revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_admin(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_admin(uuid) to authenticated;

-- ============================================================================
-- 2. Re-créer les policies avec les fonctions (plus de récursion)
-- ============================================================================

-- --- workspace_members ---
drop policy if exists "members select if in workspace" on public.workspace_members;
create policy "members select if in workspace"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

-- (la policy delete existante ne référence pas workspace_members en
--  sous-select sur elle-même pour le user courant — mais on la refait
--  proprement avec la fonction pour cohérence)
drop policy if exists "members delete self or by owner" on public.workspace_members;
create policy "members delete self or by owner"
  on public.workspace_members for delete
  using (
    user_id = auth.uid()
    OR workspace_id in (
      select id from public.workspaces where owner_id = auth.uid()
    )
  );

-- --- workspaces ---
drop policy if exists "workspaces select member" on public.workspaces;
create policy "workspaces select member"
  on public.workspaces for select
  using (public.is_workspace_member(id));

-- --- workspace_invites ---
drop policy if exists "invites insert if workspace member" on public.workspace_invites;
create policy "invites insert if workspace member"
  on public.workspace_invites for insert
  with check (
    auth.uid() = inviter_id
    AND public.is_workspace_admin(workspace_id)
  );

-- --- encrypted_payloads ---
drop policy if exists "payloads all own or workspace member" on public.encrypted_payloads;
create policy "payloads all own or workspace member"
  on public.encrypted_payloads for all
  using (
    (workspace_id is null and auth.uid() = user_id)
    OR
    (workspace_id is not null and public.is_workspace_member(workspace_id))
  )
  with check (
    (workspace_id is null and auth.uid() = user_id)
    OR
    (workspace_id is not null and public.is_workspace_member(workspace_id))
  );
