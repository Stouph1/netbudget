-- NETbudget Premium — Workspaces partagés (couple / famille)
-- À appliquer dans Supabase Dashboard → SQL Editor → New query → coller → Run.
--
-- Concept : chaque user Premium peut :
--   - Garder son compte perso (workspace_id = NULL sur encrypted_payloads)
--   - Créer 1+ workspaces partagés (couple, famille, coloc)
--   - Inviter d'autres users par email → ils rejoignent le workspace
--
-- Storage : encrypted_payloads gagne une colonne workspace_id optionnelle.
-- NULL = compte perso, uuid = workspace partagé.
--
-- E2E (Phase 5) : la clé de chiffrement du workspace sera partagée via
-- key exchange à l'acceptation d'invite (User A chiffre workspace_key avec
-- la clé publique de User B). Pour Phase 3, encryption stub = plain JSON.

-- ============================================================================
-- 1. workspaces (containers de partage)
-- ============================================================================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,                     -- "Famille Pizeuil", "Coloc Rue de Lyon"
  kind text not null default 'family'
    check (kind in ('couple', 'family', 'coloc', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

-- Un user peut voir les workspaces où il est membre
create policy "workspaces select member"
  on public.workspaces for select
  using (
    id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- Seul l'owner peut créer un workspace
create policy "workspaces insert owner"
  on public.workspaces for insert
  with check (auth.uid() = owner_id);

-- Seul l'owner peut update (renommer, etc.)
create policy "workspaces update owner"
  on public.workspaces for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Seul l'owner peut supprimer (cascade sur members et payloads)
create policy "workspaces delete owner"
  on public.workspaces for delete
  using (auth.uid() = owner_id);

-- ============================================================================
-- 2. workspace_members (qui appartient à quel workspace)
-- ============================================================================

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

-- Un user voit les memberships des workspaces où il est lui-même membre
create policy "members select if in workspace"
  on public.workspace_members for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- Insert géré via fonction (accepter une invite) — pas d'insert direct client.
-- Delete : owner peut retirer n'importe qui, ou un user peut se retirer lui-même
create policy "members delete self or by owner"
  on public.workspace_members for delete
  using (
    user_id = auth.uid()
    OR workspace_id in (
      select id from public.workspaces where owner_id = auth.uid()
    )
  );

-- Auto-ajoute l'owner comme member à la création du workspace
create or replace function public.handle_new_workspace()
returns trigger as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- ============================================================================
-- 3. workspace_invites (invitations par email)
-- ============================================================================

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  email text not null,                     -- email invité (peut être normalisé lowercase)
  token text not null unique,              -- lien d'invitation opaque (32+ chars random)
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);

alter table public.workspace_invites enable row level security;

-- Inviter voit ses propres invitations envoyées
-- Invité (via email) voit les invitations où son email matche
create policy "invites select own"
  on public.workspace_invites for select
  using (
    auth.uid() = inviter_id
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Owner du workspace peut créer une invitation
create policy "invites insert if workspace member"
  on public.workspace_invites for insert
  with check (
    auth.uid() = inviter_id
    AND workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Inviter peut cancel son invite; invité peut accept
create policy "invites update inviter or invitee"
  on public.workspace_invites for update
  using (
    auth.uid() = inviter_id
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create index if not exists workspace_invites_token_idx
  on public.workspace_invites(token);
create index if not exists workspace_invites_email_status_idx
  on public.workspace_invites(lower(email), status);

-- ============================================================================
-- 4. encrypted_payloads : ajout de workspace_id optionnel
-- ============================================================================

-- Nouvelle colonne workspace_id : NULL = perso, uuid = workspace partagé
alter table public.encrypted_payloads
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- Nouvel index pour lookup par workspace
create index if not exists encrypted_payloads_workspace_key_idx
  on public.encrypted_payloads (workspace_id, payload_key)
  where workspace_id is not null;

-- Suppression de l'ancienne unique constraint (user_id, payload_key)
-- pour permettre un même payload_key sur perso ET plusieurs workspaces
alter table public.encrypted_payloads
  drop constraint if exists encrypted_payloads_user_id_payload_key_key;

-- Nouvelle unique constraint : par workspace (null = perso donc unique par user_id)
create unique index if not exists encrypted_payloads_scope_key_idx
  on public.encrypted_payloads (
    user_id,
    coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid),
    payload_key
  );

-- Mise à jour de la policy RLS pour couvrir workspace_id
drop policy if exists "payloads all own" on public.encrypted_payloads;

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

-- ============================================================================
-- 5. Trigger auto-update updated_at sur workspaces
-- ============================================================================

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();
