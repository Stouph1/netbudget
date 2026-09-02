// Qui voit quelle étape de la visite guidée.
//
// Ce qui est verrouillé ici : on ne montre JAMAIS une fonctionnalité à
// quelqu'un qui n'y a pas droit (le tutoriel deviendrait de la vente déguisée),
// et on ne redit JAMAIS ce qui a déjà été vu.

import { hasTour, stepsFor, TOUR_STEPS } from "../src/lib/tourSteps";

const ids = (tier: Parameters<typeof stepsFor>[0], seen: Parameters<typeof stepsFor>[1]) =>
  stepsFor(tier, seen).map((s) => s.id);

describe("première visite", () => {
  it("montre les bases sans abonnement", () => {
    expect(ids("free", null)).toEqual([
      "income",
      "remaining",
      "loan",
      "export",
      "converter",
      "tier",
      "goals",
      "advice",
      "join",
      "history",
      "notifications",
    ]);
  });

  it("couvre l'application, pas un échantillon", () => {
    // Une visite qui montre quatre choses sur quinze laisse croire que l'app
    // n'en fait que quatre — pire que de ne rien montrer.
    expect(ids("free", null).length).toBeGreaterThanOrEqual(9);
    // Et elle touche les quatre onglets, pas seulement le budget.
    const tabs = new Set(stepsFor("free", null).map((s) => s.tab));
    expect(tabs).toEqual(new Set(["budget", "converter", "premium", "settings"]));
  });

  it("ne montre RIEN qui demande un abonnement", () => {
    const shown = stepsFor("free", null);
    expect(shown.every((s) => s.from === "free")).toBe(true);
    expect(ids("free", null)).not.toContain("events");
    expect(ids("free", null)).not.toContain("shared");
  });

  it("ajoute les événements dès Solo", () => {
    expect(ids("solo", null)).toContain("events");
    expect(ids("free", null)).not.toContain("events");
  });

  it("ajoute l'espace partagé à partir de Duo", () => {
    expect(ids("duo", null)).toContain("shared");
    expect(ids("family", null)).toContain("shared");
    expect(ids("solo", null)).not.toContain("shared");
  });
});

describe("après une montée de formule", () => {
  it("ne montre QUE ce qui vient d'être acheté", () => {
    // Quelqu'un qui utilise l'onglet Budget depuis six mois n'a pas besoin
    // qu'on le lui présente à nouveau.
    expect(ids("duo", "free")).toEqual(["events", "shared"]);
    expect(ids("family", "duo")).toEqual(["birthdays"]);
    expect(ids("solo", "free")).toEqual(["events"]);
  });

  it("ne redit rien quand rien n'a changé", () => {
    for (const tier of ["free", "solo", "duo", "family"] as const) {
      expect(ids(tier, tier)).toEqual([]);
      expect(hasTour(tier, tier)).toBe(false);
    }
  });

  it("montre les anniversaires seulement à Famille", () => {
    expect(ids("family", null)).toContain("birthdays");
    for (const tier of ["free", "solo", "duo"] as const) {
      expect(ids(tier, null)).not.toContain("birthdays");
    }
  });

  it("ne redit rien après une descente de formule", () => {
    // Fin d'essai : on ne rejoue pas la visite d'un palier qu'on n'a plus.
    expect(ids("free", "family")).toEqual([]);
    expect(ids("solo", "duo")).toEqual([]);
  });
});

describe("cohérence du catalogue", () => {
  it("désigne un vrai élément, jamais une icône d'onglet", () => {
    // Montrer une icône d'onglet en disant « ici tu trouveras tes revenus »
    // n'apprend rien : on n'a rien vu. Chaque étape ouvre son écran et
    // désigne l'élément dont elle parle.
    expect(TOUR_STEPS.every((s) => !s.target.startsWith("tab:"))).toBe(true);
    expect(TOUR_STEPS.every((s) => s.tab.length > 0)).toBe(true);
  });

  it("n'a pas deux étapes du même identifiant", () => {
    expect(new Set(TOUR_STEPS.map((s) => s.id)).size).toBe(TOUR_STEPS.length);
  });

  it("garde les paliers dans l'ordre du parcours", () => {
    // Une étape Duo placée avant une étape Gratuit ferait sauter la visite
    // d'un bout à l'autre de l'app.
    const rank = { free: 0, solo: 1, duo: 2, family: 3 } as const;
    const order = TOUR_STEPS.map((s) => rank[s.from]);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
