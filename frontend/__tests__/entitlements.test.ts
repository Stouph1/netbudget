// Droits par formule.
//
// C'est de la facturation : une règle fausse ici lèse un client payant ou
// laisse passer une fonctionnalité non payée. La règle métier verrouillée :
// Solo = un seul événement à la fois, et jamais le mariage.

import {
  canCreateEvent,
  canCreateGoal,
  canCreateSharedGoal,
  canJoinWorkspace,
  canSeeScheduleYear,
  isEventTypeLocked,
  limitsFor,
  remainingEvents,
  remainingGoals,
  tierUnlocking,
} from "../src/lib/entitlements";

describe("Solo", () => {
  it("autorise un premier événement", () => {
    expect(canCreateEvent("solo", 0, "travel")).toEqual({ allowed: true });
  });

  it("en accepte six en parallèle", () => {
    expect(canCreateEvent("solo", 5, "travel")).toEqual({ allowed: true });
  });

  // Six, pas un : le premier retour des testeurs. Voir LIMITS.solo.
  it("refuse le septième", () => {
    const d = canCreateEvent("solo", 6, "travel");
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
    expect(remainingEvents("solo", 0)).toBe(6);
    expect(remainingEvents("solo", 1)).toBe(5);
    expect(remainingEvents("solo", 6)).toBe(0);
  });

  it("ne descend jamais sous zéro", () => {
    // Un abonné rétrogradé peut avoir plus d'événements que sa formule
    // n'autorise : on ne lui affiche pas « -2 restants ».
    expect(remainingEvents("solo", 9)).toBe(0);
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

describe("objectifs d'épargne", () => {
  it("laisse UN objectif sans abonnement", () => {
    // Zéro rendrait la fonctionnalité invisible, donc invendable. Un objectif
    // suffit à comprendre ce qu'elle apporte.
    expect(canCreateGoal("free", 0).allowed).toBe(true);
    expect(canCreateGoal("free", 1).allowed).toBe(false);
  });

  it("propose l'abonnement au premier refus, pas une formule supérieure", () => {
    const denial = canCreateGoal("free", 1);
    expect(denial.allowed).toBe(false);
    expect(!denial.allowed && denial.reason).toBe("needsSubscription");
    expect(!denial.allowed && denial.upgradeTo).toBe("solo");
  });

  it("en laisse trois en solo", () => {
    expect(canCreateGoal("solo", 2).allowed).toBe(true);
    expect(canCreateGoal("solo", 3).allowed).toBe(false);
    expect(!canCreateGoal("solo", 3).allowed && canCreateGoal("solo", 3)).toMatchObject({
      reason: "goalLimit",
      upgradeTo: "duo",
    });
  });

  it("n'en limite aucun sur les formules à plusieurs", () => {
    for (const tier of ["duo", "family"] as const) {
      expect(canCreateGoal(tier, 999).allowed).toBe(true);
      expect(remainingGoals(tier, 999)).toBeNull();
    }
  });

  it("annonce ce qui reste au lieu de laisser découvrir la limite", () => {
    expect(remainingGoals("free", 0)).toBe(1);
    expect(remainingGoals("solo", 1)).toBe(2);
    // Jamais négatif : un ancien abonné redescendu en free garde ses objectifs
    // mais n'en crée plus.
    expect(remainingGoals("free", 5)).toBe(0);
  });
});

describe("échéancier de prêt", () => {
  it("laisse voir l'année en cours sans abonnement", () => {
    expect(canSeeScheduleYear("free", 0)).toBe(true);
  });

  it("réserve la projection sur les années suivantes", () => {
    expect(canSeeScheduleYear("free", 1)).toBe(false);
    expect(canSeeScheduleYear("free", 12)).toBe(false);
  });

  it("laisse le passé lisible", () => {
    // Ce sont des échéances déjà payées. Les masquer donnerait le sentiment
    // qu'on retient son propre historique en otage.
    expect(canSeeScheduleYear("free", -1)).toBe(true);
    expect(canSeeScheduleYear("free", -8)).toBe(true);
  });

  it("ouvre tout dès la première formule payante", () => {
    for (const tier of ["solo", "duo", "family"] as const) {
      expect(canSeeScheduleYear(tier, 25)).toBe(true);
    }
  });
});

describe("rejoindre un espace partagé", () => {
  it("est ouvert à tout le monde, abonnement ou non", () => {
    // C'est l'abonné qui paie pour inviter. Bloquer l'invité annulerait
    // l'achat qu'on vient d'encaisser.
    expect(canJoinWorkspace()).toBe(true);
  });

  it("ne se confond pas avec le droit d'en créer un", () => {
    expect(limitsFor("free").maxWorkspaces).toBe(0);
    expect(limitsFor("solo").maxWorkspaces).toBe(0);
    expect(limitsFor("duo").maxWorkspaces).toBeGreaterThan(0);
  });
});

describe("conseils personnalisés", () => {
  it("sont réservés aux formules payantes", () => {
    expect(limitsFor("free").advice).toBe(false);
    for (const tier of ["solo", "duo", "family"] as const) {
      expect(limitsFor(tier).advice).toBe(true);
    }
  });
});

describe("objectif dans un espace partagé", () => {
  it("laisse écrire dès la première formule payante", () => {
    for (const tier of ["solo", "duo", "family"] as const) {
      expect(canCreateSharedGoal(tier).allowed).toBe(true);
    }
  });

  it("interdit à l'invité gratuit d'en créer", () => {
    // Sans ça, un seul abonnement Duo ferait vivre six personnes en écriture
    // et plus personne n'aurait de raison de prendre Famille.
    const d = canCreateSharedGoal("free");
    expect(d.allowed).toBe(false);
    expect(!d.allowed && d.reason).toBe("needsSubscription");
  });

  it("ignore le quota personnel — l'espace n'est pas le sien", () => {
    // Solo est limité à trois objectifs chez lui ; dans l'espace de
    // quelqu'un d'autre, ce compte n'a aucun sens.
    expect(canCreateGoal("solo", 3).allowed).toBe(false);
    expect(canCreateSharedGoal("solo").allowed).toBe(true);
  });
});

describe("anniversaires du foyer", () => {
  it("appartiennent à la formule Famille, et à elle seule", () => {
    // C'est la seule fonctionnalité de l'app qui suive plusieurs personnes
    // d'un même foyer, avec leurs dates et leurs âges.
    expect(limitsFor("family").birthdays).toBe(true);
    for (const tier of ["free", "solo", "duo"] as const) {
      expect(limitsFor(tier).birthdays).toBe(false);
    }
  });
});
