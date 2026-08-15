// Adaptateurs données → contexte de notifications.
//
// Ce qui est verrouillé ici : quand une donnée manque, l'adaptateur doit
// produire MOINS de notifications, jamais plus. Un jalon sans date, un
// objectif sans cible, un prêt sans date de départ : tous doivent disparaître
// silencieusement plutôt que déclencher une relance sur une supposition.

import type { EventProject } from "../src/lib/premiumStore";
import type { SavingsGoal } from "../src/types/premium";
import type { AdviceCard } from "../src/types/advice";
import {
  eventFundedRatio,
  isBudgetFilledThisMonth,
  minusMonths,
  monthKey,
  nextMilestoneAt,
  splitByWindow,
  toNotifEvents,
  toNotifGoals,
  toNotifLoans,
  toUnseenRights,
} from "../src/utils/notificationContext";

const NOW = new Date("2026-08-15T10:00:00");

const makeEvent = (over: Partial<EventProject> = {}): EventProject => ({
  id: "e1",
  type: "wedding",
  name: "Mariage",
  emoji: "💍",
  dateIso: "2027-06-20",
  items: [],
  milestones: [],
  saved: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("minusMonths", () => {
  it("recule d'un mois", () => {
    expect(minusMonths(new Date("2026-06-20T12:00:00"), 3).getMonth()).toBe(2); // mars
  });

  it("ne déborde pas sur un mois plus court", () => {
    // 31 mars − 1 mois : février n'a pas de 31. Sans garde, JS renvoie le 3 mars.
    const d = minusMonths(new Date("2026-03-31T12:00:00"), 1);
    expect(d.getMonth()).toBe(1); // février
    expect(d.getDate()).toBe(28);
  });

  it("traverse l'année", () => {
    const d = minusMonths(new Date("2027-02-10T12:00:00"), 14);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(11); // décembre
  });
});

describe("financement d'un événement", () => {
  it("compare l'épargne au total prévu", () => {
    const ev = makeEvent({
      saved: 3000,
      items: [
        { id: "a", label: "Salle", estimated: 4000 },
        { id: "b", label: "Traiteur", estimated: 6000 },
      ],
    });
    expect(eventFundedRatio(ev)).toBeCloseTo(0.3);
  });

  it("préfère le devis réel à l'estimation", () => {
    const ev = makeEvent({
      saved: 1000,
      items: [{ id: "a", label: "Salle", estimated: 4000, actual: 2000 }],
    });
    expect(eventFundedRatio(ev)).toBeCloseTo(0.5);
  });

  it("considère financé un événement sans poste chiffré", () => {
    // Rien à financer : pas d'alerte. Renvoyer 0 déclencherait une relance
    // sur un événement que l'utilisateur vient à peine de créer.
    expect(eventFundedRatio(makeEvent())).toBe(1);
  });

  it("plafonne à 1 quand on a trop épargné", () => {
    const ev = makeEvent({ saved: 9000, items: [{ id: "a", label: "X", estimated: 1000 }] });
    expect(eventFundedRatio(ev)).toBe(1);
  });
});

describe("prochain jalon", () => {
  const withMilestones = (ms: { id: string; label: string; monthsBefore: number; done?: boolean }[]) =>
    makeEvent({ dateIso: "2027-06-20", milestones: ms });

  it("prend le plus proche encore à venir", () => {
    const ev = withMilestones([
      { id: "m1", label: "Réserver la salle", monthsBefore: 12 }, // juin 2026 : passé
      { id: "m2", label: "Traiteur", monthsBefore: 8 }, // oct. 2026
      { id: "m3", label: "Faire-part", monthsBefore: 4 }, // févr. 2027
    ]);
    const d = nextMilestoneAt(ev, NOW)!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9); // octobre
  });

  it("ignore les jalons déjà cochés", () => {
    const ev = withMilestones([
      { id: "m2", label: "Traiteur", monthsBefore: 8, done: true },
      { id: "m3", label: "Faire-part", monthsBefore: 4 },
    ]);
    expect(nextMilestoneAt(ev, NOW)!.getMonth()).toBe(1); // février
  });

  it("ne renvoie rien quand tout est passé ou fait", () => {
    const ev = withMilestones([{ id: "m1", label: "Salle", monthsBefore: 24 }]);
    expect(nextMilestoneAt(ev, NOW)).toBeUndefined();
  });

  it("ne renvoie rien sur une date d'événement invalide", () => {
    const ev = makeEvent({ dateIso: "pas-une-date", milestones: [{ id: "m", label: "X", monthsBefore: 1 }] });
    expect(nextMilestoneAt(ev, NOW)).toBeUndefined();
  });
});

describe("toNotifEvents", () => {
  it("écarte les événements passés", () => {
    const out = toNotifEvents([makeEvent({ dateIso: "2026-01-01" }), makeEvent({ id: "e2" })], NOW);
    expect(out.map((e) => e.id)).toEqual(["e2"]);
  });

  it("reporte nom, emoji et financement", () => {
    const out = toNotifEvents(
      [makeEvent({ saved: 500, items: [{ id: "a", label: "X", estimated: 1000 }] })],
      NOW,
    );
    expect(out[0]).toMatchObject({ name: "Mariage", emoji: "💍", fundedRatio: 0.5 });
  });
});

describe("toNotifGoals", () => {
  const goal = (over: Partial<SavingsGoal>): SavingsGoal => ({
    id: "g1",
    label: "Japon",
    targetAmount: 1000,
    currentAmount: 250,
    extraP: false,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...over,
  });

  it("convertit les montants", () => {
    expect(toNotifGoals([goal({})])[0]).toEqual({
      id: "g1",
      label: "Japon",
      current: 250,
      target: 1000,
    });
  });

  it("écarte un objectif sans cible — aucun palier à franchir", () => {
    expect(toNotifGoals([goal({ targetAmount: 0 })])).toEqual([]);
  });
});

describe("toNotifLoans", () => {
  const loan = {
    id: "l1",
    name: "Immo",
    principal: 200_000,
    ratePercent: 3.5,
    years: 20,
    startDate: "2024-01-05",
    monthlyPayment: 1160,
  };

  it("calcule l'avancement réel", () => {
    const out = toNotifLoans([loan], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].remainingMonths).toBeGreaterThan(200);
    expect(out[0].remainingPrincipal).toBeGreaterThan(0);
  });

  it("ignore un prêt sans date de départ plutôt que d'en supposer une", () => {
    expect(toNotifLoans([{ ...loan, startDate: undefined }], NOW)).toEqual([]);
  });

  it("ignore un prêt arrivé à terme", () => {
    expect(toNotifLoans([{ ...loan, startDate: "2000-01-05" }], NOW)).toEqual([]);
  });

  it("ignore un prêt aux données incohérentes", () => {
    expect(toNotifLoans([{ ...loan, principal: 0 }], NOW)).toEqual([]);
  });
});

describe("toUnseenRights", () => {
  const card = (id: string, priority: number): AdviceCard =>
    ({
      id,
      category: "budget",
      titleKey: `adv.${id}.title`,
      action: { type: "none" },
      appliesWhen: () => true,
      priority,
      sources: [],
      lastVerified: "2026-01-01",
    }) as unknown as AdviceCard;

  it("retire ce qui a déjà été vu", () => {
    const out = toUnseenRights([card("a", 90), card("b", 80)], ["a"]);
    expect(out.map((r) => r.id)).toEqual(["b"]);
  });

  it("plafonne la liste", () => {
    const many = Array.from({ length: 40 }, (_, i) => card(`c${i}`, 50));
    expect(toUnseenRights(many, [], 5)).toHaveLength(5);
  });

  it("retombe sur le titre en dur des cartes non migrées", () => {
    const legacy = { ...card("x", 70), titleKey: undefined, title: "Vieux conseil" };
    expect(toUnseenRights([legacy as AdviceCard], [])[0].titleKey).toBe("Vieux conseil");
  });

  it("écarte une carte sans aucun texte", () => {
    const muette = { ...card("y", 70), titleKey: undefined, title: undefined };
    expect(toUnseenRights([muette as AdviceCard], [])).toEqual([]);
  });
});

describe("splitByWindow", () => {
  const card = (id: string, months?: number[]): AdviceCard =>
    ({ id, months, priority: 50 }) as unknown as AdviceCard;

  it("sépare le permanent du saisonnier", () => {
    const { evergreen, seasonal } = splitByWindow([
      card("fonds-urgence"),
      card("declaration-impots", [4, 5, 6]),
    ]);
    expect(evergreen.map((c) => c.id)).toEqual(["fonds-urgence"]);
    expect(seasonal.map((c) => c.id)).toEqual(["declaration-impots"]);
  });

  it("ne prend pas 12 mois sur 12 pour une fenêtre", () => {
    const toutelannee = card("x", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(splitByWindow([toutelannee]).seasonal).toEqual([]);
  });

  it("traite un tableau vide comme du permanent", () => {
    expect(splitByWindow([card("y", [])]).evergreen).toHaveLength(1);
  });
});

describe("budget du mois", () => {
  it("formate la clé de mois sur deux chiffres", () => {
    expect(monthKey(new Date("2026-03-04T10:00:00"))).toBe("2026-03");
  });

  it("reconnaît un mois enregistré", () => {
    const hist = [{ month: "2026-08", net: 3000, expenses: 2000, remaining: 1000 }];
    expect(isBudgetFilledThisMonth(hist, NOW)).toBe(true);
  });

  it("ne confond pas avec le mois précédent", () => {
    const hist = [{ month: "2026-07", net: 3000, expenses: 2000, remaining: 1000 }];
    expect(isBudgetFilledThisMonth(hist, NOW)).toBe(false);
  });

  it("historique vide = budget non rempli", () => {
    expect(isBudgetFilledThisMonth([], NOW)).toBe(false);
  });
});
