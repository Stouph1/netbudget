-- ============================================================================
-- 011 — Durcissement sécurité (audit 2026-08-07)
--
-- Corrige 5 failles confirmées :
--  1. encrypted_payloads : la policy FOR ALL laissait un simple membre changer
--     le scope d'un payload partagé (workspace_id → null, user_id → soi) et
--     donc VOLER le budget familial ; le DELETE était ouvert à tout membre.
--  2. workspace_invites : UPDATE sans WITH CHECK → un invité pouvait
--     ressusciter une invitation annulée ou repousser son expiration.
--  3. profiles : la policy co-membres exposait TOUTES les colonnes
--     (nom, date de naissance, ville, statut pro, dîme = donnée sensible
--     art. 9 RGPD). Remplacée par une vue à colonnes réduites.
--  4. accept_invite : l'acceptation d'invitation était validée côté CLIENT
--     uniquement. RPC SECURITY DEFINER qui valide token/statut/expiration/
--     email en base — sans jamais ouvrir INSERT sur workspace_members.
--  5. Storage avatars : bucket sans limite de taille ni type MIME, et
--     listing ouvert à anon (énumération de tous les user_id).
--
-- Toutes les policies sont explicitement scopées `to authenticated` : sur les
-- branches appelant une fonction révoquée à public, anon recevait un 500
-- (fuite d'information) au lieu d'un résultat vide.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. encrypted_payloads : 4 policies distinctes + gel du scope
-- ----------------------------------------------------------------------------

drop policy if exists "payloads all own or workspace member" on public.encrypted_payloads;

create policy "payloads select"
  on public.encrypted_payloads for select to authenticated
  using (
    (workspace_id is null and user_id = auth.uid())
    OR (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

-- INSERT : on ne peut créer QUE pour soi (empêche d'attribuer un payload
-- à un autre utilisateur et de polluer l'index unique).
create policy "payloads insert"
  on public.encrypted_payloads for insert to authenticated
  with check (
    user_id = auth.uid()
    and (workspace_id is null or public.is_workspace_member(workspace_id))
  );

create policy "payloads update"
  on public.encrypted_payloads for update to authenticated
  using (
    (workspace_id is null and user_id = auth.uid())
    OR (workspace_id is not null and public.is_workspace_member(workspace_id))
  )
  with check (
    (workspace_id is null and user_id = auth.uid())
    OR (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

-- DELETE d'un payload partagé : réservé aux admins/owner du workspace.
create policy "payloads delete"
  on public.encrypted_payloads for delete to authenticated
  using (
    (workspace_id is null and user_id = auth.uid())
    OR (workspace_id is not null and public.is_workspace_admin(workspace_id))
  );

-- Le scope d'un payload est immuable : un UPDATE ne peut pas le déplacer
-- d'un workspace vers le perso (ni changer de propriétaire).
create or replace function public.freeze_payload_scope()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id <> old.user_id
     or new.workspace_id is distinct from old.workspace_id then
    raise exception 'payload: scope immuable';
  end if;
  return new;
end $$;

drop trigger if exists encrypted_payloads_freeze on public.encrypted_payloads;
create trigger encrypted_payloads_freeze
  before update on public.encrypted_payloads
  for each row execute function public.freeze_payload_scope();

-- ----------------------------------------------------------------------------
-- 2. workspace_invites : annulation par l'inviteur uniquement, colonnes gelées
-- ----------------------------------------------------------------------------

drop policy if exists "invites update inviter or invitee" on public.workspace_invites;

-- L'invité n'a plus besoin d'UPDATE : accept_invite() (SECURITY DEFINER) fait
-- la bascule en 'accepted' côté serveur.
create policy "invites cancel by inviter"
  on public.workspace_invites for update to authenticated
  using (auth.uid() = inviter_id and status = 'pending')
  with check (auth.uid() = inviter_id and status = 'cancelled');

create or replace function public.freeze_invite_cols()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.workspace_id, new.inviter_id, lower(new.email), new.token, new.expires_at)
     is distinct from
     (old.workspace_id, old.inviter_id, lower(old.email), old.token, old.expires_at) then
    raise exception 'invite: colonnes immuables';
  end if;
  return new;
end $$;

drop trigger if exists workspace_invites_freeze on public.workspace_invites;
create trigger workspace_invites_freeze
  before update on public.workspace_invites
  for each row execute function public.freeze_invite_cols();

-- Une invitation à email vide matcherait tout JWT sans claim email
-- (connexion Apple avec relais masqué, connexion par téléphone).
alter table public.workspace_invites
  drop constraint if exists invites_email_valid;
alter table public.workspace_invites
  add constraint invites_email_valid
  check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- SELECT durci : plus de match sur email vide.
drop policy if exists "invites select inviter or invitee" on public.workspace_invites;
create policy "invites select inviter or invitee"
  on public.workspace_invites for select to authenticated
  using (
    auth.uid() = inviter_id
    OR (
      nullif(auth.jwt() ->> 'email', '') is not null
      and lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

-- ----------------------------------------------------------------------------
-- 3. profiles : vue à colonnes réduites pour les co-membres
-- ----------------------------------------------------------------------------

-- La policy row-level exposait toutes les colonnes (dont birthdate, city,
-- tithe_enabled) à quiconque partage un workspace.
drop policy if exists "profiles select workspace comembers" on public.profiles;

drop view if exists public.member_profiles;
create view public.member_profiles
  with (security_barrier = true) as
  select id, username, avatar_url, first_name
    from public.profiles
   where public.shares_workspace_with(id);

revoke all on public.member_profiles from public, anon;
grant select on public.member_profiles to authenticated;

-- ----------------------------------------------------------------------------
-- 4. accept_invite : validation SERVEUR de l'invitation
-- ----------------------------------------------------------------------------

-- workspace_members reste sans policy INSERT : l'ajout d'un membre passe
-- EXCLUSIVEMENT par cette fonction, qui vérifie token + statut + expiration
-- + correspondance d'email. Ouvrir INSERT au rôle authenticated permettrait
-- à n'importe qui de s'ajouter à un workspace dont il connaît l'UUID.
create or replace function public.accept_invite(invite_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  inv public.workspace_invites%rowtype;
  uid uuid := auth.uid();
  uemail text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;

  select * into inv from public.workspace_invites
   where token = invite_token
     and status = 'pending'
     and expires_at > now()
   for update;

  -- Message uniforme : ne pas révéler si le token existe mais vise un autre
  -- email (sinon la fonction devient un oracle de validité de token).
  if not found or uemail = '' or lower(inv.email) <> uemail then
    raise exception 'invalid_invite';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
    values (inv.workspace_id, uid, 'member')
    on conflict do nothing;

  update public.workspace_invites
     set status = 'accepted', accepted_at = now(), accepted_by = uid
   where id = inv.id;

  return inv.workspace_id;
end $$;

revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Storage avatars : taille, types MIME, listing authentifié
-- ----------------------------------------------------------------------------

update storage.buckets
   set file_size_limit = 2097152, -- 2 Mo
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'avatars';

-- La lecture des URL publiques ne passe pas par cette policy (bucket public) ;
-- elle ne servait qu'au listing — qui exposait à anon la liste de tous les
-- user_id (les dossiers portent l'UUID).
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars read"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

-- ----------------------------------------------------------------------------
-- 6. Défense en profondeur : search_path des fonctions
-- ----------------------------------------------------------------------------

alter function public.set_updated_at() set search_path = '';

-- ----------------------------------------------------------------------------
-- Rechargement du cache de schéma PostgREST
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
