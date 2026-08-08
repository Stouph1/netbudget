-- ============================================================================
-- INVITATIONS AUX ESPACES : PLUS BESOIN D'E-MAIL
--
-- Supabase → SQL Editor → New query → colle TOUT → Run. Rien à modifier.
-- Remplace les scripts 011/013 sur ce point : à lancer même si tu les as déjà
-- passés (le script est idempotent).
--
-- POURQUOI CE CHANGEMENT
-- L'ancien mécanisme exigeait que l'invité rejoigne avec le MÊME e-mail que
-- celui saisi par l'inviteur. En pratique c'était ingérable : connexion Apple
-- avec e-mail masqué, adresse Google différente de celle tapée, faute de
-- frappe… et l'invitation échouait sans que personne comprenne pourquoi.
--
-- NOUVEAU MODÈLE : un code d'invitation suffit.
-- La sécurité ne repose plus sur l'e-mail mais sur le CODE lui-même :
--   - 256 bits d'entropie (expo-crypto) : non devinable, non énumérable ;
--   - à usage UNIQUE : consommé dès qu'il est accepté ;
--   - expiration à 14 jours ;
--   - révocable à tout moment par l'inviteur.
-- C'est le modèle des liens d'invitation de Notion, Figma ou Slack.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. L'e-mail devient FACULTATIF (simple mémo pour l'inviteur : « à qui ai-je
--    envoyé ce code ? »). Il ne conditionne plus l'acceptation.
-- ----------------------------------------------------------------------------

alter table public.workspace_invites
  drop constraint if exists invites_email_valid;

alter table public.workspace_invites
  alter column email drop not null;

-- ----------------------------------------------------------------------------
-- 2. La fonction d'acceptation : vérifie le CODE, plus l'e-mail.
-- ----------------------------------------------------------------------------

create or replace function public.accept_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.workspace_invites%rowtype;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;

  -- Verrou de ligne : deux personnes ne peuvent pas consommer le même code
  -- en même temps.
  select * into inv
    from public.workspace_invites
   where token = invite_token
     and status = 'pending'
     and expires_at > now()
   for update;

  if not found then
    raise exception 'invalid_invite';
  end if;

  -- Déjà membre ? on ne crée pas de doublon, mais on renvoie l'espace pour que
  -- l'app bascule dessus (comportement attendu quand on reclique un lien).
  insert into public.workspace_members (workspace_id, user_id, role)
       values (inv.workspace_id, uid, 'member')
  on conflict do nothing;

  -- Code consommé : à usage unique, c'est ce qui porte la sécurité.
  update public.workspace_invites
     set status = 'accepted', accepted_at = now(), accepted_by = uid
   where id = inv.id;

  return inv.workspace_id;
end;
$$;

revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Policy de lecture des invitations : l'inviteur voit les siennes.
--    (La correspondance par e-mail n'a plus de sens.)
-- ----------------------------------------------------------------------------

drop policy if exists "invites select inviter or invitee" on public.workspace_invites;
create policy "invites select inviter"
  on public.workspace_invites for select to authenticated
  using (auth.uid() = inviter_id);

-- ----------------------------------------------------------------------------
-- 4. Réactive les invitations qui avaient été annulées par le script 013
--    parce que leur e-mail n'était pas conforme — elles redeviennent
--    utilisables, l'e-mail n'ayant plus d'importance.
-- ----------------------------------------------------------------------------

update public.workspace_invites
   set status = 'pending'
 where status = 'cancelled'
   and accepted_at is null
   and expires_at > now();

notify pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION — doit lister accept_invite et delete_own_account
-- ============================================================================
select
  p.proname as fonction,
  p.prosecdef as security_definer,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('accept_invite', 'delete_own_account')
order by p.proname;
