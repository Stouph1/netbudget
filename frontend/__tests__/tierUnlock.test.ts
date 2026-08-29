// Quand montrer l'écran de déverrouillage.
//
// Une règle courte, mais elle décide de ce qu'un client voit dans la minute qui
// suit un paiement — le moment où un doute se transforme en demande de
// remboursement.

import { shouldCelebrate } from "../src/lib/tierUnlockRule";

describe("déclenchement de la fête", () => {
  it("fête un premier abonnement", () => {
    for (const tier of ["solo", "duo", "family"] as const) {
      expect(shouldCelebrate(null, tier)).toBe(true);
    }
  });

  it("ne la rejoue pas au lancement suivant", () => {
    // Un écran plein qui revient à chaque ouverture cesse d'être une
    // récompense et devient une porte.
    expect(shouldCelebrate("solo", "solo")).toBe(false);
    expect(shouldCelebrate("family", "family")).toBe(false);
  });

  it("fête une montée de formule", () => {
    // La personne vient de payer davantage : c'est le moment de lui montrer
    // ce qu'elle a gagné.
    expect(shouldCelebrate("solo", "duo")).toBe(true);
    expect(shouldCelebrate("solo", "family")).toBe(true);
    expect(shouldCelebrate("duo", "family")).toBe(true);
  });

  it("ne fête JAMAIS une descente", () => {
    // Fin d'essai, changement vers une formule plus petite : rien de tout ça
    // n'est une bonne nouvelle à annoncer en plein écran.
    expect(shouldCelebrate("family", "duo")).toBe(false);
    expect(shouldCelebrate("family", "solo")).toBe(false);
    expect(shouldCelebrate("duo", "solo")).toBe(false);
  });

  it("ne fête rien sans abonnement", () => {
    expect(shouldCelebrate(null, "free")).toBe(false);
    expect(shouldCelebrate("family", "free")).toBe(false);
  });
});
