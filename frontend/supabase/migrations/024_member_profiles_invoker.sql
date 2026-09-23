-- 024 — member_profiles : droits de l'appelant, pas du créateur.
--
-- Le Security Advisor de Supabase signale la vue public.member_profiles comme
-- SECURITY DEFINER : elle s'exécute avec les droits de son créateur (postgres)
-- et ignore donc la RLS de la table profiles. Le filtre shares_workspace_with
-- la protégeait déjà, mais rien n'empêchait une future colonne ou un futur
-- oubli d'exposer plus que prévu.
--
-- Postgres 15+ permet security_invoker : la vue lit profiles AVEC la RLS de la
-- personne connectée. La policy « profiles select workspace comembers » (007)
-- autorise déjà la lecture des co-membres, donc rien ne change pour l'app.
-- security_barrier reste : le filtre est évalué avant toute fonction de
-- l'appelant.
--
-- À appliquer dans Supabase → SQL Editor → coller → Run.

alter view public.member_profiles set (security_invoker = true, security_barrier = true);

revoke all on public.member_profiles from public, anon;
grant select on public.member_profiles to authenticated;
