-- Date de naissance (âge auto + anniversaire) et situation professionnelle
-- (CRM consenti : actions marketing ciblées, amélioration produit).
-- À appliquer dans Supabase Dashboard → SQL Editor → coller → Run.

alter table public.profiles
  add column if not exists birthdate date;

-- student | employee | self_employed | civil_servant | unemployed | retired
alter table public.profiles
  add column if not exists occupation_status text;

-- Domaine de travail ou d'études (texte libre : "Informatique", "Santé"…)
alter table public.profiles
  add column if not exists occupation_field text;

notify pgrst, 'reload schema';
