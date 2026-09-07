// La traduction d'un événement RevenueCat vers la base.
//
// C'EST LE CODE LE PLUS RISQUÉ DU SYSTÈME. Il décide du palier de quelqu'un
// qui vient d'être débité. Une erreur ici ne se voit pas dans l'app, ne
// déclenche aucune alerte, et se découvre par un message de réclamation.
//
// Ce qui est verrouillé : les valeurs écrites doivent TOUJOURS respecter les
// contraintes CHECK de la table `subscriptions`, sinon l'écriture échoue et le
// client paie sans rien recevoir.

import {
  CANCELLING,
  platformFromStore,
  REVOKING,
  statusFor,
  tierFromEntitlements,
} from "../supabase/functions/_shared/billingMapping";

/** Valeurs acceptées par la contrainte CHECK de `subscriptions.status`. */
const STATUS_ALLOWED = ["trial", "active", "expired", "cancelled", "in_grace", "paused"];
/** Idem pour `subscriptions.platform` (migrations 001, 018 et 019). */
const PLATFORM_ALLOWED = ["apple", "google", "stripe", "promotional", "test"];

describe("droits → palier", () => {
  it("traduit chaque droit", () => {
    expect(tierFromEntitlements(["solo"])).toBe("solo");
    expect(tierFromEntitlements(["duo"])).toBe("duo");
    expect(tierFromEntitlements(["family"])).toBe("family");
  });

  it("garde le plus généreux quand deux droits se chevauchent", () => {
    // Arrive pendant un changement de formule : les deux coexistent quelques
    // heures. Retirer à quelqu'un ce qu'il vient d'acheter serait le pire
    // moment pour se tromper.
    expect(tierFromEntitlements(["solo", "family"])).toBe("family");
    expect(tierFromEntitlements(["duo", "solo"])).toBe("duo");
  });

  it("renvoie free sans aucun droit", () => {
    expect(tierFromEntitlements([])).toBe("free");
  });

  it("ignore un droit inconnu au lieu de l'interpréter", () => {
    // Un droit ajouté un jour dans RevenueCat ne doit rien accorder tant que
    // ce code ne le connaît pas.
    expect(tierFromEntitlements(["beta", "vip"])).toBe("free");
  });
});

describe("boutique → platform", () => {
  it("traduit les boutiques connues", () => {
    expect(platformFromStore("APP_STORE")).toBe("apple");
    expect(platformFromStore("MAC_APP_STORE")).toBe("apple");
    expect(platformFromStore("PLAY_STORE")).toBe("google");
    expect(platformFromStore("STRIPE")).toBe("stripe");
    expect(platformFromStore("PROMOTIONAL")).toBe("promotional");
  });

  it("ne produit JAMAIS une valeur refusée par la base", () => {
    // C'est le test qui compte : une valeur hors contrainte fait échouer
    // l'écriture, RevenueCat réessaie en boucle, et le client n'a rien.
    for (const raw of ["APP_STORE", "PLAY_STORE", "STRIPE", "PROMOTIONAL", "AMAZON", "", null, undefined, 42]) {
      expect(PLATFORM_ALLOWED).toContain(platformFromStore(raw));
    }
  });

  it("se rabat sur apple plutôt que d'échouer", () => {
    // Mieux vaut une ligne mal étiquetée qu'un client sans son abonnement.
    expect(platformFromStore("BOUTIQUE_INCONNUE")).toBe("apple");
  });
});

describe("événement → status", () => {
  it("distingue l'essai de l'abonnement payant", () => {
    expect(statusFor("INITIAL_PURCHASE", "TRIAL")).toBe("trial");
    expect(statusFor("INITIAL_PURCHASE", "NORMAL")).toBe("active");
    expect(statusFor("RENEWAL", "NORMAL")).toBe("active");
  });

  it("garde l'accès sur un incident de paiement", () => {
    // `in_grace` est lu comme actif par my_tier(). Couper tout de suite
    // punirait quelqu'un pour une carte expirée, pendant que la banque et la
    // boutique se parlent.
    expect(statusFor("BILLING_ISSUE", "NORMAL")).toBe("in_grace");
  });

  it("retire l'accès sur une expiration", () => {
    expect(statusFor("EXPIRATION", "NORMAL")).toBe("expired");
  });

  it("distingue un remboursement d'une expiration", () => {
    // Un remboursement n'est pas une fin de période : la trace doit le dire.
    expect(statusFor("REFUND", "NORMAL")).toBe("cancelled");
  });

  it("traite une pause comme telle", () => {
    expect(statusFor("SUBSCRIPTION_PAUSED", "NORMAL")).toBe("paused");
  });

  it("laisse l'accès après une résiliation, jusqu'à la fin de la période", () => {
    // Résilier n'est pas expirer. Quelqu'un qui a payé son mois le garde —
    // le lui retirer immédiatement serait un vol.
    expect(statusFor("CANCELLATION", "NORMAL")).toBe("active");
    expect(statusFor("UNSUBSCRIBE", "NORMAL")).toBe("active");
    expect(CANCELLING.has("CANCELLATION")).toBe(true);
    expect(REVOKING.has("CANCELLATION")).toBe(false);
  });

  it("ne produit JAMAIS une valeur refusée par la base", () => {
    const types = [
      "INITIAL_PURCHASE", "RENEWAL", "CANCELLATION", "UNSUBSCRIBE",
      "EXPIRATION", "REFUND", "BILLING_ISSUE", "SUBSCRIPTION_PAUSED",
      "PRODUCT_CHANGE", "TRANSFER", "EVENEMENT_INCONNU", "",
    ];
    for (const t of types) {
      for (const p of ["TRIAL", "NORMAL", "INTRO", ""]) {
        expect(STATUS_ALLOWED).toContain(statusFor(t, p));
      }
    }
  });
});

describe("cohérence des deux ensembles", () => {
  it("aucun type n'est à la fois révocation et résiliation", () => {
    // Les deux traitements sont opposés : l'un retire l'accès, l'autre le
    // garde. Un type dans les deux listes rendrait le comportement
    // dépendant de l'ordre des tests dans le code.
    for (const t of REVOKING) {
      expect(CANCELLING.has(t)).toBe(false);
    }
  });
});
