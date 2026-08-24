-- ============================================================================
-- 017 — Chiffrement des espaces partagés
--
-- À COLLER DANS SUPABASE : SQL Editor → New query → colle TOUT → Run.
-- Sans risque : une table et deux colonnes ajoutées. Les espaces existants
-- continuent de fonctionner à l'identique, en clair, jusqu'à ce qu'ils soient
-- chiffrés.
--
-- LE PRINCIPE. Chaque espace a sa propre clé, tirée au hasard. Chaque membre
-- en garde une copie chiffrée avec SA clé personnelle : le serveur stocke
-- autant de copies que de membres et n'en ouvre aucune.
--
-- COMMENT UN NOUVEAU MEMBRE OBTIENT LA CLÉ. Elle voyage dans l'invitation,
-- emballée avec une clé dérivée du code d'invitation. L'invité tape le code,
-- donc il peut ouvrir le paquet seul et immédiatement — sans attendre qu'un
-- autre membre se connecte, ce qui serait insupportable sur un budget familial.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Une copie de la clé d'espace par membre
-- ----------------------------------------------------------------------------
create table if not exists public.workspace_keys (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- Clé de l'espace, chiffrée avec la clé personnelle du membre.
  sealed_key   bytea not null,
  nonce        bytea not null,
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

comment on table public.workspace_keys is
  'Cle de chiffrement d''un espace, une copie par membre, chiffree avec la cle personnelle de ce membre. Le serveur ne peut ouvrir aucune copie.';

alter table public.workspace_keys enable row level security;

-- ----------------------------------------------------------------------------
-- 2. Qui voit quoi
--
-- CHACUN NE LIT QUE SA PROPRE COPIE. C'est le point important : donner accès
-- aux copies des autres membres ne révélerait rien de déchiffrable, mais
-- exposerait sans raison la liste de qui a accès à quoi. On ne publie pas ce
-- qui n'a pas besoin de l'être.
-- ----------------------------------------------------------------------------
drop policy if exists "ws keys select own" on public.workspace_keys;
create policy "ws keys select own"
  on public.workspace_keys for select to authenticated
  using (auth.uid() = user_id);

-- On dépose SA propre copie, et seulement pour un espace dont on est membre.
-- Sans la seconde condition, n'importe qui pourrait créer des lignes pour des
-- espaces inconnus et encombrer la table.
drop policy if exists "ws keys insert own" on public.workspace_keys;
create policy "ws keys insert own"
  on public.workspace_keys for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_keys.workspace_id
        and m.user_id = auth.uid()
    )
  );

-- Remplacer sa copie sert au changement de phrase de récupération.
drop policy if exists "ws keys update own" on public.workspace_keys;
create policy "ws keys update own"
  on public.workspace_keys for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Quitter un espace, c'est jeter sa copie.
drop policy if exists "ws keys delete own" on public.workspace_keys;
create policy "ws keys delete own"
  on public.workspace_keys for delete to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. La clé voyage dans l'invitation
--
-- Colonnes NULL pour les invitations d'espaces non chiffrés : les deux mondes
-- coexistent le temps que tout le monde active le chiffrement.
-- ----------------------------------------------------------------------------
alter table public.workspace_invites
  add column if not exists sealed_key bytea,
  add column if not exists sealed_nonce bytea;

comment on column public.workspace_invites.sealed_key is
  'Cle de l''espace, emballee avec une cle derivee du code d''invitation. NULL si l''espace n''est pas chiffre. Inutilisable sans le code, qui n''est jamais stocke en clair cote serveur.';

-- ----------------------------------------------------------------------------
-- 4. L'espace sait-il qu'il est chiffré ?
--
-- Sert à l'interface : afficher « chiffré » et savoir s'il faut réclamer une
-- clé à un membre qui n'en a pas encore.
-- ----------------------------------------------------------------------------
alter table public.workspaces
  add column if not exists encrypted boolean not null default false;

comment on column public.workspaces.encrypted is
  'true quand le contenu de l''espace est chiffre avec une cle d''espace.';

notify pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'workspace_keys'
  ) then
    raise exception 'workspace_keys absente : la migration a echoue';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'workspace_invites'
      and column_name = 'sealed_key'
  ) then
    raise exception 'workspace_invites.sealed_key absente : la migration a echoue';
  end if;

  raise notice 'Migration 017 appliquee. Les espaces existants restent en clair jusqu''a leur chiffrement.';
end $$;

select
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public' and tablename = 'workspace_keys'
order by cmd, policyname;
