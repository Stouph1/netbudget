-- ============================================================================
-- 031 — « Ta formule » : formule propre ou partagée, et nombre d'espaces.
--
-- À COLLER DANS SUPABASE : SQL Editor → New query → colle TOUT → Run.
-- Rejouable sans risque.
--
-- POURQUOI. `my_tier()` renvoie le palier le plus généreux entre le sien et
-- celui des propriétaires des espaces dont on est membre (022). C'est juste
-- pour OUVRIR les fonctions, mais l'app ne savait pas d'où venait ce palier :
--   - l'écran des formules présentait l'invité comme abonné (« Formule
--     actuelle », « Gérer l'abonnement ») alors qu'il ne paie rien ;
--   - s'il achetait une formule inférieure, il payait pour rien ;
--   - il pouvait créer un espace que personne ne pouvait rejoindre, puisque
--     `accept_invite` compte les places sur le palier PROPRE du propriétaire.
--
-- Et le nombre d'espaces promis (1 en Duo, 3 en Famille) n'était appliqué
-- nulle part.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. my_plan() : ce que l'écran « Ta formule » doit savoir
--
-- `own_*`    : l'abonnement que J'AI payé (le plus généreux s'il y en a deux).
-- `shared_*` : la formule d'un propriétaire d'espace dont je suis membre, quand
--              elle est plus généreuse que la mienne. Son prénom, pour dire
--              « la formule Famille de Marie » — les membres d'un espace se
--              voient déjà entre eux.
-- ----------------------------------------------------------------------------
create or replace function public.my_plan()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  with rank_of(tier, r) as (
    values ('family', 3), ('duo', 2), ('solo', 1)
  ),
  own as (
    select s.tier, s.status, s.expires_at, s.product_id, s.platform
    from public.subscriptions s
    join rank_of k on k.tier = s.tier
    where s.user_id = auth.uid()
      and s.status in ('trial', 'active', 'in_grace')
      and (s.expires_at is null or s.expires_at > now())
    order by k.r desc, s.expires_at desc nulls first
    limit 1
  ),
  shared as (
    select s.tier, p.first_name
    from public.workspace_members m
    join public.workspaces w on w.id = m.workspace_id
    join public.subscriptions s on s.user_id = w.owner_id
    join rank_of k on k.tier = s.tier
    left join public.profiles p on p.id = w.owner_id
    where m.user_id = auth.uid()
      and w.owner_id <> auth.uid()
      and s.status in ('trial', 'active', 'in_grace')
      and (s.expires_at is null or s.expires_at > now())
    order by k.r desc
    limit 1
  )
  select jsonb_build_object(
    'own_tier',       coalesce((select tier from own), 'free'),
    'own_status',     (select status from own),
    'own_expires_at', (select expires_at from own),
    'own_product_id', (select product_id from own),
    'own_platform',   (select platform from own),
    'shared_tier',    (select tier from shared),
    'shared_by',      (select first_name from shared)
  );
$$;

revoke all on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;

comment on function public.my_plan() is
  'Formule propre de l''appelant (palier, statut, echeance, produit) et formule partagee la plus genereuse d''un proprietaire d''espace dont il est membre.';

-- ----------------------------------------------------------------------------
-- 2. Nombre d'espaces qu'on peut CRÉER, sur sa formule PROPRE
--
-- Les mêmes nombres que `maxWorkspaces` dans entitlements.ts. La formule
-- partagée ne compte pas : un invité ne peut pas inviter à son tour sur la
-- formule de quelqu'un d'autre (comme sur les offres Famille des services de
-- musique). Les testeurs gardent les mains libres, comme dans accept_invite.
-- ----------------------------------------------------------------------------
create or replace function public.workspaces_limit_for(tier text)
returns integer language sql immutable as $$
  select case tier when 'family' then 3 when 'duo' then 1 else 0 end;
$$;

create or replace function public.enforce_workspace_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if coalesce((select is_tester from public.profiles where id = new.owner_id), false) then
    return new;
  end if;
  select count(*) into n from public.workspaces where owner_id = new.owner_id;
  if n >= public.workspaces_limit_for(public.tier_of(new.owner_id)) then
    raise exception 'workspace_limit';
  end if;
  return new;
end $$;

drop trigger if exists workspaces_quota on public.workspaces;
create trigger workspaces_quota
  before insert on public.workspaces
  for each row execute function public.enforce_workspace_quota();

notify pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION : ta propre formule, telle que l'app la verra.
-- ============================================================================
select public.my_plan() as ma_formule;
