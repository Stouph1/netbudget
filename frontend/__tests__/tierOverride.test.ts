// Le palier forcé pour les tests.
//
// CE QUI EST VERROUILLÉ ICI : la porte reste FERMÉE tant que le serveur n'a pas
// reconnu un testeur. Si ce test tombe, n'importe qui peut s'accorder la
// formule Famille — et le seul intérêt de tout le dispositif de facturation
// disparaît.

import {
  allowTierOverride,
  setTierOverride,
  tierOverride,
} from "../src/lib/tierOverride";

beforeEach(async () => {
  allowTierOverride(false);
  await setTierOverride(null);
});

describe("porte d'entrée", () => {
  it("est fermée par défaut", () => {
    expect(tierOverride()).toBeNull();
  });

  it("ignore un palier posé sans autorisation du serveur", async () => {
    // Le cas qui compte : quelqu'un écrit dans le stockage local sans être
    // testeur. Le réglage est mémorisé mais JAMAIS appliqué.
    await setTierOverride("family");
    expect(tierOverride()).toBeNull();
  });

  it("l'applique une fois le testeur reconnu", async () => {
    await setTierOverride("duo");
    allowTierOverride(true);
    expect(tierOverride()).toBe("duo");
  });

  it("se referme dès que le testeur ne l'est plus", async () => {
    // Déconnexion, ou statut retiré en base : l'accès de test s'arrête net.
    await setTierOverride("family");
    allowTierOverride(true);
    expect(tierOverride()).toBe("family");
    allowTierOverride(false);
    expect(tierOverride()).toBeNull();
  });
});

describe("choix du palier", () => {
  it("accepte les quatre paliers", async () => {
    allowTierOverride(true);
    for (const tier of ["free", "solo", "duo", "family"] as const) {
      await setTierOverride(tier);
      expect(tierOverride()).toBe(tier);
    }
  });

  it("revient au palier réel quand on l'efface", async () => {
    allowTierOverride(true);
    await setTierOverride("solo");
    await setTierOverride(null);
    expect(tierOverride()).toBeNull();
  });

  it("prévient les écrans déjà affichés", async () => {
    // Sans notification, il faudrait relancer l'app à chaque changement de
    // palier — et on ne testerait plus les quatre.
    const { onTierOverrideChange } = await import("../src/lib/tierOverride");
    let calls = 0;
    const off = onTierOverrideChange(() => calls++);
    allowTierOverride(true);
    await setTierOverride("duo");
    off();
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});
