-- ============================================================================
-- 018 — Abonnements
--
-- À COLLER DANS SUPABASE : SQL Editor → New query → colle TOUT → Run.
--
-- LA RÈGLE QUI JUSTIFIE CETTE MIGRATION : le palier d'abonnement ne doit JAMAIS
-- être décidé par l'application. Un stockage local se modifie en trente
-- secondes ; croire le client sur ce point, c'est offrir la formule Famille à
-- qui sait éditer un fichier.
--
-- C'est donc la boutique qui décide, RevenueCat qui vérifie le reçu, et cette
-- table qui conserve le verdict. L'application ne fait que LIRE.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Le palier de chaque utilisateur
-- ----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id      uuid primary key references auth.users(id) on delete cascade,

  -- Palier accordé. Contrainte explicite : une valeur fantaisiste écrite par
  -- erreur donnerait des droits imprévus au lieu d'échouer.
  tier         text not null default 'free'
    check (tier in ('free', 'solo', 'duo', 'family')),

  -- Fin de la période payée. L'accès est accordé jusque-là MÊME après une
  -- résiliation : c'est ce que le client a payé, et le lui retirer avant terme
  -- serait un litige.
  expires_at   timestamptz,

  -- Résiliation demandée mais période en cours. Sert à ne pas relancer
  -- quelqu'un qui vient de partir, et à ne pas le traiter comme un impayé.
  cancelled    boolean not null default false,

  -- Identifiant RevenueCat, pour rapprocher un incident d'un client.
  provider_id  text,
  store        text check (store in ('app_store', 'play_store', 'promotional')),

  updated_at   timestamptz not null default now()
);

comment on table public.subscriptions is
  'Palier d''abonnement, ecrit UNIQUEMENT par le webhook RevenueCat. L''app lit, n''ecrit jamais.';

alter table public.subscriptions enable row level security;

-- ----------------------------------------------------------------------------
-- 2. Lecture seule pour l'utilisateur, aucune écriture
--
-- Il n'y a VOLONTAIREMENT aucune policy INSERT, UPDATE ou DELETE. Sans policy,
-- RLS refuse par défaut : même en appelant l'API directement, personne ne peut
-- s'accorder un palier. Seul le webhook écrit, via la clé de service qui
-- contourne RLS et ne quitte jamais le serveur.
-- ----------------------------------------------------------------------------
drop policy if exists "subs select own" on public.subscriptions;
create policy "subs select own"
  on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Le palier effectif, calculé côté serveur
--
-- Pourquoi une fonction plutôt qu'une lecture directe de la colonne : un
-- abonnement expiré doit rendre 'free' sans qu'on ait besoin d'une tâche
-- planifiée pour nettoyer la table. La date fait foi à la lecture, ce qui évite
-- une classe entière de bugs — celle où un abonnement reste actif parce qu'un
-- traitement nocturne a échoué.
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
        -- Pas de date de fin : abonnement perpétuel (code promotionnel).
        and (s.expires_at is null or s.expires_at > now())
      limit 1
    ),
    'free'
  );
$$;

revoke all on function public.my_tier() from public, anon;
grant execute on function public.my_tier() to authenticated;

comment on function public.my_tier() is
  'Palier effectif de l''appelant. Renvoie free si l''abonnement a expire, sans dependre d''une tache de nettoyage.';

-- ----------------------------------------------------------------------------
-- 4. Trace des événements reçus
--
-- POURQUOI GARDER CETTE TRACE. Les webhooks arrivent en double, dans le
-- désordre, et parfois en retard de plusieurs heures. Sans journal, un
-- « pourquoi ce client n'a-t-il pas son abonnement » est impossible à instruire.
-- Et l'identifiant d'événement rend le traitement IDEMPOTENT : rejouer deux
-- fois le même message ne double pas une période.
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
-- Aucune policy : ce journal n'est lisible que par le serveur.

create index if not exists subscription_events_user_idx
  on public.subscription_events (user_id, received_at desc);

notify pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'subscriptions'
  ) then
    raise exception 'subscriptions absente : la migration a echoue';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'my_tier'
  ) then
    raise exception 'my_tier() absente : la migration a echoue';
  end if;

  raise notice 'Migration 018 appliquee. Tous les comptes sont en free jusqu''a ce que le webhook ecrive.';
end $$;

-- Doit montrer UNE seule policy, en SELECT : aucune ecriture possible cote client.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'subscriptions';
