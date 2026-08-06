// Edge Function : suppression définitive du compte (RGPD + exigence App Store).
//
// Sécurité : le client ne PEUT PAS s'auto-supprimer (auth.admin nécessite la
// clé service_role, server-only). Cette fonction vérifie le JWT de l'appelant
// puis supprime SON propre compte — jamais celui d'un autre.
//
// Cascade : toutes les FK pointent sur auth.users avec `on delete cascade`
// (migrations 001/002) → profil, workspaces possédés (avec leurs membres,
// invitations et payloads), adhésions et payloads perso sont purgés.
// Les fichiers Storage (avatars/<uid>/…) sont supprimés explicitement.
//
// Déploiement : `supabase functions deploy delete-account`
// (ou Dashboard → Edge Functions → New function → coller ce fichier).

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // 1. Identifie l'appelant via SON jeton (client anon + header Authorization)
  const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const {
    data: { user },
    error: authError,
  } = await anon.auth.getUser();
  if (authError || !user) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  // 2. Client admin (service_role) — fourni automatiquement aux Edge Functions
  const admin = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 3. Purge les fichiers Storage de l'utilisateur (avatars/<uid>/…)
  try {
    const { data: files } = await admin.storage.from("avatars").list(user.id);
    if (files && files.length > 0) {
      await admin.storage
        .from("avatars")
        .remove(files.map((f) => `${user.id}/${f.name}`));
    }
  } catch (_) {
    // Storage best-effort : ne bloque pas la suppression du compte
  }

  // 4. Suppression du compte auth → cascade sur toutes les tables
  const { error: delError } = await admin.auth.admin.deleteUser(user.id);
  if (delError) {
    return json({ ok: false, error: delError.message }, 500);
  }

  return json({ ok: true });
});
