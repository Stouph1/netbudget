// Quand l'écran des nouveautés s'ouvre.
//
// Ce qui est verrouillé : il ne s'ouvre JAMAIS sur une installation neuve — la
// personne n'a rien à rattraper — et jamais sur un correctif, sinon le geste de
// fermeture devient automatique et l'écran perd tout pouvoir le jour où il sert.

import { majorOf, shouldShowWhatsNew } from "../src/lib/whatsNew";

const show = (seen: string | null, current: string, firstInstall = false) =>
  shouldShowWhatsNew(seen, current, { firstInstall });

describe("lecture du numéro majeur", () => {
  it("lit les formes usuelles", () => {
    expect(majorOf("2.0.0")).toBe(2);
    expect(majorOf("10.4.1")).toBe(10);
    expect(majorOf(" 3.1.0 ")).toBe(3);
  });

  it("refuse ce qu'elle ne comprend pas au lieu de deviner", () => {
    for (const bad of ["", "v2.0.0", "beta", null, undefined]) {
      expect(majorOf(bad)).toBeNull();
    }
  });
});

describe("déclenchement", () => {
  it("s'ouvre sur une version majeure", () => {
    expect(show("1.6.3", "2.0.0")).toBe(true);
    expect(show("2.4.1", "3.0.0")).toBe(true);
  });

  it("se tait sur un correctif ou une mineure", () => {
    // C'est la règle qui protège l'écran : sur trois corrections de suite, on
    // apprend à le fermer sans le lire.
    expect(show("2.0.0", "2.0.1")).toBe(false);
    expect(show("2.0.0", "2.3.0")).toBe(false);
    expect(show("2.0.0", "2.0.0")).toBe(false);
  });

  it("ne s'ouvre JAMAIS sur une installation neuve", () => {
    // Rien à rattraper, et ça prendrait la place de la visite guidée.
    expect(show(null, "2.0.0", true)).toBe(false);
    expect(show("1.0.0", "2.0.0", true)).toBe(false);
  });

  it("annonce à une app déjà installée qui n'a jamais rien vu", () => {
    // Mise à jour depuis une version antérieure au suivi : c'est bien une
    // montée, il n'y a que la trace qui manque.
    expect(show(null, "2.0.0")).toBe(true);
  });

  it("se tait sur une version illisible plutôt que d'insister", () => {
    expect(show("2.0.0", "inconnue")).toBe(false);
  });

  it("ne revient pas en arrière", () => {
    // Retour à une version antérieure (TestFlight, restauration) : il n'y a
    // pas de nouveauté à annoncer.
    expect(show("3.0.0", "2.0.0")).toBe(false);
  });
});
