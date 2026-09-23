-- 027 — Une seule ligne de données par espace et par clé.
--
-- Constat à deux téléphones : chaque membre écrivait SA ligne de budget
-- partagé (l'unicité était par utilisateur), et la lecture attendait une
-- ligne par espace. Dès le deuxième contributeur, la lecture échouait et
-- chacun retombait sur son cache local : les deux membres ne se voyaient
-- jamais.
--
-- On garde la ligne la plus récente de chaque (espace, clé), on supprime les
-- autres, et on interdit le retour du doublon. Les données personnelles
-- (workspace_id null) gardent leur unicité par utilisateur.
--
-- À appliquer dans Supabase → SQL Editor → coller → Run.

delete from public.encrypted_payloads p
 using public.encrypted_payloads q
 where p.workspace_id is not null
   and q.workspace_id = p.workspace_id
   and q.payload_key = p.payload_key
   and (q.updated_at > p.updated_at or (q.updated_at = p.updated_at and q.id > p.id));

drop index if exists public.encrypted_payloads_scope_key_idx;

create unique index if not exists encrypted_payloads_personal_key_idx
  on public.encrypted_payloads (user_id, payload_key)
  where workspace_id is null;

create unique index if not exists encrypted_payloads_workspace_key_uidx
  on public.encrypted_payloads (workspace_id, payload_key)
  where workspace_id is not null;
