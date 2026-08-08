-- ============================================================================
-- SUPPRIMER TON COMPTE TOUT DE SUITE — sans rien déployer
--
-- Supabase → SQL Editor → New query → colle ceci → remplace l'e-mail → Run.
-- Toutes tes données partent en cascade (profil, espaces, budgets, payloads).
-- Ensuite tu peux refaire l'inscription complète dans l'app.
-- ============================================================================

-- 1. Vérifie d'abord QUI tu vas supprimer (lance cette ligne seule)
select id, email, created_at, last_sign_in_at
  from auth.users
 where email = 'REMPLACE_PAR_TON_EMAIL';

-- 2. Si la ligne ci-dessus est bien la tienne, lance la suppression :
delete from auth.users
 where email = 'REMPLACE_PAR_TON_EMAIL';

-- 3. Contrôle : doit renvoyer 0 ligne
select count(*) as reste
  from auth.users
 where email = 'REMPLACE_PAR_TON_EMAIL';

-- ----------------------------------------------------------------------------
-- Si tu t'es connecté avec Apple ou Google, tu ne connais peut-être pas
-- l'e-mail exact. Liste alors tes comptes récents et repère le tien :
--
--   select id, email, raw_user_meta_data->>'full_name' as nom,
--          created_at, last_sign_in_at
--     from auth.users
--    order by last_sign_in_at desc nulls last
--    limit 20;
--
-- Puis supprime par identifiant :
--
--   delete from auth.users where id = 'COLLE_L_ID_ICI';
-- ----------------------------------------------------------------------------

-- APRÈS la suppression, dans l'app : Réglages → Réinitialiser toutes les
-- données (pour vider le cache local), puis relance l'app et refais
-- l'inscription. Tu passeras par tout le parcours : photo, pseudo, date de
-- naissance, situation, pays/région, puis le questionnaire du Coach.
