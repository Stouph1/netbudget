-- 022 — La formule se partage vraiment.
--
-- CE QUI NE MARCHAIT PAS. `my_tier()` ne regardait que les abonnements de
-- l'appelant. Un abonné Famille invitait son conjoint ; celui-ci arrivait dans
-- l'espace avec le palier « free » : pas de Coach, un seul objectif, aucun
-- anniversaire, et pas le droit de créer un objectif dans l'espace commun. La
-- formule était vendue « à 6 » et vécue à un.
--
-- LA RÈGLE. Un membre d'un espace hérite du palier du propriétaire de cet
-- espace. On garde le plus généreux entre ses propres abonnements et ceux des
-- propriétaires qui l'ont invité. C'est le sens du mot « partagé » sur la page
-- des formules, et c'est ce que le client affiche déjà (voir planFeatures).
--
-- LIMITES ASSUMÉES. L'héritage n'est pas transitif : le membre hérite du
-- propriétaire, pas des autres membres. Il tombe le jour où le propriétaire
-- résilie ou retire le membre — sans tâche de nettoyage, puisque la fonction
-- relit tout à chaque appel.

create or replace function public.my_tier()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  with active as (
    -- Abonnements valides : les miens, et ceux des propriétaires des espaces
    -- où je suis membre.
    select s.tier
    from public.subscriptions s
    where s.tier is not null
      and s.status in ('trial', 'active', 'in_grace')
      and (s.expires_at is null or s.expires_at > now())
      and (
        s.user_id = auth.uid()
        or s.user_id in (
          select w.owner_id
          from public.workspace_members m
          join public.workspaces w on w.id = m.workspace_id
          where m.user_id = auth.uid()
        )
      )
  )
  select coalesce(
    (
      select a.tier
      from active a
      order by case a.tier
                 when 'family' then 3
                 when 'duo'    then 2
                 when 'solo'   then 1
                 else 0
               end desc
      limit 1
    ),
    'free'
  );
$$;

revoke all on function public.my_tier() from public, anon;
grant execute on function public.my_tier() to authenticated;

comment on function public.my_tier() is
  'Palier effectif de l''appelant : le plus genereux entre ses abonnements et ceux des proprietaires des espaces dont il est membre. Renvoie free si rien n''est actif.';

do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'my_tier'
  ) then
    raise exception 'my_tier() absente : la migration a echoue';
  end if;
end $$;
