-- ============================================================================
-- MIGRATION 020 — Approbation du contrat de test, à distance
-- ============================================================================
--
-- LE PROBLÈME : la session est 100 % à distance. Un PDF à imprimer, signer et
-- scanner ne revient jamais — et un accord qu'on n'a pas ne protège personne,
-- ni le testeur, ni nous.
--
-- LA RÉPONSE : le testeur lit le contrat DANS l'application et l'approuve. On
-- enregistre son nom, la date, et surtout la VERSION DU TEXTE qu'il a
-- réellement eue sous les yeux.
--
-- POURQUOI LA VERSION EST LE POINT CRITIQUE. Sans elle, éditer une phrase du
-- contrat rendrait rétroactivement fausses toutes les approbations déjà
-- données : on prétendrait que huit personnes ont approuvé un texte qu'elles
-- n'ont jamais lu. Avec elle, chaque approbation reste attachée à ce qui a été
-- montré ce jour-là.
--
-- CE QU'ON N'ENREGISTRE PAS : ni adresse IP, ni identifiant d'appareil, ni
-- géolocalisation. On pourrait, et ça « renforcerait la preuve ». Mais ce
-- serait collecter des données personnelles au-delà du nécessaire pour une
-- charte de bonne conduite — exactement ce qu'on reproche aux autres.

-- ---------------------------------------------------------------------------
-- 1. La table
-- ---------------------------------------------------------------------------

create table if not exists public.tester_consents (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  -- Nom saisi par le testeur. C'est ce qui remplace la signature manuscrite.
  full_name         text not null,
  -- true = approuvé, false = refus explicite de participer.
  accepted          boolean not null,
  -- Version du texte affiché. Voir docs/testeurs/contrat.json.
  contract_version  text not null,
  -- Formule testée au moment de l'approbation, pour retrouver quel document
  -- correspondait.
  tier              text,
  platform          text,
  app_version       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.tester_consents enable row level security;

-- Lecture : chacun voit la sienne, et rien d'autre.
drop policy if exists "tester_consents select own" on public.tester_consents;
create policy "tester_consents select own"
  on public.tester_consents for select
  using (auth.uid() = user_id);

-- AUCUNE policy d'écriture, volontairement. L'enregistrement passe par la
-- fonction ci-dessous : sans ça, n'importe qui pourrait écrire « approuvé » au
-- nom de quelqu'un d'autre, ou modifier après coup la version approuvée.

-- ---------------------------------------------------------------------------
-- 2. Enregistrer l'approbation
-- ---------------------------------------------------------------------------

create or replace function public.record_tester_consent(
  p_full_name        text,
  p_accepted         boolean,
  p_contract_version text,
  p_platform         text default null,
  p_app_version      text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tier text;
begin
  if v_user is null then
    raise exception 'Il faut être connecté.';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Le nom est obligatoire : c''est ce qui remplace la signature.';
  end if;
  if coalesce(trim(p_contract_version), '') = '' then
    raise exception 'Version du contrat manquante.';
  end if;

  select public.my_tier() into v_tier;

  insert into public.tester_consents
    (user_id, full_name, accepted, contract_version, tier, platform, app_version)
  values
    (v_user, trim(p_full_name), p_accepted, trim(p_contract_version),
     v_tier, p_platform, p_app_version)
  on conflict (user_id) do update
    set full_name        = excluded.full_name,
        accepted         = excluded.accepted,
        contract_version = excluded.contract_version,
        tier             = excluded.tier,
        platform         = excluded.platform,
        app_version      = excluded.app_version,
        updated_at       = now();

  -- Un refus retire le statut de testeur : la personne garde un compte normal
  -- et n'est plus sollicitée. Refuser doit être une sortie réelle, pas un
  -- bouton qui repose la question au lancement suivant.
  if not p_accepted then
    update public.profiles set is_tester = false where id = v_user;
  end if;

  return true;
end;
$$;

revoke all on function public.record_tester_consent(text, boolean, text, text, text) from public;
grant execute on function public.record_tester_consent(text, boolean, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Savoir si l'écran doit s'afficher
-- ---------------------------------------------------------------------------
--
-- Renvoie la version approuvée, ou null. L'app compare avec la version du
-- texte qu'elle embarque : si elles diffèrent, le contrat a changé depuis, et
-- il doit être réapprouvé. C'est le seul comportement honnête.

create or replace function public.my_tester_consent()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select contract_version
  from public.tester_consents
  where user_id = auth.uid() and accepted
  limit 1;
$$;

revoke all on function public.my_tester_consent() from public;
grant execute on function public.my_tester_consent() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Suivi de la session — à lire depuis cet éditeur
-- ---------------------------------------------------------------------------
--
-- Qui a approuvé, qui n'a pas encore :
--
--   select u.email, p.is_tester, s.tier, c.full_name, c.accepted, c.created_at
--   from auth.users u
--   left join public.profiles p on p.id = u.id
--   left join public.subscriptions s on s.user_id = u.id and s.platform = 'test'
--   left join public.tester_consents c on c.user_id = u.id
--   where p.is_tester or s.platform = 'test'
--   order by c.created_at nulls first;

-- ---------------------------------------------------------------------------
-- Vérification
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tester_consents'
  ) then
    raise exception 'tester_consents absente : la migration a échoué';
  end if;
  raise notice 'Migration 020 appliquée.';
end $$;

-- Doit montrer UNIQUEMENT des policies SELECT. Une ligne INSERT ou UPDATE ici
-- serait une faille : n'importe qui pourrait s'écrire une approbation.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'tester_consents';
