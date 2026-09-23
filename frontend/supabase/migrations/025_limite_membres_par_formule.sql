-- 025 — La taille d'un espace suit la formule de son propriétaire.
--
-- Duo promet « à deux », Famille « jusqu'à six ». Jusqu'ici rien ne
-- l'empêchait côté serveur : un code d'invitation était accepté quel que soit
-- le nombre de membres, et le client ne comptait pas non plus. Une formule
-- Duo pouvait donc réunir six personnes.
--
-- La limite est appliquée à l'acceptation, dans accept_invite() : c'est le
-- seul chemin d'entrée dans workspace_members. Elle se lit sur le palier du
-- PROPRIÉTAIRE (c'est sa formule qui est partagée), via la même logique que
-- my_tier() (022) mais pour un identifiant donné.
--
-- À appliquer dans Supabase → SQL Editor → coller → Run.

-- Palier d'un utilisateur donné : ses propres abonnements valides, avec les
-- mêmes statuts que my_tier() (022).
create or replace function public.tier_of(uid uuid)
returns text language sql security definer stable set search_path = '' as $$
  select coalesce(
    (select s.tier from public.subscriptions s
      where s.user_id = uid
        and s.tier is not null
        and s.status in ('trial', 'active', 'in_grace')
        and (s.expires_at is null or s.expires_at > now())
      order by case s.tier when 'family' then 3 when 'duo' then 2 when 'solo' then 1 else 0 end desc
      limit 1),
    'free');
$$;
revoke all on function public.tier_of(uuid) from public, anon;

create or replace function public.members_limit_for(tier text)
returns integer language sql immutable as $$
  select case tier when 'family' then 6 when 'duo' then 2 else 0 end;
$$;

drop function if exists public.accept_invite(text);

create or replace function public.accept_invite(invite_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  inv public.workspace_invites%rowtype;
  uid uuid := auth.uid();
  uemail text := lower(coalesce(auth.jwt() ->> 'email', ''));
  owner uuid;
  n_members integer;
  max_members integer;
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;

  select * into inv from public.workspace_invites
   where token = invite_token
     and status = 'pending'
     and expires_at > now()
   for update;

  if not found
     or (inv.email is not null and (uemail = '' or lower(inv.email) <> uemail)) then
    raise exception 'invalid_invite';
  end if;

  -- Déjà membre : rien à compter, on rend simplement la clé.
  if not exists (select 1 from public.workspace_members
                  where workspace_id = inv.workspace_id and user_id = uid) then
    select owner_id into owner from public.workspaces where id = inv.workspace_id;
    select count(*) into n_members from public.workspace_members
     where workspace_id = inv.workspace_id;
    -- Un testeur (profiles.is_tester) peut forcer sa formule dans l'app sans
    -- abonnement en base : on lui laisse la limite la plus large.
    if coalesce((select is_tester from public.profiles where id = owner), false) then
      max_members := public.members_limit_for('family');
    else
      max_members := public.members_limit_for(public.tier_of(owner));
    end if;
    if n_members >= max_members then
      raise exception 'workspace_full';
    end if;
    insert into public.workspace_members (workspace_id, user_id, role)
      values (inv.workspace_id, uid, 'member');
  end if;

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
