-- NETbudget Premium — schema initial (Phase 0)
-- À appliquer dans Supabase Dashboard → SQL Editor → New query → coller → Run.
--
-- Tables :
--   1. profiles            — extension de auth.users avec données app
--   2. subscriptions       — état d'abonnement Premium (Apple IAP / Google Play)
--   3. encrypted_payloads  — blobs E2E chiffrés (Premium data)
--
-- RLS activée partout. Les writes sur subscriptions sont réservés au service_role
-- (Edge Functions qui valident les receipts Apple/Google).

-- ============================================================================
-- Trigger utilitaire : auto-update du champ updated_at
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 1. profiles (extends auth.users)
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  family_situation text check (family_situation in ('seul', 'couple', 'famille')),
  default_currency text not null default 'EUR',
  default_country text not null default 'FR',
  default_language text not null default 'fr',
  tithe_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. subscriptions (Premium IAP state)
-- ============================================================================

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('apple', 'google', 'stripe')),
  product_id text not null,
  status text not null check (status in ('trial', 'active', 'expired', 'cancelled', 'in_grace', 'paused')),
  expires_at timestamptz,
  trial_ends_at timestamptz,
  original_transaction_id text,
  latest_receipt text,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, original_transaction_id)
);

alter table public.subscriptions enable row level security;

-- Lecture : user lit ses propres abonnements (pour gating client-side)
create policy "subscriptions select own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Writes : RIEN côté client. Tout passe par Edge Functions (service_role)
-- qui valident les receipts Apple/Google avant insert/update.

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create index subscriptions_user_status_idx
  on public.subscriptions (user_id, status);

-- ============================================================================
-- 3. encrypted_payloads (E2E encrypted budget data)
-- ============================================================================

-- Stocke uniquement des blobs chiffrés côté client. Supabase ne peut PAS lire
-- le contenu (libsodium XChaCha20-Poly1305 + clé privée user dans Keychain).
-- Sync MVP : last-write-wins par (user_id, payload_key).

create table public.encrypted_payloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload_key text not null,   -- ex: "budget", "objectives", "credits"
  ciphertext bytea not null,
  nonce bytea not null,
  device_id text,              -- pour conflict resolution multi-device
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, payload_key)
);

alter table public.encrypted_payloads enable row level security;

create policy "payloads all own"
  on public.encrypted_payloads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger encrypted_payloads_set_updated_at
  before update on public.encrypted_payloads
  for each row execute function public.set_updated_at();

create index encrypted_payloads_user_idx
  on public.encrypted_payloads (user_id);
