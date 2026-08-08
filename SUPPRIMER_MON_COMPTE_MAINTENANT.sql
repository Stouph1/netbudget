-- ============================================================================
-- SUPPRIMER TON COMPTE — version sans placeholder à remplacer
--
-- Supabase → SQL Editor → colle ce bloc → Run. Rien à modifier.
-- ============================================================================

-- ÉTAPE 1 — Vois tes comptes, du plus récemment connecté au plus ancien.
--           Repère le tien et COPIE SON ID (la longue chaîne de la 1re colonne).
select
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name'      as nom_fournisseur,
  p.username,
  u.created_at::date                      as cree_le,
  u.last_sign_in_at                       as derniere_connexion
from auth.users u
left join public.profiles p on p.id = u.id
order by u.last_sign_in_at desc nulls last;

-- ============================================================================
-- ÉTAPE 2 — Colle l'ID à la place de <ID> ci-dessous, puis lance CE bloc SEUL
--           (sélectionne-le à la souris et fais Run).
--
--   delete from auth.users where id = '<ID>';
--
-- Le garde-fou ci-dessous REFUSE de s'exécuter si tu oublies de remplacer :
-- il lèvera une erreur explicite au lieu de renvoyer « 0 ligne » en silence.
-- ============================================================================

-- ÉTAPE 2 bis (ALTERNATIVE) — suppression par e-mail, avec vérification.
-- Remplace UNIQUEMENT la valeur entre guillemets, puis lance ce bloc entier.
do $$
declare
  cible text := 'mets-ton-email-ici@exemple.com';  -- ← SEULE LIGNE À MODIFIER
  trouve uuid;
begin
  if cible like '%exemple.com' or cible like '%REMPLACE%' then
    raise exception
      'Tu n''as pas remplacé l''e-mail. Modifie la variable "cible" ligne 3 de ce bloc.';
  end if;

  select id into trouve from auth.users where lower(email) = lower(cible);

  if trouve is null then
    raise exception
      'Aucun compte avec l''e-mail % . Relance l''ÉTAPE 1 pour voir la liste exacte.', cible;
  end if;

  delete from auth.users where id = trouve;
  raise notice 'Compte % supprimé (id %).', cible, trouve;
end $$;

-- ÉTAPE 3 — Contrôle : la liste ne doit plus contenir ton compte.
select id, email, last_sign_in_at
from auth.users
order by last_sign_in_at desc nulls last;

-- ============================================================================
-- ENSUITE, DANS L'APP :
--   Réglages → Réinitialiser toutes les données (vide le cache local)
--   puis relance l'app → tu repars sur le parcours d'inscription complet.
-- ============================================================================
