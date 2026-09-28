-- 029 — Le point du mois, visible des co-membres d'un espace.
--
-- POURQUOI. Dans un budget à deux ou en famille, savoir que l'autre a fait son
-- point du mois est la meilleure incitation à faire le sien : « Marie a fait
-- son point » vaut mieux que n'importe quel rappel. Il faut donc que le mois
-- du dernier point soit lisible par les personnes qui partagent un espace.
--
-- CE QU'ON EXPOSE : le mois (« 2026-09 »), rien d'autre. Pas les chiffres du
-- point, qui restent chiffrés côté client. La colonne n'est lisible que par
-- les co-membres (vue member_profiles, filtrée par shares_workspace_with) et
-- modifiable que par la personne elle-même (policy « profiles update own »).
--
-- À appliquer dans Supabase → SQL Editor → coller → Run.

alter table public.profiles
  add column if not exists last_checkin_month text
  check (last_checkin_month is null or last_checkin_month ~ '^\d{4}-(0[1-9]|1[0-2])$');

comment on column public.profiles.last_checkin_month is
  'Mois (AAAA-MM) du dernier point mensuel. Visible des co-membres d''un espace, jamais les montants.';

-- La vue liste ses colonnes explicitement : on la recrée avec la nouvelle.
drop view if exists public.member_profiles;
create view public.member_profiles
  with (security_invoker = true, security_barrier = true) as
  select id, username, avatar_url, first_name, last_checkin_month
    from public.profiles
   where public.shares_workspace_with(id);

revoke all on public.member_profiles from public, anon;
grant select on public.member_profiles to authenticated;
