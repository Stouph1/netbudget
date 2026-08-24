-- ============================================================================
-- 018 — Abonnements  (VERSION CORRIGÉE)
--
-- À COLLER DANS SUPABASE : SQL Editor → New query → colle TOUT → Run.
-- Rejouable sans risque, même après la tentative précédente qui a échoué.
--
-- CE QUI N'ALLAIT PAS DANS LA PREMIÈRE VERSION : elle créait une table
-- `subscriptions` avec `create table if not exists`. Or cette table existe
-- DEPUIS LA MIGRATION 001. La création a donc été ignorée en silence, la
-- colonne `tier` n'a jamais été ajoutée, et la fonction qui la lit a échoué.
--
-- C'est le piège de `if not exists` : il protège d'une erreur, mais il masque
-- aussi le fait que la table n'a pas la forme attendue. On ajoute donc des
-- colonnes à la table réelle au lieu d'en inventer une seconde.
--
-- LA RÈGLE INCHANGÉE : le palier d'abonnement n'est JAMAIS décidé par
-- l'application. La boutique encaisse, RevenueCat vérifie le reçu, le serveur
-- écrit, l'app lit.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Le palier, ajouté à la table existante
--
-- La table de la migration 001 porte déjà `platform`, `product_id`, `status`,
-- `expires_at` et l'identifiant de transaction. Il ne manquait que le palier
-- accordé. On pourrait le déduire de `product_id`, mais l'écrire explicitement
-- évite qu'un changement d'identifiant de produit casse les droits de tout le
-- monde.
-- ----------------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists tier text;

alter table public.subscriptions
  drop constraint if exists subscriptions_tier_check;

alter table public.subscriptions
  add constraint subscriptions_tier_check
  check (tier is null or tier in ('solo', 'duo', 'family'));

comment on column public.subscriptions.tier is
  'Palier accorde. NULL sur les lignes anterieures. Ecrit uniquement par le webhook de facturation.';

-- `platform` n'acceptait que apple/google/stripe. Les offres promotionnelles
-- accordées depuis la console du fournisseur n'ont aucune de ces origines.
alter table public.subscriptions
  drop constraint if exists subscriptions_platform_check;

alter table public.subscriptions
  add constraint subscriptions_platform_check
  check (platform in ('apple', 'google', 'stripe', 'promotional'));

-- ----------------------------------------------------------------------------
-- 2. Le palier effectif, calculé côté serveur
--
-- POURQUOI UNE FONCTION et non une simple lecture : un abonnement expiré doit
-- rendre 'free' sans dépendre d'une tâche de nettoyage nocturne — celle qui
-- échoue un soir et laisse des abonnements actifs toute une semaine. La date
-- fait foi au moment de la lecture.
--
-- `in_grace` est traité comme actif : c'est la période pendant laquelle la
-- boutique retente un prélèvement échoué. Couper l'accès à ce moment-là
-- punirait quelqu'un dont la carte vient d'expirer, et qui va probablement
-- payer.
--
-- Quand plusieurs lignes existent — abonnement changé, ou deux plateformes —
-- on garde la PLUS GÉNÉREUSE. Retirer un droit déjà payé serait un litige.
-- ----------------------------------------------------------------------------
create or replace function public.my_tier()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (
      select s.tier
      from public.subscriptions s
      where s.user_id = auth.uid()
        and s.tier is not null
        and s.status in ('trial', 'active', 'in_grace')
        -- Sans date de fin : abonnement perpétuel (offre promotionnelle).
        and (s.expires_at is null or s.expires_at > now())
      order by case s.tier
                 when 'family' then 3
                 when 'duo'    then 2
                 when 'solo'   then 1
                 else 0
               end desc
      limit 1
    ),
    'free'
  );
$$;

revoke all on function public.my_tier() from public, anon;
grant execute on function public.my_tier() to authenticated;

comment on function public.my_tier() is
  'Palier effectif de l''appelant. Renvoie free si expire, sans dependre d''une tache de nettoyage. Garde le palier le plus genereux si plusieurs lignes existent.';

-- ----------------------------------------------------------------------------
-- 3. Aucune écriture depuis le client
--
-- La policy de lecture existe déjà depuis la 001. On vérifie surtout qu'aucune
-- policy d'écriture n'a été ajoutée entre-temps : sans policy, RLS refuse par
-- défaut, et c'est exactement ce qu'on veut. Seul le webhook écrit, avec la clé
-- de service qui ne quitte jamais le serveur.
-- ----------------------------------------------------------------------------
drop policy if exists "subscriptions insert own" on public.subscriptions;
drop policy if exists "subscriptions update own" on public.subscriptions;
drop policy if exists "subscriptions delete own" on public.subscriptions;

-- ----------------------------------------------------------------------------
-- 4. Journal des événements reçus
--
-- POURQUOI LE GARDER. Les webhooks arrivent en double, dans le désordre, et
-- parfois en retard de plusieurs heures. Sans journal, « pourquoi ce client
-- n'a-t-il pas son abonnement » est impossible à instruire. Et l'identifiant
-- d'événement en clé primaire rend le traitement IDEMPOTENT : rejouer deux fois
-- le même message ne prolonge pas une période.
-- ----------------------------------------------------------------------------
create table if not exists public.subscription_events (
  event_id    text primary key,
  user_id     uuid references auth.users(id) on delete set null,
  type        text not null,
  payload     jsonb not null,
  received_at timestamptz not null default now()
);

comment on table public.subscription_events is
  'Journal des webhooks de facturation. event_id en cle primaire : rejouer un message ne double pas une periode.';

alter table public.subscription_events enable row level security;
-- Aucune policy, volontairement : ce journal n'est lisible que par le serveur.

create index if not exists subscription_events_user_idx
  on public.subscription_events (user_id, received_at desc);

notify pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscriptions'
      and column_name = 'tier'
  ) then
    raise exception 'subscriptions.tier absente : la migration a echoue';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'my_tier'
  ) then
    raise exception 'my_tier() absente : la migration a echoue';
  end if;

  raise notice 'Migration 018 appliquee. my_tier() renvoie free pour tout le monde jusqu''a ce que le webhook ecrive.';
end $$;

-- Doit renvoyer 'free' : aucun abonnement n'existe encore.
select public.my_tier() as mon_palier;

-- Doit montrer UNIQUEMENT des policies SELECT. Une ligne INSERT, UPDATE ou
-- DELETE ici serait une faille : n'importe qui s'accorderait la formule Famille.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'subscriptions'
order by cmd;
