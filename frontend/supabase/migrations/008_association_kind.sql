-- Nouveau type de workspace : association (loi 1901).
-- Le check constraint de la migration 002 limitait kind à 4 valeurs.
-- À appliquer dans Supabase Dashboard → SQL Editor → coller → Run.

alter table public.workspaces
  drop constraint if exists workspaces_kind_check;

alter table public.workspaces
  add constraint workspaces_kind_check
  check (kind in ('couple', 'family', 'coloc', 'association', 'other'));
