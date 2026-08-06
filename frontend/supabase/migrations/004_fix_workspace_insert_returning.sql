-- Fix : "new row violates row-level security policy for table workspaces"
-- au moment de la CRÉATION d'un workspace.
--
-- Cause : le client fait INSERT ... RETURNING * (PostgREST .insert().select()).
-- Postgres applique la policy SELECT sur la ligne retournée. Or la policy
-- SELECT exige d'être membre (is_workspace_member) — et le trigger AFTER
-- INSERT qui ajoute l'owner comme membre s'exécute APRÈS la collecte du
-- RETURNING. La ligne n'est donc pas encore visible → erreur 42501.
--
-- Fix : l'owner voit TOUJOURS ses propres workspaces, membership ou pas.
--
-- À appliquer dans Supabase Dashboard → SQL Editor → coller → Run.

drop policy if exists "workspaces select owner" on public.workspaces;
create policy "workspaces select owner"
  on public.workspaces for select
  using (owner_id = auth.uid());

-- (la policy "workspaces select member" reste en place pour les invités —
--  les deux policies SELECT se cumulent en OR)
