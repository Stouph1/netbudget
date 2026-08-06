-- NETbudget Premium — Workspaces partagés (couple / famille)
-- À appliquer dans Supabase Dashboard → SQL Editor → New query → coller → Run.

-- ============================================================================
-- ÉTAPE 1 : Créer TOUTES les tables (avant les policies qui les référencent)
-- ============================================================================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'family'
    check (kind in ('couple', 'family', 'coloc', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  token text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);

-- ============================================================================
-- ÉTAPE 2 : Modifier encrypted_payloads (avant les policies)
-- ============================================================================

alter table public.encrypted_payloads
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- Suppression de l'ancienne unique constraint (user_id, payload_key)
alter table public.encrypted_payloads
  drop constraint if exists encrypted_payloads_user_id_payload_key_key;

-- Nouvelle unique constraint via index (coalesce pour gérer NULL/uuid)
create unique index if not exists encrypted_payloads_scope_key_idx
  on public.encrypted_payloads (
    user_id,
    coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid),
    payload_key
  );

-- Index pour lookup par workspace
create index if not exists encrypted_payloads_workspace_key_idx
  on public.encrypted_payloads (workspace_id, payload_key)
  where workspace_id is not null;

-- ============================================================================
-- ÉTAPE 3 : Enable RLS sur toutes les tables
-- ============================================================================

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;

-- ============================================================================
-- ÉTAPE 4 : Policies (maintenant que TOUTES les tables existent)
-- ============================================================================

-- --- Workspaces ---
drop policy if exists "workspaces select member" on public.workspaces;
create policy "workspaces select member"
  on public.workspaces for select
  using (
    id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "workspaces insert owner" on public.workspaces;
create policy "workspaces insert owner"
  on public.workspaces for insert
  with check (auth.uid() = owner_id);

drop policy if exists "workspaces update owner" on public.workspaces;
create policy "workspaces update owner"
  on public.workspaces for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "workspaces delete owner" on public.workspaces;
create policy "workspaces delete owner"
  on public.workspaces for delete
  using (auth.uid() = owner_id);

-- --- workspace_members ---
drop policy if exists "members select if in workspace" on public.workspace_members;
create policy "members select if in workspace"
  on public.workspace_members for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "members delete self or by owner" on public.workspace_members;
create policy "members delete self or by owner"
  on public.workspace_members for delete
  using (
    user_id = auth.uid()
    OR workspace_id in (
      select id from public.workspaces where owner_id = auth.uid()
    )
  );

-- --- workspace_invites ---
drop policy if exists "invites select own" on public.workspace_invites;
create policy "invites select own"
  on public.workspace_invites for select
  using (
    auth.uid() = inviter_id
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "invites insert if workspace member" on public.workspace_invites;
create policy "invites insert if workspace member"
  on public.workspace_invites for insert
  with check (
    auth.uid() = inviter_id
    AND workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

drop policy if exists "invites update inviter or invitee" on public.workspace_invites;
create policy "invites update inviter or invitee"
  on public.workspace_invites for update
  using (
    auth.uid() = inviter_id
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- --- encrypted_payloads : nouvelle policy avec workspace scope ---
drop policy if exists "payloads all own" on public.encrypted_payloads;
drop policy if exists "payloads all own or workspace member" on public.encrypted_payloads;
create policy "payloads all own or workspace member"
  on public.encrypted_payloads for all
  using (
    (workspace_id is null and auth.uid() = user_id)
    OR
    (workspace_id is not null and workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    ))
  )
  with check (
    (workspace_id is null and auth.uid() = user_id)
    OR
    (workspace_id is not null and workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    ))
  );

-- --- Index invites ---
create index if not exists workspace_invites_token_idx
  on public.workspace_invites(token);
create index if not exists workspace_invites_email_status_idx
  on public.workspace_invites(lower(email), status);

-- ============================================================================
-- ÉTAPE 5 : Triggers (auto-ajout owner, updated_at)
-- ============================================================================

-- Auto-ajoute l'owner comme member à la création du workspace
create or replace function public.handle_new_workspace()
returns trigger as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- Auto-update updated_at (utilise la fonction déjà créée en migration 001)
drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();
