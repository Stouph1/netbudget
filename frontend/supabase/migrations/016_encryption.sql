-- ============================================================================
-- 016 — Chiffrement de bout en bout
--
-- À COLLER DANS SUPABASE : tableau de bord → SQL Editor → Run.
-- Sans risque : deux colonnes ajoutées, aucune donnée touchée. Les comptes
-- existants continuent de fonctionner exactement comme avant.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Format de chiffrement de chaque enregistrement
--
-- POURQUOI UNE COLONNE ET PAS LA COLONNE `version` EXISTANTE : celle-ci
-- désigne la version du SCHÉMA de la donnée métier (le format du budget, des
-- objectifs…). Y mélanger la version du chiffrement rendrait impossible de
-- faire évoluer l'un sans l'autre.
--
-- 0 = JSON en clair, écrit avant le chiffrement. Ces lignes existent en base
--     et doivent rester lisibles : sans ce marqueur, la mise à jour de l'app
--     rendrait illisible l'historique de tous les comptes déjà créés.
-- 1 = XSalsa20-Poly1305, clé dérivée de la phrase de récupération.
-- ----------------------------------------------------------------------------
alter table public.encrypted_payloads
  add column if not exists crypto_version smallint not null default 0;

comment on column public.encrypted_payloads.crypto_version is
  'Format de chiffrement. 0 = clair (avant chiffrement), 1 = XSalsa20-Poly1305.';

-- ----------------------------------------------------------------------------
-- 2. Empreinte de la clé de l'utilisateur
--
-- Six caractères issus d'un hachage de la clé. Ils servent à DEUX choses, et
-- à rien d'autre :
--   - savoir si le compte a déjà activé le chiffrement, pour ne pas reproposer
--     la création d'une phrase à quelqu'un qui en a une ;
--   - vérifier qu'une phrase ressaisie sur un nouvel appareil est la bonne
--     AVANT de tenter de déchiffrer, et donc pouvoir dire « cette phrase ne
--     correspond pas à ce compte » au lieu de « données illisibles ».
--
-- Ce n'est PAS un secret et ça n'affaiblit pas la clé : 48 bits d'empreinte
-- pour une clé de 256 bits ne permettent aucune reconstitution. Mais ce n'est
-- pas non plus une preuve d'identité — seulement un garde-fou d'ergonomie.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists vault_fingerprint text;

comment on column public.profiles.vault_fingerprint is
  'Empreinte courte de la cle de chiffrement. Detecte le chiffrement actif et valide une phrase ressaisie. Non secret, non suffisant pour reconstituer la cle.';

-- ----------------------------------------------------------------------------
-- 3. L'empreinte ne doit pas etre modifiable par autrui
--
-- Les policies de `profiles` autorisent deja chacun a modifier SA ligne. On
-- verifie seulement que l'empreinte garde une forme attendue : une valeur
-- fantaisiste ferait echouer la validation de phrase de facon incomprehensible.
-- ----------------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_vault_fingerprint_format;

alter table public.profiles
  add constraint profiles_vault_fingerprint_format
  check (vault_fingerprint is null or vault_fingerprint ~ '^[0-9A-F]{6}$');

-- ----------------------------------------------------------------------------
-- 4. Verification
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'encrypted_payloads'
      and column_name = 'crypto_version'
  ) then
    raise exception 'crypto_version absente : la migration a echoue';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'vault_fingerprint'
  ) then
    raise exception 'vault_fingerprint absente : la migration a echoue';
  end if;

  raise notice 'Migration 016 appliquee. Les donnees existantes restent en crypto_version 0 (clair) et seront chiffrees a leur prochaine ecriture.';
end $$;
