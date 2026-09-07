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
// Traductions isolées pour être TESTABLES depuis le projet : ces trois
// fonctions décident du palier de quelqu'un qui vient de payer.
// Voir _shared/billingMapping.ts et __tests__/billingMapping.test.ts.
import {
  CANCELLING,
  platformFromStore,
  REVOKING,
  statusFor,
  tierFromEntitlements,
  type Tier,
} from "../_shared/billingMapping.ts";





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

  // `platform` porte une contrainte CHECK : apple, google, stripe,
  // promotional, test. Une valeur hors liste fait échouer l'écriture — donc on
  // traduit, on ne recopie pas ce que RevenueCat envoie.
  const platform = platformFromStore(event.store);

  // `status` porte aussi une contrainte CHECK, et la colonne est OBLIGATOIRE.
  // On la déduit du type d'événement plutôt que de la laisser vide.
  const periodType = String(event.period_type ?? "").toUpperCase();
  const status = statusFor(type, periodType);

  // Clé d'unicité RÉELLE de la table : (platform, original_transaction_id).
  // C'est elle qu'on utilise, et non `user_id` qui n'en porte aucune.
  const transactionId = String(
    event.original_transaction_id ?? event.transaction_id ?? eventId,
  );

  const trialEndsAt =
    periodType === "TRIAL" && expirationMs > 0
      ? new Date(expirationMs).toISOString()
      : null;

  // --- 4. Tolérance au désordre -------------------------------------------
  // On ne recule jamais : si l'état enregistré expire PLUS TARD que celui de
  // cet événement, l'événement est en retard et l'appliquer annulerait un
  // renouvellement déjà pris en compte.
  const current = await admin
    .from("subscriptions")
    .select("expires_at")
    // Sur la clé d'unicité réelle. Un filtre sur `user_id` seul peut renvoyer
    // PLUSIEURS lignes — un même compte peut avoir un historique — et
    // `maybeSingle()` lèverait alors une erreur.
    .eq("platform", platform)
    .eq("original_transaction_id", transactionId)
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
      platform,
      // Obligatoire en base. RevenueCat l'envoie toujours sur un abonnement ;
      // le repli évite un échec d'écriture sur un événement inattendu.
      product_id: String(event.product_id ?? "unknown"),
      status,
      tier,
      expires_at: expiresAt,
      trial_ends_at: trialEndsAt,
      original_transaction_id: transactionId,
      cancel_reason: CANCELLING.has(type) ? type : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "platform,original_transaction_id" },
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
