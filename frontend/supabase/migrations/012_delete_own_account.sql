-- ============================================================================
-- 012 — Suppression de compte PAR L'UTILISATEUR, sans Edge Function
--
-- Problème résolu : la suppression passait par une Edge Function, qui doit
-- être déployée séparément (CLI ou dashboard). Tant qu'elle ne l'est pas, le
-- bouton « Supprimer mon compte » échoue — alors que c'est une obligation
-- RGPD (art. 17) et une exigence App Store / Play Store.
--
-- Solution : une fonction SQL SECURITY DEFINER. Elle s'exécute avec les droits
-- de son propriétaire (postgres), qui peut écrire dans auth.users, mais elle
-- ne supprime QUE `auth.uid()` — le compte de l'appelant, jamais un autre.
-- Une seule migration à appliquer, et le bouton fonctionne pour toujours.
--
-- Sécurité :
--   - `auth.uid()` provient du JWT vérifié par PostgREST : non falsifiable.
--   - Aucun paramètre : impossible de viser le compte de quelqu'un d'autre.
--   - `search_path = ''` : pas de détournement de résolution de noms.
--   - EXECUTE révoqué à public/anon, accordé au seul rôle authenticated.
--   - La cascade sur auth.users purge profil, espaces possédés, adhésions,
--     invitations et payloads (FK `on delete cascade`, migrations 001/002).
-- ============================================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;

  -- Seule ligne autorisée : la sienne.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'Supprime définitivement le compte de l''appelant (RGPD art. 17). Ne peut jamais viser un autre utilisateur : la cible est auth.uid().';

notify pgrst, 'reload schema';
