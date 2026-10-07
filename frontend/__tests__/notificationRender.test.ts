// Chaque notification, dans chacune des huit langues, doit afficher du texte —
// jamais une clé. Le 7 octobre 2026, « notif.weekly.body » est apparu tel
// quel sur l'écran verrouillé de tous les abonnés : la clé passait par le
// résolveur des conseils, qui ne traduit que les clés « adv. ». Ce test
// construit TOUTES les candidates possibles et les rend comme l'app le fait.

import { CATALOGS, LANGUAGES, t as translate } from "../src/i18n";
import { ADVICE_CATALOG_FR } from "../src/lib/adviceEngine";
import { interpolate } from "../src/utils/advice";
import {
  buildCandidates,
  DEFAULT_NOTIF_PREFS,
  renderCandidate,
  type NotifContext,
} from "../src/utils/notificationEngine";

const NOW = new Date("2026-10-05T10:00:00Z"); // un lundi
const DAY = 24 * 3600 * 1000;

// Une vraie carte du catalogue : le corps d'une notification « droits » est
// le titre de la carte, résolu par sa clé i18n.
const card = ADVICE_CATALOG_FR.find((c) => typeof c.title === "string" && c.title.startsWith("adv."));

/** Un contexte où TOUTES les familles de notification ont une raison d'exister. */
const everything = (): NotifContext => ({
  now: NOW,
  prefs: { ...DEFAULT_NOTIF_PREFS, maxPerWeek: 7 },
  alreadySent: {},
  lastOpenedAt: new Date(NOW.getTime() - 10 * DAY),
  unseenRights: card ? [{ id: card.id, titleKey: card.title as string, priority: 96 }] : [],
  seasonalRights: card ? [{ id: `s-${card.id}`, titleKey: card.title as string, priority: 70 }] : [],
  goals: [{ id: "g1", label: "Vacances", current: 500, target: 1000 }],
  events: [
    {
      id: "e1",
      name: "Fête",
      emoji: "🎉",
      dateIso: "2026-12-20",
      nextMilestoneAt: new Date(NOW.getTime() + 5 * DAY),
      fundedRatio: 0.4,
    },
  ],
  loans: [{ id: "l1", name: "Voiture", remainingMonths: 3, remainingPrincipal: 1000, repaidPercent: 50 }],
  budgetFilledThisMonth: false,
  checkInDone: false,
  tier: "solo",
  remainingLabel: "412 €",
});

const RAW_KEY = /(^|\s)(notif|adv|evt|evtNotif|help|settings)\.[a-zA-Z0-9_.-]+/;

describe("rendu des notifications", () => {
  const candidates = buildCandidates(everything());

  it("couvre bien toutes les familles", () => {
    const cats = new Set(candidates.map((c) => c.category));
    expect(candidates.length).toBeGreaterThanOrEqual(5);
    expect(cats.has("rights")).toBe(true);
    expect(candidates.some((c) => c.id.startsWith("weekly-advice-"))).toBe(true);
  });

  for (const { code: lang } of LANGUAGES) {
    it(`n'affiche jamais une clé brute en ${lang}`, () => {
      const tt = (key: string, params?: Record<string, string | number>) => {
        const text = translate(key, lang);
        return params ? interpolate(text, params) : text;
      };
      for (const c of candidates) {
        const { title, body } = renderCandidate(c, tt);
        expect(title.trim().length).toBeGreaterThan(0);
        expect(body.trim().length).toBeGreaterThan(0);
        expect({ id: c.id, title }).not.toMatchObject({ title: expect.stringMatching(RAW_KEY) });
        expect({ id: c.id, body }).not.toMatchObject({ body: expect.stringMatching(RAW_KEY) });
        expect(body).not.toContain("{");
        expect(title).not.toContain("{");
      }
    });
  }

  it("a bien chaque clé de notification dans les huit catalogues", () => {
    const keys = new Set<string>();
    for (const c of candidates) {
      keys.add(c.titleKey);
      if (!c.bodyKey.startsWith("adv.")) keys.add(c.bodyKey);
    }
    for (const { code: lang } of LANGUAGES) {
      for (const k of keys) expect(`${lang}:${k}:${k in CATALOGS[lang]}`).toBe(`${lang}:${k}:true`);
    }
  });
});
