-- ============================================================================
-- MIGRATION 019 — Phase de test : marquer les testeurs, leur accorder un palier
-- ============================================================================
--
-- POURQUOI UN DRAPEAU CÔTÉ SERVEUR et non un réglage dans l'app : le panneau
-- testeur permet de rejouer des fêtes et de forcer des états. Laissé au client,
-- il serait activable par n'importe qui. Ici, seul quelqu'un ayant accès à cette
-- base peut désigner un testeur.
--
-- POURQUOI ACCORDER LES PALIERS À LA MAIN. Pendant la phase de test, aucun
-- produit n'existe encore dans les boutiques : un testeur « Famille » ne peut
-- pas acheter Famille. On écrit donc directement dans `subscriptions`, la table
-- que `my_tier()` interroge. Le chemin est exactement celui du webhook — on
-- teste donc la vraie mécanique, pas un contournement.
--
-- À REVENIR DESSUS AVANT LA MISE EN VENTE : voir la section 4, tout en bas.

-- ---------------------------------------------------------------------------
-- 1. Le drapeau
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_tester boolean not null default false;

comment on column public.profiles.is_tester is
  'Phase de test uniquement. Ouvre le panneau testeur dans les Réglages.';

-- ---------------------------------------------------------------------------
-- 2. La lecture, côté app
-- ---------------------------------------------------------------------------
--
-- SECURITY DEFINER pour que la fonction lise `profiles` sans dépendre des
-- policies de lecture, mais elle ne renvoie QUE l'état de l'appelant : elle ne
-- permet pas de savoir qui d'autre est testeur.

create or replace function public.am_i_tester()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_tester from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.am_i_tester() from public;
grant execute on function public.am_i_tester() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Accorder un palier à un testeur
-- ---------------------------------------------------------------------------
--
-- À exécuter UNE FOIS PAR TESTEUR, depuis cet éditeur SQL. L'app ne peut pas
-- appeler cette fonction : elle n'est exécutable que par le rôle de service.
--
--   select public.grant_test_tier('adresse@exemple.com', 'family');
--
-- Paliers acceptés : free, solo, duo, family.

-- `platform` n'acceptait pas 'test'. On l'ajoute plutôt que de faire passer un
-- palier de test pour un achat Apple : les lignes de test doivent rester
-- reconnaissables d'un coup d'œil — c'est ce qui permet de toutes les effacer
-- avant la mise en vente (section 4).
alter table public.subscriptions
  drop constraint if exists subscriptions_platform_check;

alter table public.subscriptions
  add constraint subscriptions_platform_check
  check (platform in ('apple', 'google', 'stripe', 'promotional', 'test'));

create or replace function public.grant_test_tier(p_email text, p_tier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if p_tier not in ('free', 'solo', 'duo', 'family') then
    raise exception 'Palier inconnu : %. Attendu free, solo, duo ou family.', p_tier;
  end if;

  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then
    raise exception 'Aucun compte pour %. Le testeur doit s''être inscrit d''abord.', p_email;
  end if;

  update public.profiles set is_tester = true where id = v_user;

  -- Même table et même colonne que celles qu'écrira le webhook : on teste la
  -- vraie mécanique de lecture du palier, pas un chemin de secours.
  --
  -- On EFFACE d'abord la ligne de test précédente au lieu d'un `on conflict` :
  -- la contrainte unique de cette table porte sur (platform,
  -- original_transaction_id), pas sur user_id. Un `on conflict (user_id)`
  -- échouerait, et un simple insert empilerait les paliers — `my_tier()`
  -- retenant le plus élevé, un testeur redescendu de Famille à Solo resterait
  -- en Famille.
  delete from public.subscriptions where user_id = v_user and platform = 'test';

  insert into public.subscriptions
    (user_id, platform, product_id, status, tier, original_transaction_id, updated_at)
  values
    (v_user, 'test', 'netbudget.' || p_tier || '.test', 'active', p_tier,
     'test-' || v_user::text, now());

  return format('%s → %s (testeur)', p_email, p_tier);
end;
$$;

revoke all on function public.grant_test_tier(text, text) from public;
revoke all on function public.grant_test_tier(text, text) from authenticated;

-- ---------------------------------------------------------------------------
-- 4. AVANT LA MISE EN VENTE — à exécuter, pas à oublier
-- ---------------------------------------------------------------------------
--
-- Ces deux lignes retirent les paliers de test et les droits de testeur. Sans
-- elles, huit comptes garderaient un abonnement gratuit à vie et le panneau
-- testeur resterait ouvert chez eux.
--
--   delete from public.subscriptions where platform = 'test';
--   update public.profiles set is_tester = false where is_tester;
--
-- ---------------------------------------------------------------------------
-- Vérification
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_tester'
  ) then
    raise exception 'is_tester absente : la migration a échoué';
  end if;
  raise notice 'Migration 019 appliquée. Accorde un palier avec : select public.grant_test_tier(''email'', ''family'');';
end $$;

select public.am_i_tester() as je_suis_testeur;
