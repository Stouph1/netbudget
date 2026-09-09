-- ============================================================================
-- DIAGNOSTIC — un changement de formule n'apparaît pas dans l'app
-- ============================================================================
--
-- À exécuter dans l'éditeur SQL de Supabase. Remplace l'adresse ci-dessous par
-- celle du compte concerné (celle de Sign in with Apple, en privaterelay).

-- ---------------------------------------------------------------------------
-- 1. Ce que le serveur accorde réellement à ce compte
-- ---------------------------------------------------------------------------
--
-- ATTENTION : on n'appelle PAS my_tier() ici. Dans l'éditeur SQL, auth.uid()
-- est nul, la fonction répondrait toujours « free » et t'induirait en erreur.
-- On refait donc son calcul à la main, sur le même critère.

with moi as (
  select id from auth.users
  where lower(email) = lower('REMPLACE@privaterelay.appleid.com')
)
select
  s.platform,
  s.product_id,
  s.tier,
  s.status,
  s.expires_at,
  s.expires_at > now()                     as encore_valide,
  s.original_transaction_id,
  s.updated_at
from public.subscriptions s, moi
where s.user_id = moi.id
order by s.updated_at desc;

-- LECTURE DU RÉSULTAT :
--
--   une seule ligne, tier = 'duo', status actif  -> la base est bonne, le
--       problème est dans l'app (palier forcé, ou le correctif de refreshTier).
--
--   une ligne tier = 'solo' et aucune 'duo'      -> le webhook n'a pas appliqué
--       le changement. Voir la section 2.
--
--   une ligne 'test'                             -> un palier de testeur écrase
--       tout. C'est migration 019/021 : supprime-la.

-- ---------------------------------------------------------------------------
-- 2. Ce que RevenueCat nous a envoyé
-- ---------------------------------------------------------------------------
--
-- Le webhook journalise TOUT, même ce qu'il refuse d'appliquer. Si le
-- changement de formule n'apparaît pas ici, c'est que RevenueCat ne l'a jamais
-- envoyé — le problème est alors dans sa configuration, pas dans notre code.

select
  e.received_at,
  e.type,
  e.user_id is null                        as compte_inconnu,
  e.payload -> 'event' ->> 'product_id'    as produit,
  e.payload -> 'event' ->> 'entitlement_ids' as droits,
  e.payload -> 'event' ->> 'environment'   as environnement,
  e.payload -> 'event' ->> 'original_transaction_id' as transaction
from public.subscription_events e
order by e.received_at desc
limit 15;

-- LECTURE DU RÉSULTAT :
--
--   pas de PRODUCT_CHANGE ni d'INITIAL_PURCHASE récent -> RevenueCat n'a rien
--       envoyé. Vérifie l'URL du webhook et le secret dans son interface.
--
--   compte_inconnu = true  -> l'achat a été fait sous un identifiant anonyme,
--       avant que l'app ne déclare l'utilisateur à RevenueCat. C'est le défaut
--       le plus vicieux : la boutique encaisse et le verdict n'atteint personne.
--
--   environnement = SANDBOX -> normal en TestFlight, ce n'est pas une erreur.
