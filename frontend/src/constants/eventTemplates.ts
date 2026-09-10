// Modèles de budgets d'événements : mariage, voyage, naissance, funérailles,
// fêtes… L'utilisateur choisit un type, répond à 2-3 questions (date, invités,
// gamme) et obtient un budget par postes + un rétro-planning, qu'il ajuste.
//
// Chiffres indicatifs : ordres de grandeur calés sur des études citées dans
// le corpus docs/ (vérifié 2026-08) — Mariages.net « Rapport Secteur Nuptial
// 2026 » (19 293 € moyen, 90 invités, traiteur assis 80-130 €/pers.),
// UFC/presse funéraire (crémation 2 400-4 500 €, inhumation 3 500-7 000 €),
// MAIF/Cofidis équipement bébé (2 500-4 500 €), Europ Assistance/Ipsos 2025
// (vacances 1 774 €/foyer), Cofidis/CSA Noël 2025 (491 €). Ce sont des POINTS
// DE DÉPART affichés comme tels — l'utilisateur remplace par ses vrais devis.
//
// ============================================================================
// INTERNATIONALISATION
// ----------------------------------------------------------------------------
// Ce module est un module de DONNÉES : pas de contexte React, donc pas de `t`.
// Il ne contient donc AUCUN texte affichable, uniquement des CLÉS i18n
// (préfixe `evt.`) que les écrans traduisent au rendu via `useLang().t`.
//
// Les postes (EventLineItem) et jalons (EventMilestone) créés ici sont
// PERSISTÉS (premiumStore) : on y stocke la CLÉ, pas le texte traduit, pour
// qu'un événement créé en français bascule bien en anglais au changement de
// langue. Les événements enregistrés AVANT cette migration contiennent du
// texte français en dur : `resolveEventLabel()` les affiche tels quels.
// ============================================================================

import type { EventLineItem, EventMilestone, EventProject, EventQuote } from "../lib/premiumStore";

export type EventTier = "low" | "mid" | "high";

/** Préfixe des clés i18n de ce module — sert à distinguer clé et texte legacy. */
export const EVENT_KEY_PREFIX = "evt.";

/**
 * Affiche un libellé persisté : traduit s'il s'agit d'une clé du catalogue,
 * rendu tel quel s'il s'agit d'un texte (événements d'avant la migration, ou
 * clé absente du catalogue — `t()` renvoie alors la clé elle-même).
 */
export function resolveEventLabel(labelOrKey: string, t: (key: string) => string): string {
  if (!labelOrKey || !labelOrKey.startsWith(EVENT_KEY_PREFIX)) return labelOrKey;
  const translated = t(labelOrKey);
  return translated === labelOrKey ? labelOrKey : translated;
}

// Un poste du template : soit un montant fixe par gamme, soit un montant
// PAR INVITÉ par gamme (traiteur…), soit purement à remplir (0 par défaut).
type TemplateItem = {
  labelKey: string;
  emoji: string;
  kind: "fixed" | "perGuest" | "blank";
  tiers?: Record<EventTier, number>; // € (par invité si kind = perGuest)
  optional?: boolean; // proposé décoché à la création
};

export type EventStyle = {
  key: string;
  labelKey: string;
  // Conseils concrets affichés dans le détail — adaptés au style choisi.
  tipKey: string;
  // Multiplicateur doux appliqué aux montants proposés (0.8 = style économe).
  factor?: number;
};

export type EventTemplate = {
  type: string;
  emoji: string;
  labelKey: string;
  taglineKey: string; // une phrase d'accroche dans le sélecteur
  asksDestinations?: boolean; // voyage : une ou plusieurs étapes
  asksGuests: boolean;
  guestsLabelKey?: string;
  tierLabelKeys: Record<EventTier, string>;
  styles?: EventStyle[]; // mini-questionnaire « quel esprit ? »
  items: TemplateItem[];
  milestones: { labelKey: string; monthsBefore: number }[];
  // Messages personnalisés selon l'avancement (voir eventMessage()).
  cheerKeys: {
    early: string; // longtemps avant, financement en avance
    onTrack: string;
    behind: string;
    lastStretch: string; // dernier mois
  };
};

export const EVENT_TIERS: { key: EventTier; labelKey: string }[] = [
  { key: "low", labelKey: "evt.tier.low" },
  { key: "mid", labelKey: "evt.tier.mid" },
  { key: "high", labelKey: "evt.tier.high" },
];

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: "wedding",
    emoji: "💍",
    labelKey: "evt.wedding.label",
    taglineKey: "evt.wedding.tagline",
    asksGuests: true,
    guestsLabelKey: "evt.wedding.guests",
    tierLabelKeys: {
      low: "evt.wedding.tier.low",
      mid: "evt.wedding.tier.mid",
      high: "evt.wedding.tier.high",
    },
    styles: [
      { key: "champetre", labelKey: "evt.wedding.style.champetre.label", tipKey: "evt.wedding.style.champetre.tip", factor: 0.95 },
      { key: "urbain", labelKey: "evt.wedding.style.urbain.label", tipKey: "evt.wedding.style.urbain.tip", factor: 1.1 },
      { key: "traditionnel", labelKey: "evt.wedding.style.traditionnel.label", tipKey: "evt.wedding.style.traditionnel.tip", factor: 1.0 },
      { key: "eco", labelKey: "evt.wedding.style.eco.label", tipKey: "evt.wedding.style.eco.tip", factor: 0.8 },
    ],
    items: [
      { labelKey: "evt.wedding.item.catering", emoji: "🍽️", kind: "perGuest", tiers: { low: 55, mid: 95, high: 140 } },
      { labelKey: "evt.wedding.item.venue", emoji: "🏛️", kind: "fixed", tiers: { low: 1500, mid: 4500, high: 8000 } },
      { labelKey: "evt.wedding.item.attire", emoji: "🤵👰", kind: "fixed", tiers: { low: 700, mid: 2600, high: 5000 } },
      { labelKey: "evt.wedding.item.photo", emoji: "📸", kind: "fixed", tiers: { low: 600, mid: 1500, high: 3500 } },
      { labelKey: "evt.wedding.item.music", emoji: "🎶", kind: "fixed", tiers: { low: 400, mid: 900, high: 1800 } },
      { labelKey: "evt.wedding.item.flowers", emoji: "💐", kind: "fixed", tiers: { low: 400, mid: 1200, high: 2500 } },
      { labelKey: "evt.wedding.item.rings", emoji: "💫", kind: "fixed", tiers: { low: 300, mid: 800, high: 1500 } },
      { labelKey: "evt.wedding.item.stationery", emoji: "✉️", kind: "fixed", tiers: { low: 100, mid: 400, high: 900 } },
      { labelKey: "evt.wedding.item.beauty", emoji: "💄", kind: "fixed", tiers: { low: 100, mid: 400, high: 1000 } },
      { labelKey: "evt.wedding.item.ceremony", emoji: "⛪", kind: "fixed", tiers: { low: 0, mid: 300, high: 900 } },
      { labelKey: "evt.wedding.item.transport", emoji: "🚗", kind: "fixed", tiers: { low: 0, mid: 400, high: 1200 }, optional: true },
      { labelKey: "evt.wedding.item.honeymoon", emoji: "🏝️", kind: "fixed", tiers: { low: 0, mid: 3000, high: 6000 }, optional: true },
      { labelKey: "evt.wedding.item.contract", emoji: "📜", kind: "fixed", tiers: { low: 350, mid: 450, high: 800 }, optional: true },
      { labelKey: "evt.wedding.item.dowry", emoji: "🎁", kind: "blank", optional: true },
      { labelKey: "evt.wedding.item.buffer", emoji: "🛟", kind: "blank" },
    ],
    milestones: [
      { labelKey: "evt.wedding.ms.date", monthsBefore: 12 },
      { labelKey: "evt.wedding.ms.venue", monthsBefore: 12 },
      { labelKey: "evt.wedding.ms.vendors", monthsBefore: 9 },
      { labelKey: "evt.wedding.ms.attire", monthsBefore: 8 },
      { labelKey: "evt.wedding.ms.invites", monthsBefore: 5 },
      { labelKey: "evt.wedding.ms.paperwork", monthsBefore: 4 },
      { labelKey: "evt.wedding.ms.fittings", monthsBefore: 2 },
      { labelKey: "evt.wedding.ms.confirm", monthsBefore: 1 },
      { labelKey: "evt.wedding.ms.dday", monthsBefore: 0 },
    ],
    cheerKeys: {
      early: "evt.wedding.cheer.early",
      onTrack: "evt.wedding.cheer.onTrack",
      behind: "evt.wedding.cheer.behind",
      lastStretch: "evt.wedding.cheer.lastStretch",
    },
  },
  {
    type: "travel",
    emoji: "✈️",
    labelKey: "evt.travel.label",
    taglineKey: "evt.travel.tagline",
    asksDestinations: true,
    asksGuests: true,
    guestsLabelKey: "evt.travel.guests",
    tierLabelKeys: {
      low: "evt.travel.tier.low",
      mid: "evt.travel.tier.mid",
      high: "evt.travel.tier.high",
    },
    styles: [
      { key: "aventure", labelKey: "evt.travel.style.aventure.label", tipKey: "evt.travel.style.aventure.tip", factor: 0.75 },
      { key: "detente", labelKey: "evt.travel.style.detente.label", tipKey: "evt.travel.style.detente.tip", factor: 1.0 },
      { key: "culture", labelKey: "evt.travel.style.culture.label", tipKey: "evt.travel.style.culture.tip", factor: 0.9 },
      { key: "famille", labelKey: "evt.travel.style.famille.label", tipKey: "evt.travel.style.famille.tip", factor: 0.95 },
    ],
    items: [
      { labelKey: "evt.travel.item.transport", emoji: "✈️", kind: "perGuest", tiers: { low: 100, mid: 400, high: 1000 } },
      { labelKey: "evt.travel.item.lodging", emoji: "🏨", kind: "perGuest", tiers: { low: 150, mid: 500, high: 1200 } },
      { labelKey: "evt.travel.item.food", emoji: "🍜", kind: "perGuest", tiers: { low: 100, mid: 350, high: 800 } },
      { labelKey: "evt.travel.item.activities", emoji: "🎟️", kind: "perGuest", tiers: { low: 50, mid: 150, high: 500 } },
      { labelKey: "evt.travel.item.insurance", emoji: "🛡️", kind: "fixed", tiers: { low: 30, mid: 80, high: 200 } },
      { labelKey: "evt.travel.item.visa", emoji: "🛂", kind: "blank", optional: true },
      { labelKey: "evt.travel.item.localTransport", emoji: "🚌", kind: "fixed", tiers: { low: 50, mid: 150, high: 400 }, optional: true },
      { labelKey: "evt.travel.item.buffer", emoji: "🛟", kind: "blank" },
    ],
    milestones: [
      { labelKey: "evt.travel.ms.destination", monthsBefore: 6 },
      { labelKey: "evt.travel.ms.transport", monthsBefore: 4 },
      { labelKey: "evt.travel.ms.lodging", monthsBefore: 3 },
      { labelKey: "evt.travel.ms.documents", monthsBefore: 2 },
      { labelKey: "evt.travel.ms.insurance", monthsBefore: 1 },
      { labelKey: "evt.travel.ms.departure", monthsBefore: 0 },
    ],
    cheerKeys: {
      early: "evt.travel.cheer.early",
      onTrack: "evt.travel.cheer.onTrack",
      behind: "evt.travel.cheer.behind",
      lastStretch: "evt.travel.cheer.lastStretch",
    },
  },
  {
    type: "baby",
    emoji: "👶",
    labelKey: "evt.baby.label",
    taglineKey: "evt.baby.tagline",
    asksGuests: false,
    tierLabelKeys: {
      low: "evt.baby.tier.low",
      mid: "evt.baby.tier.mid",
      high: "evt.baby.tier.high",
    },
    items: [
      { labelKey: "evt.baby.item.stroller", emoji: "🍼", kind: "fixed", tiers: { low: 150, mid: 500, high: 1200 } },
      { labelKey: "evt.baby.item.carSeat", emoji: "🚗", kind: "fixed", tiers: { low: 80, mid: 250, high: 500 } },
      { labelKey: "evt.baby.item.bed", emoji: "🛏️", kind: "fixed", tiers: { low: 150, mid: 500, high: 1500 } },
      { labelKey: "evt.baby.item.clothes", emoji: "👕", kind: "fixed", tiers: { low: 100, mid: 300, high: 700 } },
      { labelKey: "evt.baby.item.diapers", emoji: "🧴", kind: "fixed", tiers: { low: 300, mid: 450, high: 700 } },
      { labelKey: "evt.baby.item.formula", emoji: "🍼", kind: "fixed", tiers: { low: 0, mid: 300, high: 500 }, optional: true },
      { labelKey: "evt.baby.item.gear", emoji: "🛁", kind: "fixed", tiers: { low: 80, mid: 250, high: 600 } },
      { labelKey: "evt.baby.item.childcare", emoji: "🏫", kind: "blank", optional: true },
      { labelKey: "evt.baby.item.buffer", emoji: "🛟", kind: "blank" },
    ],
    milestones: [
      { labelKey: "evt.baby.ms.declare", monthsBefore: 7 },
      { labelKey: "evt.baby.ms.daycare", monthsBefore: 6 },
      { labelKey: "evt.baby.ms.gear", monthsBefore: 3 },
      { labelKey: "evt.baby.ms.hospitalBag", monthsBefore: 1 },
      { labelKey: "evt.baby.ms.birth", monthsBefore: 0 },
    ],
    cheerKeys: {
      early: "evt.baby.cheer.early",
      onTrack: "evt.baby.cheer.onTrack",
      behind: "evt.baby.cheer.behind",
      lastStretch: "evt.baby.cheer.lastStretch",
    },
  },
  {
    type: "funeral",
    emoji: "🕊️",
    labelKey: "evt.funeral.label",
    taglineKey: "evt.funeral.tagline",
    asksGuests: false,
    tierLabelKeys: {
      low: "evt.funeral.tier.low",
      mid: "evt.funeral.tier.mid",
      high: "evt.funeral.tier.high",
    },
    items: [
      { labelKey: "evt.funeral.item.services", emoji: "⚱️", kind: "fixed", tiers: { low: 1500, mid: 2500, high: 4000 } },
      { labelKey: "evt.funeral.item.coffin", emoji: "🪦", kind: "fixed", tiers: { low: 500, mid: 1200, high: 3000 } },
      { labelKey: "evt.funeral.item.plot", emoji: "📜", kind: "fixed", tiers: { low: 300, mid: 800, high: 2500 } },
      { labelKey: "evt.funeral.item.ceremony", emoji: "🕯️", kind: "fixed", tiers: { low: 0, mid: 300, high: 800 } },
      { labelKey: "evt.funeral.item.flowers", emoji: "🤍", kind: "fixed", tiers: { low: 100, mid: 350, high: 800 } },
      { labelKey: "evt.funeral.item.reception", emoji: "🍽️", kind: "blank", optional: true },
      { labelKey: "evt.funeral.item.headstone", emoji: "🪨", kind: "blank", optional: true },
    ],
    milestones: [
      { labelKey: "evt.funeral.ms.quotes", monthsBefore: 0 },
      { labelKey: "evt.funeral.ms.aid", monthsBefore: 0 },
      { labelKey: "evt.funeral.ms.ceremony", monthsBefore: 0 },
    ],
    cheerKeys: {
      early: "evt.funeral.cheer.early",
      onTrack: "evt.funeral.cheer.onTrack",
      behind: "evt.funeral.cheer.behind",
      lastStretch: "evt.funeral.cheer.lastStretch",
    },
  },
  {
    type: "party",
    emoji: "🎉",
    labelKey: "evt.party.label",
    taglineKey: "evt.party.tagline",
    asksGuests: true,
    guestsLabelKey: "evt.party.guests",
    tierLabelKeys: {
      low: "evt.party.tier.low",
      mid: "evt.party.tier.mid",
      high: "evt.party.tier.high",
    },
    styles: [
      { key: "enfant", labelKey: "evt.party.style.enfant.label", tipKey: "evt.party.style.enfant.tip", factor: 0.9 },
      { key: "adulte", labelKey: "evt.party.style.adulte.label", tipKey: "evt.party.style.adulte.tip", factor: 1.0 },
      { key: "surprise", labelKey: "evt.party.style.surprise.label", tipKey: "evt.party.style.surprise.tip", factor: 1.0 },
    ],
    items: [
      { labelKey: "evt.party.item.food", emoji: "🥂", kind: "perGuest", tiers: { low: 10, mid: 25, high: 60 } },
      { labelKey: "evt.party.item.venue", emoji: "🏠", kind: "fixed", tiers: { low: 0, mid: 300, high: 1200 }, optional: true },
      { labelKey: "evt.party.item.cake", emoji: "🎂", kind: "fixed", tiers: { low: 30, mid: 100, high: 350 } },
      { labelKey: "evt.party.item.decor", emoji: "🎈", kind: "fixed", tiers: { low: 30, mid: 100, high: 400 } },
      { labelKey: "evt.party.item.entertainment", emoji: "🎵", kind: "fixed", tiers: { low: 0, mid: 200, high: 800 }, optional: true },
      { labelKey: "evt.party.item.invites", emoji: "🎁", kind: "fixed", tiers: { low: 20, mid: 80, high: 250 }, optional: true },
    ],
    milestones: [
      { labelKey: "evt.party.ms.date", monthsBefore: 2 },
      { labelKey: "evt.party.ms.booking", monthsBefore: 2 },
      { labelKey: "evt.party.ms.invites", monthsBefore: 1 },
      { labelKey: "evt.party.ms.shopping", monthsBefore: 0 },
      { labelKey: "evt.party.ms.dday", monthsBefore: 0 },
    ],
    cheerKeys: {
      early: "evt.party.cheer.early",
      onTrack: "evt.party.cheer.onTrack",
      behind: "evt.party.cheer.behind",
      lastStretch: "evt.party.cheer.lastStretch",
    },
  },
  {
    type: "religious",
    emoji: "🕌",
    labelKey: "evt.religious.label",
    taglineKey: "evt.religious.tagline",
    asksGuests: true,
    guestsLabelKey: "evt.religious.guests",
    tierLabelKeys: {
      low: "evt.religious.tier.low",
      mid: "evt.religious.tier.mid",
      high: "evt.religious.tier.high",
    },
    items: [
      { labelKey: "evt.religious.item.main", emoji: "🐑", kind: "fixed", tiers: { low: 150, mid: 400, high: 900 } },
      { labelKey: "evt.religious.item.meal", emoji: "🍽️", kind: "perGuest", tiers: { low: 8, mid: 20, high: 45 } },
      { labelKey: "evt.religious.item.outfits", emoji: "👗", kind: "fixed", tiers: { low: 50, mid: 200, high: 600 } },
      { labelKey: "evt.religious.item.donations", emoji: "🤲", kind: "blank", optional: true },
      { labelKey: "evt.religious.item.gifts", emoji: "🎁", kind: "fixed", tiers: { low: 30, mid: 100, high: 300 }, optional: true },
      { labelKey: "evt.religious.item.travel", emoji: "🚌", kind: "blank", optional: true },
    ],
    milestones: [
      { labelKey: "evt.religious.ms.budget", monthsBefore: 3 },
      { labelKey: "evt.religious.ms.buyEarly", monthsBefore: 1 },
      { labelKey: "evt.religious.ms.dday", monthsBefore: 0 },
    ],
    cheerKeys: {
      early: "evt.religious.cheer.early",
      onTrack: "evt.religious.cheer.onTrack",
      behind: "evt.religious.cheer.behind",
      lastStretch: "evt.religious.cheer.lastStretch",
    },
  },
  {
    type: "housewarming",
    emoji: "🏡",
    labelKey: "evt.housewarming.label",
    taglineKey: "evt.housewarming.tagline",
    asksGuests: true,
    guestsLabelKey: "evt.housewarming.guests",
    tierLabelKeys: {
      low: "evt.housewarming.tier.low",
      mid: "evt.housewarming.tier.mid",
      high: "evt.housewarming.tier.high",
    },
    items: [
      { labelKey: "evt.housewarming.item.food", emoji: "🥂", kind: "perGuest", tiers: { low: 8, mid: 20, high: 45 } },
      { labelKey: "evt.housewarming.item.venue", emoji: "🏠", kind: "blank", optional: true },
      { labelKey: "evt.housewarming.item.decor", emoji: "🎈", kind: "fixed", tiers: { low: 20, mid: 80, high: 250 }, optional: true },
      { labelKey: "evt.housewarming.item.gifts", emoji: "🎁", kind: "blank", optional: true },
    ],
    milestones: [
      { labelKey: "evt.housewarming.ms.date", monthsBefore: 1 },
      { labelKey: "evt.housewarming.ms.dday", monthsBefore: 0 },
    ],
    cheerKeys: {
      early: "evt.housewarming.cheer.early",
      onTrack: "evt.housewarming.cheer.onTrack",
      behind: "evt.housewarming.cheer.behind",
      lastStretch: "evt.housewarming.cheer.lastStretch",
    },
  },
];

export function templateFor(type: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find((t) => t.type === type);
}

// Construit les postes d'un nouvel événement à partir du template.
export function styleFor(tpl: EventTemplate, key?: string): EventStyle | undefined {
  return tpl.styles?.find((s) => s.key === key);
}

export function buildEventItems(
  tpl: EventTemplate,
  tier: EventTier,
  guests: number | null,
  styleKey?: string,
): EventLineItem[] {
  const factor = styleFor(tpl, styleKey)?.factor ?? 1;
  return tpl.items
    .filter((it) => !it.optional)
    .concat(tpl.items.filter((it) => it.optional))
    .map((it, idx) => {
      let estimated = 0;
      if (it.kind === "perGuest" && it.tiers) estimated = it.tiers[tier] * Math.max(1, guests ?? 1);
      else if (it.kind === "fixed" && it.tiers) estimated = it.tiers[tier];
      estimated = Math.round(estimated * factor);
      // Postes optionnels : proposés à 0, l'utilisateur active en saisissant.
      if (it.optional) estimated = 0;
      return {
        id: `it-${idx}`,
        // On persiste la CLÉ i18n : l'événement suit la langue de l'app.
        label: it.labelKey,
        emoji: it.emoji,
        estimated,
        actual: null,
        done: false,
      };
    });
}

export function buildEventMilestones(tpl: EventTemplate): EventMilestone[] {
  return tpl.milestones.map((m, idx) => ({
    id: `ms-${idx}`,
    label: m.labelKey, // clé i18n, cf. buildEventItems()
    monthsBefore: m.monthsBefore,
    done: false,
  }));
}

// ============================================================================
// Messages personnalisés : compare l'avancement du financement au temps
// restant, et parle comme un coach — pas comme un tableur.
// ============================================================================

/**
 * Enregistre un relevé de prix et, s'il vise un poste, aligne le budget prévu
 * de ce poste sur le prix relevé.
 *
 * C'est ce lien qui manquait : les devis vivaient dans `quotes`, le total ne
 * sommait que `items`, et ajouter un devis de 3 000 € pour le traiteur ne
 * changeait rien au budget. Le relevé reste conservé tel quel dans
 * l'historique — c'est lui qui montre l'évolution d'un prix dans le temps.
 */
export function applyQuote(ev: EventProject, quote: EventQuote): EventProject {
  const quotes = [quote, ...(ev.quotes ?? [])];
  if (!quote.itemId) return { ...ev, quotes };
  return {
    ...ev,
    quotes,
    items: ev.items.map((it) =>
      it.id === quote.itemId ? { ...it, estimated: quote.price } : it,
    ),
  };
}

export function eventTotals(ev: EventProject): { planned: number; spent: number } {
  const planned = ev.items.reduce((s, it) => s + (it.estimated || 0), 0);
  const spent = ev.items.reduce((s, it) => s + (it.actual ?? 0), 0);
  return { planned, spent };
}

export function monthsUntil(dateIso: string, now: Date = new Date()): number {
  const target = new Date(dateIso + "T12:00:00");
  const ms = target.getTime() - now.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 30.44));
}

export function monthlyNeeded(ev: EventProject, now: Date = new Date()): number {
  const { planned } = eventTotals(ev);
  const remaining = Math.max(0, planned - ev.saved);
  const months = monthsUntil(ev.dateIso, now);
  if (months < 0.5) return remaining; // à financer maintenant
  return remaining / months;
}

/** Renvoie la CLÉ i18n du message de coach (chaîne vide si aucun message). */
export function eventMessageKey(ev: EventProject, now: Date = new Date()): string {
  const tpl = templateFor(ev.type);
  const { planned } = eventTotals(ev);
  const months = monthsUntil(ev.dateIso, now);
  const fundedRatio = planned > 0 ? ev.saved / planned : 1;
  const cheer = tpl?.cheerKeys;
  if (!cheer) return "";
  if (months <= 1) return cheer.lastStretch;
  // Ratio temps écoulé : on compare au temps TOTAL depuis la création.
  const created = new Date(ev.createdAt);
  const totalMonths = Math.max(1, monthsUntil(ev.dateIso, created));
  const elapsedRatio = Math.min(1, Math.max(0, 1 - months / totalMonths));
  if (fundedRatio >= 1) return cheer.early;
  if (fundedRatio >= elapsedRatio - 0.1) return elapsedRatio < 0.34 ? cheer.early : cheer.onTrack;
  return cheer.behind;
}

/** Message de coach déjà traduit dans la langue courante. */
export function eventMessage(
  ev: EventProject,
  t: (key: string) => string,
  now: Date = new Date(),
): string {
  const key = eventMessageKey(ev, now);
  return key ? t(key) : "";
}
