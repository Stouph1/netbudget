-- ============================================================================
-- MIGRATION 021 — Pré-inscrire les testeurs, avant qu'ils créent leur compte
-- ============================================================================
--
-- LE PROBLÈME. `grant_test_tier` exige un compte existant, et refuse sinon —
-- à juste titre : on ne peut pas marquer testeur quelqu'un qui n'existe pas.
-- Mais ça impose une séquence pénible et répétée :
--
--   le testeur installe → s'inscrit → prévient → on lance la commande →
--   il ferme l'app → la rouvre
--
-- Cinq testeurs, cinq allers-retours, et autant d'occasions d'oublier
-- quelqu'un — qui testera alors la mauvaise formule sans le savoir, et dont
-- les retours ne voudront rien dire.
--
-- LA RÉPONSE. On pré-inscrit les adresses MAINTENANT. Quand la personne crée
-- son compte, le palier s'applique tout seul. Plus rien à faire, plus rien à
-- oublier.
--
-- POURQUOI ÇA N'OUVRE AUCUNE FAILLE. La liste ne se remplit que depuis cet
-- éditeur : la table n'a aucune policy, donc elle est invisible et
-- inaccessible depuis l'app. Et une adresse pré-inscrite ne donne rien à
-- qui la devine — il faut posséder cette boîte mail pour créer le compte.

-- ---------------------------------------------------------------------------
-- 1. La liste d'attente
-- ---------------------------------------------------------------------------

create table if not exists public.pending_test_tiers (
  -- En minuscules : les adresses arrivent avec des majuscules au hasard, et
  -- « Geordyn@… » ne doit pas rater « geordyn@… ».
  email       text primary key,
  tier        text not null check (tier in ('free', 'solo', 'duo', 'family')),
  created_at  timestamptz not null default now(),
  -- Renseignée quand le palier a réellement été appliqué. Sert à voir d'un
  -- coup d'œil qui s'est inscrit et qui se fait attendre.
  applied_at  timestamptz
);

alter table public.pending_test_tiers enable row level security;

-- AUCUNE policy, volontairement : personne ne lit ni n'écrit cette table
-- depuis l'app. Elle ne vit que pour l'éditeur SQL et le déclencheur
-- ci-dessous, qui est en SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- 2. Pré-inscrire une adresse
-- ---------------------------------------------------------------------------
--
--   select public.pre_grant_test_tier('adresse@exemple.com', 'family');
--
-- Fonctionne AVANT ou APRÈS l'inscription : si le compte existe déjà, le
-- palier est appliqué immédiatement. C'est la seule commande à retenir.

create or replace function public.pre_grant_test_tier(p_email text, p_tier text)
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

  insert into public.pending_test_tiers (email, tier)
  values (lower(trim(p_email)), p_tier)
  on conflict (email) do update
    set tier = excluded.tier, applied_at = null, created_at = now();

  -- Le compte existe déjà : inutile de faire attendre.
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is not null then
    perform public.grant_test_tier(p_email, p_tier);
    update public.pending_test_tiers
      set applied_at = now() where email = lower(trim(p_email));
    return format('%s → %s (appliqué tout de suite)', p_email, p_tier);
  end if;

  return format('%s → %s (en attente de son inscription)', p_email, p_tier);
end;
$$;

revoke all on function public.pre_grant_test_tier(text, text) from public;
revoke all on function public.pre_grant_test_tier(text, text) from authenticated;

-- ---------------------------------------------------------------------------
-- 3. Application automatique à l'inscription
-- ---------------------------------------------------------------------------
--
-- On se greffe sur `handle_new_user`, le déclencheur qui crée déjà le profil à
-- chaque inscription (migration 001). On le REMPLACE en gardant son
-- comportement d'origine : créer le profil reste la première chose qu'il fait,
-- et le palier de test vient après.
--
-- POURQUOI UN BLOC `exception` AUTOUR DU PALIER. Si quoi que ce soit échoue
-- dans cette partie, l'inscription ENTIÈRE serait annulée : le compte ne
-- serait pas créé et la personne verrait une erreur incompréhensible. Un
-- palier de test non appliqué est un désagrément ; une inscription impossible
-- est un mur. On avale donc l'erreur, et la commande manuelle reste
-- disponible en secours.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
begin
  insert into public.profiles (id) values (new.id);

  begin
    select tier into v_tier
    from public.pending_test_tiers
    where email = lower(new.email) and applied_at is null;

    if v_tier is not null then
      update public.profiles set is_tester = true where id = new.id;

      delete from public.subscriptions
        where user_id = new.id and platform = 'test';

      insert into public.subscriptions
        (user_id, platform, product_id, status, tier, original_transaction_id, updated_at)
      values
        (new.id, 'test', 'netbudget.' || v_tier || '.test', 'active', v_tier,
         'test-' || new.id::text, now());

      update public.pending_test_tiers
        set applied_at = now() where email = lower(new.email);
    end if;
  exception when others then
    -- Volontairement silencieux : voir le commentaire ci-dessus. Mieux vaut un
    -- testeur en gratuit qu'un compte impossible à créer.
    null;
  end;

  return new;
end;
$$;

-- Le déclencheur de la migration 001 pointe déjà sur cette fonction : il n'y a
-- rien à recréer, `create or replace function` suffit.

-- ---------------------------------------------------------------------------
-- 4. Pré-inscription des testeurs de la session
-- ---------------------------------------------------------------------------
--
-- Chacune fonctionne que la personne soit inscrite ou non. À lancer une fois.

select public.pre_grant_test_tier('stephane.pizeuil@gmail.com', 'family');
select public.pre_grant_test_tier('geordyngoulou1@gmail.com',   'family');
select public.pre_grant_test_tier('n.jeannia@gmail.com',        'family');
select public.pre_grant_test_tier('mgnitedem@gmail.com',        'family');
select public.pre_grant_test_tier('nzienguen@gmail.com',        'family');

-- ---------------------------------------------------------------------------
-- 5. Suivi — qui s'est inscrit, qui se fait attendre
-- ---------------------------------------------------------------------------

select
  t.email,
  t.tier                                as palier_prevu,
  (u.id is not null)                    as inscrit,
  t.applied_at                          as applique_le,
  s.tier                                as palier_reel,
  p.is_tester                           as panneau_testeur
from public.pending_test_tiers t
left join auth.users u on lower(u.email) = t.email
left join public.profiles p on p.id = u.id
left join public.subscriptions s on s.user_id = u.id and s.platform = 'test'
order by t.applied_at nulls first, t.email;

-- ---------------------------------------------------------------------------
-- 6. AVANT LA MISE EN VENTE — à exécuter, pas à oublier
-- ---------------------------------------------------------------------------
--
--   delete from public.subscriptions where platform = 'test';
--   update public.profiles set is_tester = false where is_tester;
--   delete from public.pending_test_tiers;
--
-- Et remettre `handle_new_user` dans sa version d'origine (migration 001), ou
-- simplement vider la table ci-dessus : sans ligne en attente, le déclencheur
-- ne fait plus rien.
