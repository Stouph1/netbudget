-- 028 — Retours de départ : pourquoi quelqu'un résilie ou supprime son compte.
--
-- POURQUOI. Une résiliation ou une suppression sans motif est une perte
-- sèche : on ne sait pas quoi réparer. On demande donc, une fois, sans rien
-- conditionner à la réponse (voir CancelSheet et DeleteAccountSheet).
--
-- CE QU'ON N'ENREGISTRE PAS : ni identifiant, ni adresse, ni appareil. La
-- ligne est anonyme par construction — elle n'a pas de colonne user_id. On
-- garde le motif, le texte libre (borné), la formule au moment du départ, la
-- plateforme et la langue : de quoi lire les tendances, rien pour retrouver
-- quelqu'un. Le RGPD est respecté par l'absence de donnée, pas par une
-- promesse.
--
-- À appliquer dans Supabase → SQL Editor → coller → Run.

create table if not exists public.departure_feedback (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('cancel_subscription', 'delete_account')),
  reason      text not null check (reason in ('price', 'unused', 'missing', 'bug', 'privacy', 'other', 'none')),
  details     text check (details is null or char_length(details) <= 500),
  tier        text not null default 'free',
  platform    text not null default 'unknown' check (platform in ('ios', 'android', 'web', 'unknown')),
  lang        text not null default 'fr',
  created_at  timestamptz not null default now()
);

comment on table public.departure_feedback is
  'Motifs de résiliation et de suppression de compte. Anonyme : aucune colonne ne renvoie à une personne.';

-- Aucune policy : la table est invisible depuis l'app. Seule la fonction
-- ci-dessous y écrit, et personne n'y lit hors de cet éditeur.
alter table public.departure_feedback enable row level security;

create or replace function public.leave_feedback(
  p_kind text,
  p_reason text,
  p_details text default null,
  p_platform text default 'unknown',
  p_lang text default 'fr'
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;
  insert into public.departure_feedback (kind, reason, details, tier, platform, lang)
  values (
    p_kind,
    coalesce(nullif(p_reason, ''), 'none'),
    nullif(left(coalesce(p_details, ''), 500), ''),
    public.tier_of(uid),
    coalesce(nullif(p_platform, ''), 'unknown'),
    left(coalesce(nullif(p_lang, ''), 'fr'), 5)
  );
end $$;

revoke all on function public.leave_feedback(text, text, text, text, text) from public, anon;
grant execute on function public.leave_feedback(text, text, text, text, text) to authenticated;

comment on function public.leave_feedback(text, text, text, text, text) is
  'Enregistre un motif de départ, anonyme. La formule est lue côté serveur, le reste vient de l''app.';
