-- ============================================================================
-- ACTIVE LE BOUTON « SUPPRIMER MON COMPTE » DANS L'APP
--
-- Supabase → SQL Editor → New query → colle TOUT → Run.
-- Rien à modifier, aucun e-mail à remplacer, aucune fonction à déployer.
--
-- Après ça, chaque utilisateur supprime son compte lui-même depuis
-- Réglages → Supprimer mon compte. Définitivement, sans passer par toi.
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

  -- Seule ligne autorisée : la sienne. La cible vient du JWT vérifié,
  -- jamais d'un paramètre — impossible de supprimer le compte d'un autre.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'Supprime définitivement le compte de l''appelant (RGPD art. 17).';

notify pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION (facultatif) — doit renvoyer une ligne :
-- ============================================================================
select
  p.proname                    as fonction,
  p.prosecdef                  as security_definer,
  pg_get_userbyid(p.proowner)  as proprietaire
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'delete_own_account';
