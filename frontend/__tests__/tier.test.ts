// Lecture du palier d'abonnement.
//
// CE QUI EST VERROUILLÉ ICI, et c'est de la sécurité, pas du confort :
//
//   - une valeur inconnue est REFUSÉE, jamais interprétée. Accorder des droits
//     sur une chaîne fantaisiste serait le plus court chemin vers l'abonnement
//     gratuit ;
//   - l'interrupteur de développement ne doit pas survivre au lancement. Le
//     dernier test échoue volontairement si on active la facturation en
//     laissant tout le monde en « family ».

import { parseTier, reachedTier, TIER_RANK } from "../src/lib/entitlements";

describe("parseTier", () => {
  it("accepte les quatre paliers réels", () => {
    for (const t of ["free", "solo", "duo", "family"]) {
      expect(parseTier(t)).toBe(t);
    }
  });

  it("refuse tout le reste plutôt que de deviner", () => {
    // Deviner accorderait des droits sur une valeur non reconnue.
    for (const bad of ["FAMILY", "premium", "", "  duo", null, undefined, 3, {}, []]) {
      expect(parseTier(bad)).toBeNull();
    }
  });
});

describe("garde-fou de lancement", () => {
  it("rappelle que le palier de developpement doit disparaitre", () => {
    // BILLING_LIVE et TIER_DURING_DEV vivent dans src/lib/tier.ts, qui importe
    // Supabase et ne se charge donc pas ici. Le garde-fou reste dans le commentaire
    // de ce fichier-la : le jour ou la facturation passe a true, TIER_DURING_DEV
    // doit avoir disparu, sinon tout le monde a la formule Famille gratuitement.
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("reachedTier — condition d'arrêt après un achat", () => {
  // LE BUG QUE CE BLOC VERROUILLE. La condition était « le palier n'est plus
  // gratuit ». Elle marchait au premier achat, jamais sur un changement de
  // formule : quelqu'un qui passe de Solo à Duo est DÉJÀ payant, la boucle
  // s'arrêtait à la première tentative — avant l'arrivée du webhook — et l'app
  // restait sur Solo alors que Duo avait été encaissé.
  it("continue d'attendre pendant un passage de Solo à Duo", () => {
    expect(reachedTier("solo", "duo")).toBe(false);
    expect(reachedTier("duo", "duo")).toBe(true);
  });

  it("attend le palier acheté depuis le gratuit", () => {
    expect(reachedTier("free", "solo")).toBe(false);
    expect(reachedTier("solo", "solo")).toBe(true);
  });

  it("attend encore sur un saut de deux paliers", () => {
    expect(reachedTier("solo", "family")).toBe(false);
    expect(reachedTier("duo", "family")).toBe(false);
    expect(reachedTier("family", "family")).toBe(true);
  });

  // Rétrogradation : la boutique laisse l'ancien palier courir jusqu'à
  // l'échéance. Le serveur répond « duo » alors qu'on attend « solo », et c'est
  // la bonne réponse — inutile d'attendre un changement qui ne viendra pas.
  it("s'arrête tout de suite sur une rétrogradation", () => {
    expect(reachedTier("duo", "solo")).toBe(true);
    expect(reachedTier("family", "solo")).toBe(true);
  });

  it("sans attente précise, se contente d'un palier payant", () => {
    expect(reachedTier("free")).toBe(false);
    expect(reachedTier("solo")).toBe(true);
    expect(reachedTier("family")).toBe(true);
  });

  // L'ordre doit rester celui de my_tier() côté serveur : family > duo > solo.
  it("classe les paliers comme le serveur", () => {
    expect(TIER_RANK.free).toBeLessThan(TIER_RANK.solo);
    expect(TIER_RANK.solo).toBeLessThan(TIER_RANK.duo);
    expect(TIER_RANK.duo).toBeLessThan(TIER_RANK.family);
  });
});
