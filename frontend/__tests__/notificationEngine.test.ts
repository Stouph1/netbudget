// Moteur de notifications.
//
// Ce qui est verrouillé ici : le plafond hebdomadaire, l'absence de doublon,
// l'ordre de valeur, et le fait qu'on ne relance JAMAIS quelqu'un sans avoir
// quelque chose d'utile à lui dire. Une app d'argent qui harcèle se fait
// couper les notifications, puis désinstaller.

import {
  applyBudgetLimits,
  buildCandidates,
  DEFAULT_NOTIF_PREFS,
  planNotifications,
  type NotifContext,
  type NotifPrefs,
} from "../src/utils/notificationEngine";

const NOW = new Date("2026-08-15T10:00:00Z");

const baseCtx = (over: Partial<NotifContext> = {}): NotifContext => ({
  now: NOW,
  prefs: DEFAULT_NOTIF_PREFS,
  alreadySent: {},
  unseenRights: [],
  goals: [],
  events: [],
  loans: [],
  budgetFilledThisMonth: true,
  ...over,
});

describe("droits non réclamés", () => {
  it("propose le conseil de plus forte priorité", () => {
    const out = buildCandidates(
      baseCtx({
        unseenRights: [
          { id: "hand-mva", titleKey: "adv.hand-mva.title", priority: 82 },
          { id: "hand-aah", titleKey: "adv.hand-aah.title", priority: 96 },
        ],
      }),
    );
    const rights = out.filter((c) => c.category === "rights");
    expect(rights).toHaveLength(1); // un seul à la fois, jamais une rafale
    expect(rights[0].bodyKey).toBe("adv.hand-aah.title");
  });

  it("ouvre l'écran des conseils au tap", () => {
    const out = buildCandidates(
      baseCtx({ unseenRights: [{ id: "x", titleKey: "adv.x.title", priority: 90 }] }),
    );
    expect(out[0].route).toBe("/(premium)/advice");
  });

  it("ne propose rien quand tout a été vu", () => {
    expect(buildCandidates(baseCtx()).filter((c) => c.category === "rights")).toEqual([]);
  });
});

describe("événements", () => {
  const ev = {
    id: "e1",
    name: "Mariage",
    emoji: "💍",
    dateIso: "2027-06-20",
    fundedRatio: 0.9,
  };

  it("rappelle un jalon à venir", () => {
    const out = buildCandidates(
      baseCtx({
        events: [{ ...ev, nextMilestoneAt: new Date("2026-09-01T09:00:00Z") }],
      }),
    );
    expect(out.some((c) => c.id.startsWith("event-ms-"))).toBe(true);
  });

  it("ignore un jalon déjà passé", () => {
    const out = buildCandidates(
      baseCtx({
        events: [{ ...ev, nextMilestoneAt: new Date("2026-01-01T09:00:00Z") }],
      }),
    );
    expect(out.some((c) => c.id.startsWith("event-ms-"))).toBe(false);
  });

  it("alerte sur un événement proche et sous-financé", () => {
    const proche = { ...ev, dateIso: "2026-09-10", fundedRatio: 0.3 };
    const out = buildCandidates(baseCtx({ events: [proche] }));
    expect(out.some((c) => c.id === "event-fund-e1")).toBe(true);
  });

  it("n'alerte PAS si le financement suit", () => {
    const proche = { ...ev, dateIso: "2026-09-10", fundedRatio: 0.95 };
    const out = buildCandidates(baseCtx({ events: [proche] }));
    expect(out.some((c) => c.id === "event-fund-e1")).toBe(false);
  });

  it("n'alerte pas trop tôt (au-delà de 45 jours)", () => {
    const lointain = { ...ev, dateIso: "2027-06-20", fundedRatio: 0.1 };
    const out = buildCandidates(baseCtx({ events: [lointain] }));
    expect(out.some((c) => c.id === "event-fund-e1")).toBe(false);
  });
});

describe("objectifs d'épargne", () => {
  it("célèbre le palier atteint le plus élevé", () => {
    const out = buildCandidates(
      baseCtx({ goals: [{ id: "g1", label: "Japon", current: 800, target: 1000 }] }),
    );
    const goal = out.find((c) => c.category === "goal")!;
    expect(goal.params?.pct).toBe(75);
  });

  it("distingue l'objectif atteint d'une étape", () => {
    const out = buildCandidates(
      baseCtx({ goals: [{ id: "g1", label: "Japon", current: 1000, target: 1000 }] }),
    );
    expect(out.find((c) => c.category === "goal")!.titleKey).toBe("notif.goal.done.title");
  });

  it("ne dit rien sous le premier palier", () => {
    const out = buildCandidates(
      baseCtx({ goals: [{ id: "g1", label: "Japon", current: 100, target: 1000 }] }),
    );
    expect(out.filter((c) => c.category === "goal")).toEqual([]);
  });

  it("ne divise pas par zéro", () => {
    const out = buildCandidates(
      baseCtx({ goals: [{ id: "g1", label: "X", current: 50, target: 0 }] }),
    );
    expect(out.filter((c) => c.category === "goal")).toEqual([]);
  });
});

describe("budget du mois", () => {
  it("relance quand le mois est entamé et le budget vide", () => {
    const out = buildCandidates(
      baseCtx({ now: new Date("2026-08-12T10:00:00Z"), budgetFilledThisMonth: false }),
    );
    expect(out.some((c) => c.category === "budget")).toBe(true);
  });

  it("ne relance PAS en début de mois — ce serait du bruit", () => {
    const out = buildCandidates(
      baseCtx({ now: new Date("2026-08-03T10:00:00Z"), budgetFilledThisMonth: false }),
    );
    expect(out.some((c) => c.category === "budget")).toBe(false);
  });
});

describe("reprise après absence", () => {
  it("ne relance QUE s'il y a du neuf à montrer", () => {
    const absent = new Date("2026-07-01T10:00:00Z"); // 45 jours
    const sansRien = buildCandidates(baseCtx({ lastOpenedAt: absent }));
    expect(sansRien.some((c) => c.category === "comeback")).toBe(false);

    const avecDuNeuf = buildCandidates(
      baseCtx({
        lastOpenedAt: absent,
        unseenRights: [
          { id: "a", titleKey: "t", priority: 50 },
          { id: "b", titleKey: "t", priority: 40 },
          { id: "c", titleKey: "t", priority: 30 },
        ],
      }),
    );
    expect(avecDuNeuf.some((c) => c.category === "comeback")).toBe(true);
  });

  it("laisse tranquille avant 3 semaines d'absence", () => {
    const out = buildCandidates(
      baseCtx({
        lastOpenedAt: new Date("2026-08-05T10:00:00Z"), // 10 jours
        unseenRights: [
          { id: "a", titleKey: "t", priority: 50 },
          { id: "b", titleKey: "t", priority: 40 },
          { id: "c", titleKey: "t", priority: 30 },
        ],
      }),
    );
    expect(out.some((c) => c.category === "comeback")).toBe(false);
  });
});

describe("préférences", () => {
  it("respecte une catégorie désactivée", () => {
    const prefs: NotifPrefs = { ...DEFAULT_NOTIF_PREFS, rights: false };
    const out = buildCandidates(
      baseCtx({ prefs, unseenRights: [{ id: "x", titleKey: "t", priority: 99 }] }),
    );
    expect(out.filter((c) => c.category === "rights")).toEqual([]);
  });

  it("envoie à l'heure choisie", () => {
    const prefs: NotifPrefs = { ...DEFAULT_NOTIF_PREFS, hour: 9 };
    const out = buildCandidates(
      baseCtx({ prefs, unseenRights: [{ id: "x", titleKey: "t", priority: 90 }] }),
    );
    expect(out[0].at.getHours()).toBe(9);
  });

  it("ne renvoie jamais une notification déjà envoyée", () => {
    const out = buildCandidates(
      baseCtx({
        unseenRights: [{ id: "x", titleKey: "t", priority: 90 }],
        alreadySent: { "rights-x": "2026-07-01" },
      }),
    );
    expect(out.filter((c) => c.category === "rights")).toEqual([]);
  });
});

describe("plafonds anti-harcèlement", () => {
  const many = () =>
    baseCtx({
      unseenRights: [{ id: "r", titleKey: "t", priority: 99 }],
      budgetFilledThisMonth: false,
      now: new Date("2026-08-12T10:00:00Z"),
      goals: [
        { id: "g1", label: "A", current: 900, target: 1000 },
        { id: "g2", label: "B", current: 600, target: 1000 },
        { id: "g3", label: "C", current: 300, target: 1000 },
      ],
      loans: [
        { id: "l1", name: "Immo", remainingMonths: 24, remainingPrincipal: 100_000 },
        { id: "l2", name: "Auto", remainingMonths: 12, remainingPrincipal: 5000 },
      ],
    });

  it("ne dépasse jamais le plafond hebdomadaire", () => {
    const ctx = many();
    const planned = planNotifications(ctx);
    expect(planned.length).toBeLessThanOrEqual(ctx.prefs.maxPerWeek);
  });

  it("n'envoie jamais deux notifications le même jour", () => {
    const planned = planNotifications(many());
    const days = planned.map((c) => c.at.toISOString().slice(0, 10));
    expect(new Set(days).size).toBe(days.length);
  });

  it("garde les plus utiles quand il faut choisir", () => {
    const planned = planNotifications(many());
    // Le droit non réclamé (95) doit survivre à l'écrémage, pas le jalon de
    // prêt (55) qui n'apprend rien d'actionnable.
    expect(planned[0].category).toBe("rights");
  });

  it("respecte un plafond resserré", () => {
    const ctx = many();
    ctx.prefs = { ...ctx.prefs, maxPerWeek: 1 };
    expect(planNotifications(ctx)).toHaveLength(1);
  });

  it("ne planifie rien pour un utilisateur sans données", () => {
    expect(planNotifications(baseCtx())).toEqual([]);
  });
});

describe("ordre de valeur", () => {
  it("classe par utilité réelle", () => {
    const out = buildCandidates(
      baseCtx({
        unseenRights: [{ id: "r", titleKey: "t", priority: 99 }],
        goals: [{ id: "g", label: "A", current: 300, target: 1000 }],
        loans: [{ id: "l", name: "X", remainingMonths: 24, remainingPrincipal: 1000 }],
      }),
    );
    const scores = out.map((c) => c.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});
