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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  // Action irréversible : jamais sur un GET (préchargement de lien, crawler).
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
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

  // 3. Purge les fichiers Storage : avatar perso ET photos des workspaces
  //    possédés. Ces derniers doivent être listés AVANT la suppression du
  //    compte : après la cascade, plus aucune ligne ne permet de les retrouver
  //    et les fichiers resteraient publics indéfiniment.
  let storagePurged = true;
  try {
    const { data: owned } = await admin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id);

    const prefixes = [user.id, ...(owned ?? []).map((w) => `workspaces/${w.id}`)];
    for (const prefix of prefixes) {
      const { data: files } = await admin.storage.from("avatars").list(prefix);
      if (files && files.length > 0) {
        await admin.storage
          .from("avatars")
          .remove(files.map((f) => `${prefix}/${f.name}`));
      }
    }
  } catch (_) {
    // Best-effort : ne bloque pas la suppression du compte (droit à
    // l'effacement), mais on le signale dans la réponse.
    storagePurged = false;
  }

  // 4. Suppression du compte auth → cascade sur toutes les tables
  const { error: delError } = await admin.auth.admin.deleteUser(user.id);
  if (delError) {
    return json({ ok: false, error: delError.message }, 500);
  }

  return json({ ok: true, storagePurged });
});
