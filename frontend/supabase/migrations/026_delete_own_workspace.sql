-- 026 — delete_own_workspace : la fonction que le client appelle déjà.
--
-- Le client tente d'abord public.delete_own_workspace(ws_id), puis se rabat
-- sur un DELETE direct. La fonction n'existait dans aucune migration : le
-- repli marchait, mais chaque suppression commençait par une erreur 404
-- silencieuse. On la définit : vérification de propriété, puis suppression,
-- les tables liées suivent par cascade (membres, invitations, clés,
-- données chiffrées).
--
-- À appliquer dans Supabase → SQL Editor → coller → Run.

create or replace function public.delete_own_workspace(ws_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;
  if not exists (select 1 from public.workspaces where id = ws_id and owner_id = uid) then
    raise exception 'not_owner';
  end if;
  delete from public.workspaces where id = ws_id and owner_id = uid;
end $$;

revoke all on function public.delete_own_workspace(uuid) from public, anon;
grant execute on function public.delete_own_workspace(uuid) to authenticated;
