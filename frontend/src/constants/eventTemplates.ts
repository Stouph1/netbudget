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

import type { EventLineItem, EventMilestone, EventProject } from "../lib/premiumStore";

export type EventTier = "low" | "mid" | "high";

// Un poste du template : soit un montant fixe par gamme, soit un montant
// PAR INVITÉ par gamme (traiteur…), soit purement à remplir (0 par défaut).
type TemplateItem = {
  label: string;
  emoji: string;
  kind: "fixed" | "perGuest" | "blank";
  tiers?: Record<EventTier, number>; // € (par invité si kind = perGuest)
  optional?: boolean; // proposé décoché à la création
};

export type EventTemplate = {
  type: string;
  emoji: string;
  label: string;
  tagline: string; // une phrase d'accroche dans le sélecteur
  asksGuests: boolean;
  guestsLabel?: string;
  tierLabels: Record<EventTier, string>;
  items: TemplateItem[];
  milestones: { label: string; monthsBefore: number }[];
  // Messages personnalisés selon l'avancement (voir eventMessages()).
  cheer: {
    early: string; // longtemps avant, financement en avance
    onTrack: string;
    behind: string;
    lastStretch: string; // dernier mois
  };
};

export const EVENT_TIERS: { key: EventTier; label: string }[] = [
  { key: "low", label: "Simple" },
  { key: "mid", label: "Confort" },
  { key: "high", label: "Grand jeu" },
];

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: "wedding",
    emoji: "💍",
    label: "Mariage",
    tagline: "Cérémonie, réception, tenues — sans Excel et sans stress.",
    asksGuests: true,
    guestsLabel: "Nombre d'invités",
    tierLabels: { low: "Intime", mid: "Classique", high: "Grand mariage" },
    items: [
      { label: "Réception & traiteur (par invité)", emoji: "🍽️", kind: "perGuest", tiers: { low: 55, mid: 95, high: 140 } },
      { label: "Lieu de réception", emoji: "🏛️", kind: "fixed", tiers: { low: 1500, mid: 4500, high: 8000 } },
      { label: "Tenues des mariés", emoji: "🤵👰", kind: "fixed", tiers: { low: 700, mid: 2600, high: 5000 } },
      { label: "Photo / vidéo", emoji: "📸", kind: "fixed", tiers: { low: 600, mid: 1500, high: 3500 } },
      { label: "Musique / DJ / animation", emoji: "🎶", kind: "fixed", tiers: { low: 400, mid: 900, high: 1800 } },
      { label: "Fleurs & décoration", emoji: "💐", kind: "fixed", tiers: { low: 400, mid: 1200, high: 2500 } },
      { label: "Alliances", emoji: "💫", kind: "fixed", tiers: { low: 300, mid: 800, high: 1500 } },
      { label: "Faire-part & papeterie", emoji: "✉️", kind: "fixed", tiers: { low: 100, mid: 400, high: 900 } },
      { label: "Coiffure / maquillage / beauté", emoji: "💄", kind: "fixed", tiers: { low: 100, mid: 400, high: 1000 } },
      { label: "Cérémonie (civile / religieuse / laïque)", emoji: "⛪", kind: "fixed", tiers: { low: 0, mid: 300, high: 900 } },
      { label: "Voiture / transport", emoji: "🚗", kind: "fixed", tiers: { low: 0, mid: 400, high: 1200 }, optional: true },
      { label: "Voyage de noces", emoji: "🏝️", kind: "fixed", tiers: { low: 0, mid: 3000, high: 6000 }, optional: true },
      { label: "Contrat de mariage (notaire, si souhaité)", emoji: "📜", kind: "fixed", tiers: { low: 350, mid: 450, high: 800 }, optional: true },
      { label: "Cérémonie traditionnelle / dot", emoji: "🎁", kind: "blank", optional: true },
      { label: "Imprévus (5-10 %)", emoji: "🛟", kind: "blank" },
    ],
    milestones: [
      { label: "Fixer la date, le budget et la liste d'invités", monthsBefore: 12 },
      { label: "Réserver le lieu de réception", monthsBefore: 12 },
      { label: "Réserver traiteur, photographe et DJ", monthsBefore: 9 },
      { label: "Choisir et commander les tenues", monthsBefore: 8 },
      { label: "Envoyer les faire-part", monthsBefore: 5 },
      { label: "Dossier de mariage à la mairie", monthsBefore: 4 },
      { label: "Essayages finaux, alliances, plan de table", monthsBefore: 2 },
      { label: "Confirmer les prestataires et les effectifs", monthsBefore: 1 },
      { label: "Jour J 🎉", monthsBefore: 0 },
    ],
    cheer: {
      early: "Vous avez pris de l'avance — le secret des mariages sereins. Chaque euro mis de côté maintenant, c'est un choix en plus le jour J.",
      onTrack: "Le cap est bon : le financement suit le calendrier. Continuez comme ça, la version « sans stress » du mariage, c'est exactement ça.",
      behind: "Le financement est un peu en retard sur le calendrier — pas de panique : augmentez la mise mensuelle ou ajustez un poste (la déco et la papeterie pardonnent plus que le traiteur).",
      lastStretch: "Dernière ligne droite ! Confirmez les effectifs aux prestataires (chaque invité fantôme coûte un repas) et gardez la marge imprévus intacte.",
    },
  },
  {
    type: "travel",
    emoji: "✈️",
    label: "Voyage",
    tagline: "Transport, logement, sur place — le budget qui évite les mauvaises surprises.",
    asksGuests: true,
    guestsLabel: "Nombre de voyageurs",
    tierLabels: { low: "Sac à dos", mid: "Confort", high: "Coup de folie" },
    items: [
      { label: "Transport aller-retour (par personne)", emoji: "✈️", kind: "perGuest", tiers: { low: 100, mid: 400, high: 1000 } },
      { label: "Hébergement (total séjour, par personne)", emoji: "🏨", kind: "perGuest", tiers: { low: 150, mid: 500, high: 1200 } },
      { label: "Repas & sorties (par personne)", emoji: "🍜", kind: "perGuest", tiers: { low: 100, mid: 350, high: 800 } },
      { label: "Activités & visites (par personne)", emoji: "🎟️", kind: "perGuest", tiers: { low: 50, mid: 150, high: 500 } },
      { label: "Assurance voyage", emoji: "🛡️", kind: "fixed", tiers: { low: 30, mid: 80, high: 200 } },
      { label: "Visas / formalités", emoji: "🛂", kind: "blank", optional: true },
      { label: "Transports sur place", emoji: "🚌", kind: "fixed", tiers: { low: 50, mid: 150, high: 400 }, optional: true },
      { label: "Imprévus (10 %)", emoji: "🛟", kind: "blank" },
    ],
    milestones: [
      { label: "Choisir la destination et poser les dates", monthsBefore: 6 },
      { label: "Réserver le transport (les prix montent ensuite)", monthsBefore: 4 },
      { label: "Réserver les hébergements", monthsBefore: 3 },
      { label: "Vérifier passeports, visas, vaccins", monthsBefore: 2 },
      { label: "Souscrire l'assurance, prévenir la banque", monthsBefore: 1 },
      { label: "Départ 🧳", monthsBefore: 0 },
    ],
    cheer: {
      early: "Réserver tôt, c'est le meilleur « bon plan » du voyage : les billets n'attendront pas que ton épargne soit prête.",
      onTrack: "Le budget voyage se remplit au bon rythme — les vacances se dégustent mieux quand elles sont déjà payées.",
      behind: "Le financement traîne un peu : vise d'abord le transport et l'hébergement (les postes qui flambent), le reste peut s'ajuster sur place.",
      lastStretch: "C'est presque le départ ! Vérifie les documents, télécharge les réservations hors ligne, et garde la ligne imprévus pour les vraies surprises.",
    },
  },
  {
    type: "baby",
    emoji: "👶",
    label: "Nouveau bébé",
    tagline: "Équipement, démarches, premiers mois — préparés en douceur.",
    asksGuests: false,
    tierLabels: { low: "Essentiel & seconde main", mid: "Équilibré", high: "Tout neuf" },
    items: [
      { label: "Poussette / porte-bébé", emoji: "🍼", kind: "fixed", tiers: { low: 150, mid: 500, high: 1200 } },
      { label: "Siège auto (obligatoire)", emoji: "🚗", kind: "fixed", tiers: { low: 80, mid: 250, high: 500 } },
      { label: "Lit, matelas, chambre", emoji: "🛏️", kind: "fixed", tiers: { low: 150, mid: 500, high: 1500 } },
      { label: "Vêtements naissance → 6 mois", emoji: "👕", kind: "fixed", tiers: { low: 100, mid: 300, high: 700 } },
      { label: "Couches & soins (6 premiers mois)", emoji: "🧴", kind: "fixed", tiers: { low: 300, mid: 450, high: 700 } },
      { label: "Lait & alimentation (si biberon, 6 mois)", emoji: "🍼", kind: "fixed", tiers: { low: 0, mid: 300, high: 500 }, optional: true },
      { label: "Matériel de puériculture (transat, baignoire…)", emoji: "🛁", kind: "fixed", tiers: { low: 80, mid: 250, high: 600 } },
      { label: "Frais de garde (provision premiers mois)", emoji: "🏫", kind: "blank", optional: true },
      { label: "Imprévus", emoji: "🛟", kind: "blank" },
    ],
    milestones: [
      { label: "Déclarer la grossesse (CAF + Assurance maladie)", monthsBefore: 7 },
      { label: "S'inscrire en crèche / trouver la garde (tôt !)", monthsBefore: 6 },
      { label: "Gros équipement : poussette, siège auto, lit", monthsBefore: 3 },
      { label: "Valise maternité, démarches congés parents", monthsBefore: 1 },
      { label: "Naissance 💛 (déclaration sous 5 jours)", monthsBefore: 0 },
    ],
    cheer: {
      early: "Préparer tôt, c'est acheter malin : la seconde main en puériculture divise souvent les prix par trois (sauf le siège auto — toujours neuf ou historique connu).",
      onTrack: "Le nid se prépare au bon rythme. Pense aux aides : la prime à la naissance arrive AVANT bébé si le dossier CAF est fait.",
      behind: "Le budget prend du retard — commence par l'obligatoire (siège auto) et l'indispensable (lit, poussette), le reste peut attendre ou venir de la liste de naissance.",
      lastStretch: "Dernières semaines ! Valise prête, démarches de congés posées, et garde la provision imprévus : bébé a son propre calendrier.",
    },
  },
  {
    type: "funeral",
    emoji: "🕊️",
    label: "Funérailles",
    tagline: "Prévoir dignement, connaître ses droits, éviter les abus.",
    asksGuests: false,
    tierLabels: { low: "Sobre", mid: "Classique", high: "Cérémonie complète" },
    items: [
      { label: "Pompes funèbres (prestations obligatoires)", emoji: "⚱️", kind: "fixed", tiers: { low: 1500, mid: 2500, high: 4000 } },
      { label: "Cercueil / urne", emoji: "🪦", kind: "fixed", tiers: { low: 500, mid: 1200, high: 3000 } },
      { label: "Concession / crémation (selon commune)", emoji: "📜", kind: "fixed", tiers: { low: 300, mid: 800, high: 2500 } },
      { label: "Cérémonie & recueillement", emoji: "🕯️", kind: "fixed", tiers: { low: 0, mid: 300, high: 800 } },
      { label: "Fleurs, avis de décès", emoji: "🤍", kind: "fixed", tiers: { low: 100, mid: 350, high: 800 } },
      { label: "Réception / repas de famille", emoji: "🍽️", kind: "blank", optional: true },
      { label: "Pierre tombale / plaque (souvent plus tard)", emoji: "🪨", kind: "blank", optional: true },
    ],
    milestones: [
      { label: "Comparer 2-3 devis-types (obligatoires et gratuits)", monthsBefore: 0 },
      { label: "Vérifier les aides : capital décès, compte du défunt, caisses", monthsBefore: 0 },
      { label: "Cérémonie", monthsBefore: 0 },
    ],
    cheer: {
      early: "Prévoir, c'est protéger les siens : un budget posé à froid évite les décisions coûteuses prises dans l'urgence et le chagrin.",
      onTrack: "Le devis-type réglementé est ton meilleur allié : les pompes funèbres DOIVENT te le fournir gratuitement — compare-en plusieurs, les écarts sont énormes.",
      behind: "Ne te laisse pas presser : seules quelques prestations sont légalement obligatoires, tout le reste se discute. Les aides (capital décès, prélèvement sur le compte du défunt) existent.",
      lastStretch: "Courage. Concentre-toi sur l'essentiel, fais-toi accompagner pour les démarches, et vérifie chaque ligne du devis final avant signature.",
    },
  },
  {
    type: "party",
    emoji: "🎉",
    label: "Fête / anniversaire",
    tagline: "Un bel événement, un budget qui ne déborde pas.",
    asksGuests: true,
    guestsLabel: "Nombre d'invités",
    tierLabels: { low: "À la maison", mid: "Avec salle", high: "Grande fête" },
    items: [
      { label: "Nourriture & boissons (par invité)", emoji: "🥂", kind: "perGuest", tiers: { low: 10, mid: 25, high: 60 } },
      { label: "Salle / lieu", emoji: "🏠", kind: "fixed", tiers: { low: 0, mid: 300, high: 1200 }, optional: true },
      { label: "Gâteau / pièce montée", emoji: "🎂", kind: "fixed", tiers: { low: 30, mid: 100, high: 350 } },
      { label: "Décoration", emoji: "🎈", kind: "fixed", tiers: { low: 30, mid: 100, high: 400 } },
      { label: "Animation / musique", emoji: "🎵", kind: "fixed", tiers: { low: 0, mid: 200, high: 800 }, optional: true },
      { label: "Invitations & petits cadeaux", emoji: "🎁", kind: "fixed", tiers: { low: 20, mid: 80, high: 250 }, optional: true },
    ],
    milestones: [
      { label: "Fixer la date et la liste d'invités", monthsBefore: 2 },
      { label: "Réserver la salle et l'animation", monthsBefore: 2 },
      { label: "Envoyer les invitations", monthsBefore: 1 },
      { label: "Courses et préparation", monthsBefore: 0 },
      { label: "Jour J 🎉", monthsBefore: 0 },
    ],
    cheer: {
      early: "Une fête réussie se joue sur la liste d'invités : c'est elle qui pilote tout le budget. Fixe-la d'abord, le reste suit.",
      onTrack: "Tout roule — la fête est financée au bon rythme. Le fait-maison sur la déco et le gâteau, c'est souvent la moitié du prix.",
      behind: "Petit retard de financement : réduis un poste plaisir (déco, animation) plutôt que le nombre d'amis — c'est eux, la fête.",
      lastStretch: "Dernière ligne droite : confirme les présences avant les courses, ça évite de nourrir 20 fantômes.",
    },
  },
  {
    type: "religious",
    emoji: "🕌",
    label: "Fête religieuse / traditionnelle",
    tagline: "Tabaski, Aïd, baptême, communion… budgétés sereinement, à l'avance.",
    asksGuests: true,
    guestsLabel: "Nombre de convives",
    tierLabels: { low: "Sobre", mid: "Familial", high: "Grande tablée" },
    items: [
      { label: "Achat principal (mouton, repas de fête…)", emoji: "🐑", kind: "fixed", tiers: { low: 150, mid: 400, high: 900 } },
      { label: "Repas & réception (par convive)", emoji: "🍽️", kind: "perGuest", tiers: { low: 8, mid: 20, high: 45 } },
      { label: "Tenues de fête", emoji: "👗", kind: "fixed", tiers: { low: 50, mid: 200, high: 600 } },
      { label: "Dons / zakat / offrandes", emoji: "🤲", kind: "blank", optional: true },
      { label: "Cadeaux (enfants, famille)", emoji: "🎁", kind: "fixed", tiers: { low: 30, mid: 100, high: 300 }, optional: true },
      { label: "Transport / voyage famille", emoji: "🚌", kind: "blank", optional: true },
    ],
    milestones: [
      { label: "Poser le budget et commencer l'épargne dédiée", monthsBefore: 3 },
      { label: "Acheter tôt (les prix montent à l'approche)", monthsBefore: 1 },
      { label: "Jour de fête ✨", monthsBefore: 0 },
    ],
    cheer: {
      early: "Épargner plusieurs mois avant, c'est LA parade contre la flambée des prix à l'approche de la fête — tu achètes quand c'est calme.",
      onTrack: "L'épargne dédiée avance bien : la fête sera belle ET sans dette. C'est exactement l'esprit.",
      behind: "Le financement est en retard : mieux vaut une fête un cran plus sobre qu'un crédit à rembourser après — personne ne se souvient du prix, tout le monde se souvient du moment.",
      lastStretch: "C'est bientôt le grand jour : les derniers achats au marché se négocient mieux le matin, et la liste écrite évite les extras.",
    },
  },
  {
    type: "housewarming",
    emoji: "🏡",
    label: "Autre événement",
    tagline: "Crémaillère, départ en retraite, remise de diplôme… budget libre.",
    asksGuests: true,
    guestsLabel: "Nombre d'invités",
    tierLabels: { low: "Simple", mid: "Confort", high: "Grand format" },
    items: [
      { label: "Nourriture & boissons (par invité)", emoji: "🥂", kind: "perGuest", tiers: { low: 8, mid: 20, high: 45 } },
      { label: "Lieu / matériel", emoji: "🏠", kind: "blank", optional: true },
      { label: "Décoration & ambiance", emoji: "🎈", kind: "fixed", tiers: { low: 20, mid: 80, high: 250 }, optional: true },
      { label: "Cadeaux / souvenirs", emoji: "🎁", kind: "blank", optional: true },
    ],
    milestones: [
      { label: "Fixer la date et le budget", monthsBefore: 1 },
      { label: "Jour J 🎉", monthsBefore: 0 },
    ],
    cheer: {
      early: "Un événement posé tôt est un événement sans stress — le budget se remplit tout seul.",
      onTrack: "Le financement suit — parfait.",
      behind: "Petit retard : ajuste un poste ou remonte l'épargne du mois, tu es encore large.",
      lastStretch: "Dernière ligne droite — confirme les présences avant les dernières dépenses.",
    },
  },
];

export function templateFor(type: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find((t) => t.type === type);
}

// Construit les postes d'un nouvel événement à partir du template.
export function buildEventItems(
  tpl: EventTemplate,
  tier: EventTier,
  guests: number | null,
): EventLineItem[] {
  return tpl.items
    .filter((it) => !it.optional)
    .concat(tpl.items.filter((it) => it.optional))
    .map((it, idx) => {
      let estimated = 0;
      if (it.kind === "perGuest" && it.tiers) estimated = it.tiers[tier] * Math.max(1, guests ?? 1);
      else if (it.kind === "fixed" && it.tiers) estimated = it.tiers[tier];
      // Postes optionnels : proposés à 0, l'utilisateur active en saisissant.
      if (it.optional) estimated = 0;
      return {
        id: `it-${idx}`,
        label: it.label,
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
    label: m.label,
    monthsBefore: m.monthsBefore,
    done: false,
  }));
}

// ============================================================================
// Messages personnalisés : compare l'avancement du financement au temps
// restant, et parle comme un coach — pas comme un tableur.
// ============================================================================

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

export function eventMessage(ev: EventProject, now: Date = new Date()): string {
  const tpl = templateFor(ev.type);
  const { planned } = eventTotals(ev);
  const months = monthsUntil(ev.dateIso, now);
  const fundedRatio = planned > 0 ? ev.saved / planned : 1;
  const cheer = tpl?.cheer;
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
