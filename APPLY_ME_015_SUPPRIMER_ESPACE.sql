-- ============================================================================
-- RÉPARE « impossible de supprimer un espace »
--
-- Supabase → SQL Editor → New query → colle TOUT → Run. Rien à modifier.
--
-- Le symptôme : le propriétaire appuie sur « Supprimer cet espace », aucune
-- erreur ne s'affiche… et l'espace est toujours là. Cause : un DELETE filtré
-- par RLS supprime 0 ligne SANS renvoyer d'erreur. Le client croyait donc que
-- l'opération avait réussi.
--
-- Correctif en deux temps :
--   1. cette fonction serveur, qui vérifie la propriété et supprime vraiment ;
--   2. côté app, la suppression vérifie désormais le nombre de lignes touchées
--      et affiche un message clair si rien n'a été supprimé.
-- ============================================================================

create or replace function public.delete_own_workspace(ws_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  owner uuid;
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;

  select owner_id into owner from public.workspaces where id = ws_id;

  if owner is null then
    raise exception 'workspace_not_found';
  end if;

  -- Seul le propriétaire peut supprimer. La cible vient du JWT vérifié :
  -- impossible de supprimer l'espace de quelqu'un d'autre.
  if owner <> uid then
    raise exception 'not_owner';
  end if;

  -- La cascade (migrations 001/002) emporte membres, invitations et payloads.
  delete from public.workspaces where id = ws_id;
end;
$$;

revoke all on function public.delete_own_workspace(uuid) from public, anon;
grant execute on function public.delete_own_workspace(uuid) to authenticated;

comment on function public.delete_own_workspace(uuid) is
  'Supprime un espace dont l''appelant est propriétaire, avec sa cascade.';

-- ----------------------------------------------------------------------------
-- Filet de sécurité : on s'assure que la policy DELETE existe bien et qu'elle
-- vise le propriétaire (elle a pu être perdue si un script antérieur s'est
-- interrompu en cours de route).
-- ----------------------------------------------------------------------------

drop policy if exists "workspaces delete owner" on public.workspaces;
create policy "workspaces delete owner"
  on public.workspaces for delete to authenticated
  using (auth.uid() = owner_id);

notify pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION — doit lister les trois fonctions
-- ============================================================================
select
  p.proname as fonction,
  p.prosecdef as security_definer,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('accept_invite', 'delete_own_account', 'delete_own_workspace')
order by p.proname;
