// Droits par formule.
//
// C'est de la facturation : une règle fausse ici lèse un client payant ou
// laisse passer une fonctionnalité non payée. La règle métier verrouillée :
// Solo = un seul événement à la fois, et jamais le mariage.

import {
  canCreateEvent,
  isEventTypeLocked,
  limitsFor,
  remainingEvents,
  tierUnlocking,
} from "../src/lib/entitlements";

describe("Solo", () => {
  it("autorise un premier événement", () => {
    expect(canCreateEvent("solo", 0, "travel")).toEqual({ allowed: true });
  });

  it("refuse le deuxième", () => {
    const d = canCreateEvent("solo", 1, "travel");
    expect(d.allowed).toBe(false);
    expect(d.allowed === false && d.reason).toBe("eventLimit");
  });

  it("refuse le mariage même sans aucun événement en cours", () => {
    const d = canCreateEvent("solo", 0, "wedding");
    expect(d.allowed).toBe(false);
    expect(d.allowed === false && d.reason).toBe("typeLocked");
    expect(d.allowed === false && d.upgradeTo).toBe("duo");
  });

  it("autorise tous les autres types", () => {
    for (const type of ["travel", "baby", "funeral", "party", "religious", "housewarming"]) {
      expect(canCreateEvent("solo", 0, type)).toEqual({ allowed: true });
    }
  });

  it("annonce ce qu'il reste", () => {
    expect(remainingEvents("solo", 0)).toBe(1);
    expect(remainingEvents("solo", 1)).toBe(0);
  });

  it("ne descend jamais sous zéro", () => {
    // Un abonné rétrogradé peut avoir plus d'événements que sa formule
    // n'autorise : on ne lui affiche pas « -2 restants ».
    expect(remainingEvents("solo", 5)).toBe(0);
  });
});

describe("sans abonnement", () => {
  it("ne donne accès à aucun événement", () => {
    const d = canCreateEvent("free", 0, "travel");
    expect(d.allowed).toBe(false);
    expect(d.allowed === false && d.reason).toBe("needsSubscription");
    expect(d.allowed === false && d.upgradeTo).toBe("solo");
  });

  it("dit « abonne-toi », pas « type verrouillé », même pour le mariage", () => {
    // L'ordre des vérifications compte : proposer une montée de formule à
    // quelqu'un qui n'a aucun abonnement n'a pas de sens.
    const d = canCreateEvent("free", 0, "wedding");
    expect(d.allowed === false && d.reason).toBe("needsSubscription");
  });
});

describe("Duo et Famille", () => {
  it("n'ont aucune limite d'événements", () => {
    expect(canCreateEvent("duo", 50, "travel")).toEqual({ allowed: true });
    expect(canCreateEvent("family", 50, "travel")).toEqual({ allowed: true });
    expect(remainingEvents("duo", 12)).toBeNull();
  });

  it("débloquent le mariage", () => {
    expect(canCreateEvent("duo", 0, "wedding")).toEqual({ allowed: true });
    expect(canCreateEvent("family", 3, "wedding")).toEqual({ allowed: true });
  });

  it("donnent accès aux espaces partagés", () => {
    expect(limitsFor("duo").maxWorkspaces).toBeGreaterThan(0);
    expect(limitsFor("family").maxMembersPerWorkspace).toBeGreaterThan(
      limitsFor("duo").maxMembersPerWorkspace,
    );
  });
});

describe("verrouillage d'un type", () => {
  it("ne verrouille le mariage que sur Solo", () => {
    expect(isEventTypeLocked("solo", "wedding")).toBe(true);
    expect(isEventTypeLocked("duo", "wedding")).toBe(false);
    expect(isEventTypeLocked("family", "wedding")).toBe(false);
  });

  it("ne verrouille aucun autre type", () => {
    expect(isEventTypeLocked("solo", "travel")).toBe(false);
  });
});

describe("tierUnlocking", () => {
  it("désigne Solo pour un type ordinaire", () => {
    expect(tierUnlocking("travel")).toBe("solo");
  });

  it("désigne Duo pour le mariage", () => {
    expect(tierUnlocking("wedding")).toBe("duo");
  });
});
