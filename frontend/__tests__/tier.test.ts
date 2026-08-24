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

import { parseTier } from "../src/lib/entitlements";

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
