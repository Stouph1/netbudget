-- ============================================================================
-- RÉPARE « Could not find the function public.accept_invite »
--
-- Supabase → SQL Editor → New query → colle TOUT → Run. Rien à modifier.
--
-- Pourquoi l'erreur : dans le script 011, la contrainte de format d'e-mail sur
-- les invitations était placée AVANT la création de la fonction. Si une
-- invitation déjà en base avait un e-mail non conforme, l'ALTER échouait, tout
-- le bloc était annulé, et accept_invite n'était jamais créée.
--
-- Ce script fait les choses dans le bon ordre et ne casse rien s'il est
-- relancé plusieurs fois.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LA FONCTION D'ABORD — c'est elle qui débloque « Rejoindre un espace ».
--
-- workspace_members n'a volontairement AUCUNE policy INSERT : ouvrir l'insert
-- au rôle authenticated permettrait à n'importe qui de s'ajouter à un espace
-- dont il connaît l'identifiant. Tout passe donc par cette fonction, qui
-- vérifie côté SERVEUR le jeton, le statut, l'expiration et l'e-mail.
-- ----------------------------------------------------------------------------

create or replace function public.accept_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv    public.workspace_invites%rowtype;
  uid    uuid := auth.uid();
  uemail text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;

  select * into inv
    from public.workspace_invites
   where token = invite_token
     and status = 'pending'
     and expires_at > now()
   for update;

  -- Message uniforme : ne jamais révéler si le jeton existe mais vise un autre
  -- e-mail, sinon la fonction devient un oracle de validité de jeton.
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
end;
$$;

revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. La vue des profils co-membres (colonnes réduites), au cas où le script
--    011 se serait arrêté avant elle.
-- ----------------------------------------------------------------------------

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
-- 3. La contrainte d'e-mail EN DERNIER, et sans casser l'existant.
--
--    On nettoie d'abord les invitations à e-mail invalide (elles étaient de
--    toute façon inutilisables : une invitation à e-mail vide matchait
--    n'importe quel compte sans claim e-mail). Puis on pose la contrainte.
-- ----------------------------------------------------------------------------

update public.workspace_invites
   set status = 'cancelled'
 where status = 'pending'
   and email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$';

alter table public.workspace_invites
  drop constraint if exists invites_email_valid;

-- NOT VALID : la contrainte s'applique aux nouvelles lignes sans exiger que
-- tout l'historique soit conforme — l'ALTER ne peut donc plus échouer.
alter table public.workspace_invites
  add constraint invites_email_valid
  check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  not valid;

-- ----------------------------------------------------------------------------
-- 4. Rechargement du cache de schéma PostgREST (sinon l'app continue de dire
--    « function not found » même après création).
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION — doit renvoyer UNE ligne avec security_definer = true
-- ============================================================================
select
  p.proname                   as fonction,
  p.prosecdef                 as security_definer,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('accept_invite', 'delete_own_account')
order by p.proname;
