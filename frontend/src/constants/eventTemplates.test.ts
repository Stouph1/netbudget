// Budgets d'événements : génération des postes, jalons et messages.
//
// Point sensible : les libellés persistés sont des CLÉS i18n, mais les
// événements créés AVANT cette migration contiennent du texte français en dur.
// Les deux doivent s'afficher correctement — un budget de mariage illisible,
// c'est un utilisateur perdu.

import {
  buildEventItems,
  buildEventMilestones,
  eventMessage,
  EVENT_TEMPLATES,
  EVENT_TIERS,
  eventTotals,
  monthlyNeeded,
  monthsUntil,
  resolveEventLabel,
  styleFor,
  templateFor,
} from "./eventTemplates";
import type { EventProject } from "../lib/premiumStore";

// Traducteur factice : renvoie la clé préfixée pour distinguer traduit / brut.
const t = (k: string) => (k.startsWith("evt.") ? `[${k}]` : k);

describe("catalogue de modèles", () => {
  it("expose les 7 modèles attendus", () => {
    expect(EVENT_TEMPLATES).toHaveLength(7);
  });

  it("n'a aucun type en double", () => {
    const types = EVENT_TEMPLATES.map((x) => x.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("déclare 3 gammes sur chaque modèle", () => {
    for (const tpl of EVENT_TEMPLATES) {
      expect(Object.keys(tpl.tierLabelKeys)).toHaveLength(3);
    }
    expect(EVENT_TIERS).toHaveLength(3);
  });

  it("porte au moins un poste de dépense et un jalon par modèle", () => {
    for (const tpl of EVENT_TEMPLATES) {
      expect(tpl.items.length).toBeGreaterThan(0);
      expect(tpl.milestones.length).toBeGreaterThan(0);
    }
  });

  it("fournit les 4 messages de coach sur chaque modèle", () => {
    for (const tpl of EVENT_TEMPLATES) {
      for (const k of ["early", "onTrack", "behind", "lastStretch"] as const) {
        expect(tpl.cheerKeys[k]).toBeTruthy();
      }
    }
  });

  it("termine chaque rétro-planning par le jour J (monthsBefore = 0)", () => {
    for (const tpl of EVENT_TEMPLATES) {
      expect(tpl.milestones.some((m) => m.monthsBefore === 0)).toBe(true);
    }
  });

  it("ordonne les jalons du plus lointain au plus proche", () => {
    for (const tpl of EVENT_TEMPLATES) {
      const months = tpl.milestones.map((m) => m.monthsBefore);
      expect([...months].sort((a, b) => b - a)).toEqual(months);
    }
  });
});

describe("resolveEventLabel", () => {
  it("traduit une clé", () => {
    expect(resolveEventLabel("evt.wedding.item.catering", t)).toBe(
      "[evt.wedding.item.catering]",
    );
  });

  it("laisse intact le texte d'un événement créé avant la migration", () => {
    // Rétrocompatibilité : ces libellés sont déjà en base chez les utilisateurs.
    expect(resolveEventLabel("Réception & traiteur", t)).toBe("Réception & traiteur");
  });

  it("affiche la clé plutôt que de casser si la traduction manque", () => {
    const noTranslation = (k: string) => k;
    expect(resolveEventLabel("evt.inconnu.xyz", noTranslation)).toBe("evt.inconnu.xyz");
  });

  it("tolère une chaîne vide", () => {
    expect(resolveEventLabel("", t)).toBe("");
  });
});

describe("buildEventItems", () => {
  const wedding = templateFor("wedding")!;

  it("multiplie les postes par invité", () => {
    const p10 = buildEventItems(wedding, "mid", 10);
    const p100 = buildEventItems(wedding, "mid", 100);
    const perGuest = (list: typeof p10) =>
      list.find((i) => i.label.includes("catering"))!.estimated;
    expect(perGuest(p100)).toBeGreaterThan(perGuest(p10) * 5);
  });

  it("propose les postes optionnels à zéro", () => {
    const items = buildEventItems(wedding, "mid", 90);
    const honeymoon = items.find((i) => i.label.includes("honeymoon"));
    expect(honeymoon?.estimated).toBe(0);
  });

  it("applique le facteur du style choisi", () => {
    const travel = templateFor("travel")!;
    const base = buildEventItems(travel, "mid", 2).reduce((s, i) => s + i.estimated, 0);
    const cheap = buildEventItems(travel, "mid", 2, "aventure").reduce(
      (s, i) => s + i.estimated,
      0,
    );
    // Style « aventure pas chère » = -25 %.
    expect(cheap / base).toBeCloseTo(0.75, 2);
  });

  it("ignore un style inconnu au lieu de casser", () => {
    const base = buildEventItems(wedding, "mid", 90).reduce((s, i) => s + i.estimated, 0);
    const bogus = buildEventItems(wedding, "mid", 90, "style-inexistant").reduce(
      (s, i) => s + i.estimated,
      0,
    );
    expect(bogus).toBe(base);
  });

  it("reste cohérent quand la gamme monte", () => {
    const total = (tier: "low" | "mid" | "high") =>
      buildEventItems(wedding, tier, 90).reduce((s, i) => s + i.estimated, 0);
    expect(total("low")).toBeLessThan(total("mid"));
    expect(total("mid")).toBeLessThan(total("high"));
  });

  it("persiste des CLÉS, pour que l'événement suive la langue", () => {
    const items = buildEventItems(wedding, "mid", 90);
    expect(items.every((i) => i.label.startsWith("evt."))).toBe(true);
  });
});

describe("styleFor", () => {
  it("retrouve un style et son conseil", () => {
    const travel = templateFor("travel")!;
    expect(styleFor(travel, "aventure")?.tipKey).toBeTruthy();
  });

  it("renvoie undefined pour un style absent", () => {
    expect(styleFor(templateFor("baby")!, "aventure")).toBeUndefined();
  });
});

describe("eventTotals et monthlyNeeded", () => {
  const makeEvent = (over: Partial<EventProject> = {}): EventProject =>
    ({
      id: "e1",
      type: "wedding",
      name: "Test",
      emoji: "💍",
      dateIso: "2027-06-20",
      items: [
        { id: "a", label: "x", estimated: 10_000, actual: null },
        { id: "b", label: "y", estimated: 2000, actual: 1800 },
      ],
      milestones: [],
      saved: 3000,
      createdAt: "2026-06-20T00:00:00.000Z",
      ...over,
    }) as EventProject;

  it("additionne prévu et dépensé séparément", () => {
    const { planned, spent } = eventTotals(makeEvent());
    expect(planned).toBe(12_000);
    expect(spent).toBe(1800);
  });

  it("calcule l'épargne mensuelle nécessaire", () => {
    const now = new Date("2026-06-20");
    const ev = makeEvent();
    // 9 000 restants sur 12 mois → 750/mois
    expect(monthlyNeeded(ev, now)).toBeCloseTo(750, 0);
  });

  it("demande le solde d'un coup si l'échéance est imminente", () => {
    const ev = makeEvent({ dateIso: "2026-06-25" });
    expect(monthlyNeeded(ev, new Date("2026-06-20"))).toBeCloseTo(9000, 0);
  });

  it("ne demande rien quand l'objectif est atteint", () => {
    const ev = makeEvent({ saved: 15_000 });
    expect(monthlyNeeded(ev, new Date("2026-06-20"))).toBe(0);
  });

  it("ne renvoie jamais un temps restant négatif", () => {
    expect(monthsUntil("2020-01-01", new Date("2026-06-20"))).toBe(0);
  });
});

describe("eventMessage", () => {
  const base: EventProject = {
    id: "e1",
    type: "wedding",
    name: "Mariage",
    emoji: "💍",
    dateIso: "2027-06-20",
    items: [{ id: "a", label: "x", estimated: 12_000, actual: null }],
    milestones: [],
    saved: 0,
    createdAt: "2026-06-20T00:00:00.000Z",
  } as EventProject;

  it("encourage en début de projet", () => {
    expect(eventMessage(base, t, new Date("2026-07-01"))).toContain("early");
  });

  it("alerte quand le financement décroche", () => {
    const late = { ...base, createdAt: "2025-01-01T00:00:00.000Z" };
    expect(eventMessage(late, t, new Date("2027-03-01"))).toContain("behind");
  });

  it("passe en dernière ligne droite le dernier mois", () => {
    expect(eventMessage(base, t, new Date("2027-06-10"))).toContain("lastStretch");
  });

  it("félicite quand tout est financé", () => {
    const funded = { ...base, saved: 12_000 };
    expect(eventMessage(funded, t, new Date("2026-09-01"))).toContain("early");
  });
});

describe("buildEventMilestones", () => {
  it("reprend tous les jalons du modèle, non cochés", () => {
    const tpl = templateFor("wedding")!;
    const ms = buildEventMilestones(tpl);
    expect(ms).toHaveLength(tpl.milestones.length);
    expect(ms.every((m) => m.done === false)).toBe(true);
  });

  it("attribue des identifiants uniques", () => {
    const ms = buildEventMilestones(templateFor("travel")!);
    expect(new Set(ms.map((m) => m.id)).size).toBe(ms.length);
  });
});
