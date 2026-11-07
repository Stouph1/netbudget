// « Ta formule » et le nombre d'espaces : les deux endroits où une erreur
// coûte cher — dire « renouvellement » à quelqu'un qui a résilié, ou laisser un
// invité créer un espace que personne ne pourra rejoindre.


import { canCreateWorkspace } from "../src/lib/entitlements";
import { planStatus } from "../src/lib/planStatus";
import type { PlanInfo } from "../src/lib/tier";

const plan = (over: Partial<PlanInfo> = {}): PlanInfo => ({
  ownTier: "duo",
  ownStatus: "active",
  ownExpiresAt: "2027-03-12T10:00:00Z",
  ownProductId: "netbudget.duo.yearly",
  ownPlatform: "apple",
  sharedTier: null,
  sharedBy: null,
  ...over,
});
const store = (over = {}) => ({
  productId: "netbudget.duo.yearly",
  period: "yearly" as const,
  expiresAt: "2027-03-12T10:00:00Z",
  willRenew: true,
  isTrial: false,
  billingIssue: false,
  ...over,
});

describe("canCreateWorkspace", () => {
  it("refuse sans formule propre, même membre d'un espace Famille", () => {
    expect(canCreateWorkspace("free", 0)).toMatchObject({ allowed: false, reason: "needsSubscription" });
  });
  it("Solo ne crée pas d'espace", () => {
    expect(canCreateWorkspace("solo", 0).allowed).toBe(false);
  });
  it("Duo : un espace, puis propose Famille", () => {
    expect(canCreateWorkspace("duo", 0).allowed).toBe(true);
    expect(canCreateWorkspace("duo", 1)).toMatchObject({ allowed: false, reason: "spaceLimit", upgradeTo: "family" });
  });
  it("Famille : trois espaces, sans formule au-dessus", () => {
    expect(canCreateWorkspace("family", 2).allowed).toBe(true);
    expect(canCreateWorkspace("family", 3)).toMatchObject({ allowed: false, reason: "spaceLimit", upgradeTo: null });
  });
});

describe("planStatus", () => {
  it("renouvellement quand la boutique dit qu'il aura lieu", () => {
    expect(planStatus(plan(), store(), "ios").kind).toBe("renews");
  });
  it("« se termine » quand le renouvellement est coupé", () => {
    expect(planStatus(plan(), store({ willRenew: false }), "ios").kind).toBe("ending");
  });
  it("le paiement en échec passe avant tout le reste", () => {
    expect(planStatus(plan(), store({ billingIssue: true, isTrial: true }), "ios").kind).toBe("billingIssue");
  });
  it("essai : dit s'il sera prélevé ensuite", () => {
    expect(planStatus(plan(), store({ isTrial: true, willRenew: false }), "ios")).toMatchObject({ kind: "trial", willRenew: false });
  });
  it("abonnement pris sur l'autre boutique : on le dit", () => {
    expect(planStatus(plan({ ownPlatform: "apple" }), null, "android")).toMatchObject({ kind: "otherStore", store: "apple" });
  });
  it("sans la boutique, retombe sur l'échéance du serveur", () => {
    expect(planStatus(plan(), null, "ios").kind).toBe("validUntil");
  });
});
