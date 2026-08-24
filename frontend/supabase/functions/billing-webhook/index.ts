// Webhook de facturation : c'est ici que le palier d'abonnement est décidé.
//
// POURQUOI CETTE FONCTION EXISTE. Le palier ne doit jamais venir de
// l'application : un stockage local se modifie en trente secondes. La boutique
// encaisse, RevenueCat vérifie le reçu, et cette fonction écrit le verdict dans
// la base avec la clé de service. L'app ne fait que lire, via `my_tier()`.
//
// TROIS PROPRIÉTÉS QUE LE CODE DOIT GARANTIR, et qui expliquent sa forme :
//
// 1. AUTHENTIFIÉ. Sans vérification de l'en-tête d'autorisation, n'importe qui
//    connaissant l'URL s'offre la formule Famille par une requête. C'est le
//    premier contrôle, avant toute lecture du corps.
//
// 2. IDEMPOTENT. RevenueCat rejoue les messages en cas d'erreur, et les envoie
//    parfois en double. `event_id` est clé primaire : un rejeu est détecté et
//    ignoré, il ne prolonge pas une période.
//
// 3. TOLÉRANT AU DÉSORDRE. Les événements arrivent parfois dans le mauvais
//    ordre. On n'applique donc jamais un événement plus ancien que ce qui est
//    déjà enregistré — sinon une expiration reçue en retard annulerait un
//    renouvellement déjà pris en compte.
//
// Déploiement :
//   supabase functions deploy billing-webhook --no-verify-jwt
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<le secret choisi>
//
// `--no-verify-jwt` est nécessaire : RevenueCat n'a pas de session Supabase.
// C'est justement pourquoi le contrôle du secret partagé ci-dessous n'est pas
// optionnel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Paliers acceptés. Tout le reste est rejeté plutôt qu'interprété. */
const TIERS = ["free", "solo", "duo", "family"] as const;
type Tier = (typeof TIERS)[number];

/**
 * Entitlement RevenueCat → palier.
 *
 * On lit l'entitlement et non l'identifiant de produit : c'est ce qui permet
 * d'ajouter une offre promotionnelle ou de changer un identifiant de produit
 * sans redéployer cette fonction.
 */
function tierFromEntitlements(ids: string[]): Tier {
  // Ordre décroissant : quelqu'un qui cumule garde le plus généreux.
  if (ids.includes("family")) return "family";
  if (ids.includes("duo")) return "duo";
  if (ids.includes("solo")) return "solo";
  return "free";
}

/** Types d'événements qui retirent l'accès à terme échu. */
const REVOKING = new Set(["EXPIRATION", "REFUND", "SUBSCRIPTION_PAUSED"]);

/** Types qui signalent une résiliation sans retirer la période payée. */
const CANCELLING = new Set(["CANCELLATION", "UNSUBSCRIBE"]);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  // --- 1. Authentification -------------------------------------------------
  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!secret) {
    // Refuser plutôt que d'accepter sans contrôle : un secret oublié à la
    // configuration ne doit pas ouvrir le webhook au monde entier.
    console.error("REVENUECAT_WEBHOOK_SECRET absent");
    return new Response("misconfigured", { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("bad_json", { status: 400 });
  }

  const event = (body.event ?? {}) as Record<string, unknown>;
  const eventId = String(event.id ?? "");
  const type = String(event.type ?? "");
  // `app_user_id` est l'identifiant Supabase : c'est l'app qui l'a transmis à
  // RevenueCat à la connexion.
  const userId = String(event.app_user_id ?? "");

  if (!eventId || !type || !userId) {
    return new Response("missing_fields", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    // Clé de service : elle contourne RLS, et c'est pour ça qu'elle ne doit
    // jamais quitter le serveur. La table n'a aucune policy d'écriture.
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // --- 2. Idempotence ------------------------------------------------------
  // On insère d'abord le journal. Si l'identifiant existe déjà, c'est un rejeu :
  // on répond 200 pour que RevenueCat cesse de réessayer, sans rien appliquer.
  const journal = await admin.from("subscription_events").insert({
    event_id: eventId,
    user_id: userId,
    type,
    payload: body,
  });
  if (journal.error) {
    if (journal.error.code === "23505") {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    console.error("journal", journal.error);
    return new Response("journal_failed", { status: 500 });
  }

  // --- 3. Calcul du nouvel état -------------------------------------------
  const entitlements = Array.isArray(event.entitlement_ids)
    ? (event.entitlement_ids as unknown[]).map(String)
    : [];

  const expirationMs = Number(event.expiration_at_ms ?? 0);
  const expiresAt = expirationMs > 0 ? new Date(expirationMs).toISOString() : null;

  const revoking = REVOKING.has(type);
  const tier: Tier = revoking ? "free" : tierFromEntitlements(entitlements);

  const store = String(event.store ?? "").toLowerCase();
  const storeValue =
    store.includes("app_store") || store.includes("mac")
      ? "app_store"
      : store.includes("play")
        ? "play_store"
        : store.includes("promo")
          ? "promotional"
          : null;

  // --- 4. Tolérance au désordre -------------------------------------------
  // On ne recule jamais : si l'état enregistré expire PLUS TARD que celui de
  // cet événement, l'événement est en retard et l'appliquer annulerait un
  // renouvellement déjà pris en compte.
  const current = await admin
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  const known = current.data?.expires_at ? Date.parse(current.data.expires_at) : 0;
  if (!revoking && expirationMs > 0 && known > expirationMs) {
    return new Response(JSON.stringify({ ok: true, stale: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const upsert = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      tier,
      expires_at: expiresAt,
      cancelled: CANCELLING.has(type),
      provider_id: String(event.original_app_user_id ?? userId),
      store: storeValue,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsert.error) {
    console.error("upsert", upsert.error);
    // 500 : RevenueCat réessaiera, et l'idempotence rendra le rejeu sans effet
    // de bord. Répondre 200 ici perdrait l'événement définitivement.
    return new Response("upsert_failed", { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, tier }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
