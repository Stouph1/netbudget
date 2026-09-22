-- 023 — La clé de l'espace est remise À L'ACCEPTATION de l'invitation.
--
-- Constat sur deux téléphones : l'invité rejoignait bien l'espace, mais ne
-- pouvait ensuite ni lire ni écrire son budget. Il travaillait en local, sans
-- message, pendant que le propriétaire voyait 0 €.
--
-- Cause : la clé de l'espace voyage dans l'invitation (sealed_key), et le
-- client la relisait APRÈS accept_invite() par un SELECT sur
-- workspace_invites. Or la policy de lecture n'autorise que l'inviteur ou une
-- correspondance d'e-mail — et les invitations n'ont plus d'e-mail. Le SELECT
-- rendait zéro ligne, le client se taisait.
--
-- Correctif : accept_invite() (SECURITY DEFINER, donc hors RLS) renvoie
-- désormais la clé scellée avec l'identifiant de l'espace. Plus aucune lecture
-- de la table côté client n'est nécessaire. Par sécurité, l'invité qui a
-- accepté garde aussi le droit de relire SA ligne, pour une reprise.
--
-- À appliquer dans Supabase → SQL Editor → coller → Run.

-- Le type de retour change : Postgres exige de supprimer l'ancienne fonction.
drop function if exists public.accept_invite(text);

create or replace function public.accept_invite(invite_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
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

  -- Message uniforme : ne pas révéler si le code existe mais vise un autre
  -- e-mail (sinon la fonction devient un oracle de validité de code).
  -- Une invitation sans e-mail est ouverte à qui détient le code : c'est le
  -- mode courant (256 bits, usage unique, 14 jours).
  if not found
     or (inv.email is not null and (uemail = '' or lower(inv.email) <> uemail)) then
    raise exception 'invalid_invite';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
    values (inv.workspace_id, uid, 'member')
    on conflict do nothing;

  update public.workspace_invites
     set status = 'accepted', accepted_at = now(), accepted_by = uid
   where id = inv.id;

  return jsonb_build_object(
    'workspace_id', inv.workspace_id,
    'sealed_key', inv.sealed_key,
    'sealed_nonce', inv.sealed_nonce
  );
end $$;

revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- L'invité qui a accepté peut relire sa propre invitation (reprise de la clé
-- si le coffre personnel n'était pas encore ouvert au moment d'accepter).
drop policy if exists "invites select accepted by me" on public.workspace_invites;
create policy "invites select accepted by me"
  on public.workspace_invites for select to authenticated
  using (accepted_by = auth.uid());
