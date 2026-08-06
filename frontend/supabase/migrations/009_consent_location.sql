-- RGPD + localisation (CRM légal).
--  - consent_at : horodatage de l'acceptation de la politique de
--    confidentialité et des CGU (case obligatoire à l'inscription).
--  - country/region/city : localisation déclarée par l'utilisateur à
--    l'inscription — personnalise les conseils (pays, région) et sert de
--    base CRM consentie.
-- À appliquer dans Supabase Dashboard → SQL Editor → coller → Run.

alter table public.profiles
  add column if not exists consent_at timestamptz;

alter table public.profiles
  add column if not exists country text;

alter table public.profiles
  add column if not exists region text;

alter table public.profiles
  add column if not exists city text;

notify pgrst, 'reload schema';
