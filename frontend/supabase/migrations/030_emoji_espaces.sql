-- 030 — Pictogramme d'un espace partagé.
--
-- Un espace porte un emoji, deviné depuis son nom à la création (« Coloc
-- Lyon » → 🏢, « Vacances » → 🧳) ou choisi par son propriétaire. Il est
-- partagé : tous les membres voient le même. Une colonne texte, rien de
-- plus ; la policy « workspaces update owner » existante suffit.
--
-- À appliquer dans Supabase → SQL Editor → coller → Run.

alter table public.workspaces
  add column if not exists emoji text
  check (emoji is null or char_length(emoji) <= 16);

comment on column public.workspaces.emoji is
  'Pictogramme de l''espace, deviné depuis le nom ou choisi par le propriétaire.';
