// Traduction entre le monde de RevenueCat et le nôtre.
//
// On ne teste pas le SDK — il n'est pas là dans Node, et le tester reviendrait
// à tester la boutique. On teste les trois traductions qui, si elles se
// trompent, font payer quelqu'un sans rien lui donner :
//   - identifiant produit -> formule et périodicité ;
//   - droits actifs -> palier ;
//   - erreur du SDK -> message affiché.

import { __testing } from "../src/lib/billing/revenuecat";
import {
  PLAY_BASE_PLANS,
  PLAY_SUBSCRIPTION_IDS,
  PRODUCT_IDS,
} from "../src/lib/billing/plans";

const { describeProduct, tierFromCustomerInfo, reasonFromError, canonicalId, ENTITLEMENTS } =
  __testing;

describe("identification des produits", () => {
  it("reconnaît les six produits du catalogue", () => {
    for (const tier of ["solo", "duo", "family"] as const) {
      for (const period of ["monthly", "yearly"] as const) {
        expect(describeProduct(PRODUCT_IDS[tier][period])).toEqual({ tier, period });
      }
    }
  });

  it("reconnaît la forme Google : abonnement + base plan", () => {
    // Play ne vend pas six produits mais trois abonnements à deux base plans.
    // Sans ça, un abonné Android paie et l'app ne sait pas ce qu'il a acheté.
    for (const tier of ["solo", "duo", "family"] as const) {
      for (const period of ["monthly", "yearly"] as const) {
        const id = `${PLAY_SUBSCRIPTION_IDS[tier]}:${PLAY_BASE_PLANS[period]}`;
        expect(describeProduct(id)).toEqual({ tier, period });
      }
    }
  });

  it("supporte un base plan assorti d'une offre promotionnelle", () => {
    // « base:offre » — la promo des 100 premiers passera par là. L'offre ne
    // change pas la durée, donc pas la formule accordée.
    expect(describeProduct("netbudget.duo:yearly:premiers100")).toEqual({
      tier: "duo",
      period: "yearly",
    });
  });

  it("ramène toujours à l'identifiant canonique, quelle que soit la boutique", () => {
    // Le reste de l'app ne connaît qu'un seul jeu d'identifiants.
    const google = describeProduct("netbudget.family:monthly")!;
    expect(canonicalId(google.tier, google.period)).toBe(PRODUCT_IDS.family.monthly);
  });

  it("ignore un produit inconnu au lieu de deviner", () => {
    // Deviner ici accorderait un palier au hasard sur un produit qu'on n'a pas
    // créé — par exemple un ancien identifiant resté dans la boutique.
    expect(describeProduct("netbudget.pro.lifetime")).toBeNull();
    expect(describeProduct("")).toBeNull();
    expect(describeProduct("netbudget.solo:weekly")).toBeNull();
    expect(describeProduct("autre.app:monthly")).toBeNull();
  });
});

describe("palier issu des droits", () => {
  const withActive = (ids: string[]) => ({
    entitlements: { active: Object.fromEntries(ids.map((id) => [id, { isActive: true }])) },
  });

  it("renvoie free quand rien n'est actif", () => {
    expect(tierFromCustomerInfo(withActive([]))).toBe("free");
    expect(tierFromCustomerInfo({})).toBe("free");
    expect(tierFromCustomerInfo(null)).toBe("free");
  });

  it("renvoie la formule correspondant au droit actif", () => {
    expect(tierFromCustomerInfo(withActive([ENTITLEMENTS.solo]))).toBe("solo");
    expect(tierFromCustomerInfo(withActive([ENTITLEMENTS.duo]))).toBe("duo");
    expect(tierFromCustomerInfo(withActive([ENTITLEMENTS.family]))).toBe("family");
  });

  it("garde la formule la PLUS haute si plusieurs sont actives", () => {
    // Arrive pendant un changement de formule : les deux se chevauchent
    // quelques heures. Retenir la plus basse retirerait à l'utilisateur ce
    // qu'il vient d'acheter.
    expect(tierFromCustomerInfo(withActive([ENTITLEMENTS.solo, ENTITLEMENTS.family]))).toBe(
      "family",
    );
    expect(tierFromCustomerInfo(withActive([ENTITLEMENTS.duo, ENTITLEMENTS.solo]))).toBe("duo");
  });

  it("ignore un droit qu'on ne connaît pas", () => {
    expect(tierFromCustomerInfo(withActive(["beta_tester"]))).toBe("free");
  });
});

describe("erreurs d'achat", () => {
  it("ne présente pas une annulation comme un échec", () => {
    // L'utilisateur a dit non. Lui afficher « achat impossible » laisse croire
    // à une panne et décourage une seconde tentative.
    expect(reasonFromError({ userCancelled: true })).toEqual({ ok: false, reason: "cancelled" });
  });

  it("distingue un produit déjà possédé", () => {
    expect(reasonFromError({ code: "ProductAlreadyPurchasedError" })).toEqual({
      ok: false,
      reason: "alreadyOwned",
    });
  });

  it("garde le message d'origine pour le reste", () => {
    expect(reasonFromError({ message: "réseau" })).toEqual({
      ok: false,
      reason: "error",
      message: "réseau",
    });
    expect(reasonFromError(undefined)).toEqual({
      ok: false,
      reason: "error",
      message: undefined,
    });
  });
});
