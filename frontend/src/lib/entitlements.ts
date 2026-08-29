// Ce que chaque formule donne droit de faire.
//
// Module PUR et unique source de vérité. Les écrans posent des questions
// (« peut-il créer un événement de plus ? ») et n'appliquent jamais la règle
// eux-mêmes : une limite recopiée à trois endroits finit toujours par diverger,
// et sur de la facturation ça veut dire soit un client lésé, soit une fuite de
// revenus.
//
// Ce module ne sait PAS si l'abonnement est valide — c'est le rôle de la
// couche de facturation, qui lui fournit simplement le palier actif.

export type Tier = "free" | "solo" | "duo" | "family";

export type Limits = {
  /** Nombre d'événements simultanés. `null` = sans limite. */
  maxEvents: number | null;
  /**
   * Types d'événements interdits sur ce palier.
   *
   * Le mariage est réservé aux formules à plusieurs : c'est un projet qui se
   * budgète à deux, et l'app n'a d'intérêt sur ce cas que si les deux
   * personnes y ont accès.
   */
  blockedEventTypes: readonly string[];
  /**
   * Espaces partagés qu'on peut CRÉER (0 = on ne peut pas en créer).
   *
   * Ne dit rien du droit d'en REJOINDRE un : celui-là est ouvert à tous, y
   * compris sans abonnement. C'est l'abonné qui paie pour partager, pas la
   * personne qu'il invite — lui opposer un mur ferait échouer l'invitation
   * qu'il vient d'acheter, et deux personnes en garderaient une mauvaise
   * impression au lieu d'une.
   */
  maxWorkspaces: number;
  /** Membres par espace partagé, l'abonné compris. */
  maxMembersPerWorkspace: number;
  /**
   * Objectifs d'épargne créables. `null` = sans limite.
   *
   * Un seul sans abonnement, et c'est un choix : zéro rendrait la
   * fonctionnalité invisible, donc invendable. Un objectif suffit à comprendre
   * ce que ça apporte, et à vouloir le deuxième.
   */
  maxGoals: number | null;
  /**
   * Années d'échéancier de prêt lisibles. `null` = tout l'échéancier.
   *
   * L'année en cours reste NETTE pour tout le monde : c'est celle qui répond à
   * « où j'en suis ». Ce qu'on réserve, c'est la projection sur vingt ans.
   */
  loanScheduleYears: number | null;
  /** Conseils personnalisés et sourcés. */
  advice: boolean;
  /**
   * Anniversaires : la fête du jour J et les cartes de conseils liées à l'âge,
   * pour soi et pour ses enfants.
   *
   * Réservé à la formule Famille, et ce n'est pas arbitraire : c'est la seule
   * fonctionnalité de l'app qui suive plusieurs personnes d'un même foyer, avec
   * leurs dates et leurs âges. Elle appartient à la formule qui décrit un foyer.
   */
  birthdays: boolean;
};

export const LIMITS: Record<Tier, Limits> = {
  // Sans abonnement : le budget complet reste utilisable hors ligne et sans
  // compte — c'est la promesse de l'app. Les événements sont Premium.
  free: {
    maxEvents: 0,
    blockedEventTypes: [],
    maxWorkspaces: 0,
    maxMembersPerWorkspace: 0,
    maxGoals: 1,
    loanScheduleYears: 1,
    advice: false,
    birthdays: false,
  },
  // Solo : un seul événement à la fois, et pas le mariage.
  solo: {
    maxEvents: 1,
    blockedEventTypes: ["wedding"],
    maxWorkspaces: 0,
    maxMembersPerWorkspace: 0,
    maxGoals: 3,
    loanScheduleYears: null,
    advice: true,
    birthdays: false,
  },
  duo: {
    maxEvents: null,
    blockedEventTypes: [],
    maxWorkspaces: 1,
    maxMembersPerWorkspace: 2,
    maxGoals: null,
    loanScheduleYears: null,
    advice: true,
    birthdays: false,
  },
  family: {
    maxEvents: null,
    blockedEventTypes: [],
    maxWorkspaces: 3,
    maxMembersPerWorkspace: 6,
    maxGoals: null,
    loanScheduleYears: null,
    advice: true,
    birthdays: true,
  },
};

export function limitsFor(tier: Tier): Limits {
  return LIMITS[tier];
}

const VALID_TIERS: readonly Tier[] = ["free", "solo", "duo", "family"];

/**
 * Valide une valeur venue du serveur, du cache ou d'un webhook.
 *
 * Renvoie null sur tout ce qui n'est pas exactement un palier connu. Deviner —
 * accepter « FAMILY », « premium » ou une chaîne avec un espace — accorderait
 * des droits sur une valeur non reconnue, ce qui est le plus court chemin vers
 * l'abonnement gratuit. Ici, on refuse.
 */
export function parseTier(raw: unknown): Tier | null {
  return typeof raw === "string" &&
    (VALID_TIERS as readonly string[]).includes(raw)
    ? (raw as Tier)
    : null;
}

/** Palier minimal qui débloque un type d'événement, s'il en existe un. */
export function tierUnlocking(type: string): Tier | null {
  const order: Tier[] = ["free", "solo", "duo", "family"];
  return (
    order.find(
      (t) =>
        LIMITS[t].maxEvents !== 0 &&
        !LIMITS[t].blockedEventTypes.includes(type),
    ) ?? null
  );
}

export type Denial =
  | { allowed: true }
  | {
      allowed: false;
      /** Pourquoi, pour choisir le bon message et la bonne proposition. */
      reason: "needsSubscription" | "eventLimit" | "typeLocked" | "goalLimit";
      /** Palier à prendre pour lever le blocage. */
      upgradeTo: Tier | null;
    };

/**
 * L'utilisateur peut-il créer un événement de ce type ?
 *
 * On distingue trois refus, parce qu'ils n'appellent pas la même réponse :
 * s'abonner, monter de formule, ou simplement supprimer un événement terminé.
 */
export function canCreateEvent(
  tier: Tier,
  currentEventCount: number,
  type: string,
): Denial {
  const limits = limitsFor(tier);

  if (limits.maxEvents === 0) {
    return { allowed: false, reason: "needsSubscription", upgradeTo: "solo" };
  }
  if (limits.blockedEventTypes.includes(type)) {
    return {
      allowed: false,
      reason: "typeLocked",
      upgradeTo: tierUnlocking(type),
    };
  }
  if (limits.maxEvents !== null && currentEventCount >= limits.maxEvents) {
    // Volontairement PAS un « upgrade or nothing » : on a un événement de
    // trop, pas forcément besoin d'une formule supérieure. L'écran propose
    // les deux issues.
    return { allowed: false, reason: "eventLimit", upgradeTo: "duo" };
  }
  return { allowed: true };
}

/** Le type est-il disponible sur ce palier ? Sert à griser une tuile. */
export function isEventTypeLocked(tier: Tier, type: string): boolean {
  return limitsFor(tier).blockedEventTypes.includes(type);
}

/**
 * Événements restants avant la limite. `null` = illimité.
 *
 * Sert à afficher « 1 événement inclus » plutôt qu'à laisser l'utilisateur
 * découvrir la limite au moment où on la lui oppose.
 */
export function remainingEvents(
  tier: Tier,
  currentEventCount: number,
): number | null {
  const max = limitsFor(tier).maxEvents;
  if (max === null) return null;
  return Math.max(0, max - currentEventCount);
}

/**
 * L'utilisateur peut-il créer un objectif d'épargne de plus ?
 *
 * On compte les objectifs ACTIFS. Un objectif atteint puis archivé ne doit pas
 * continuer d'occuper la place : sinon la limite se transforme en « nombre
 * d'objectifs que tu auras eus dans ta vie », ce que personne n'achète.
 */
export function canCreateGoal(tier: Tier, currentGoalCount: number): Denial {
  const max = limitsFor(tier).maxGoals;
  if (max === null || currentGoalCount < max) return { allowed: true };
  return {
    allowed: false,
    reason: tier === "free" ? "needsSubscription" : "goalLimit",
    upgradeTo: tier === "free" ? "solo" : "duo",
  };
}

/**
 * Peut-on créer un objectif dans un espace PARTAGÉ ?
 *
 * Règle différente de l'espace perso, et volontairement :
 *
 *   - REJOINDRE l'espace et TOUT y lire est ouvert à l'invité sans
 *     abonnement. C'est ce qui rend l'invitation utile pour celui qui a payé,
 *     et ça donne à l'invité une raison quotidienne d'ouvrir l'app.
 *   - CRÉER un objectif commun demande un abonnement. Sans ça, un seul
 *     abonnement Duo suffirait à faire vivre six personnes en écriture, et
 *     plus personne n'aurait de raison de prendre Famille.
 *
 * Le quota personnel ne s'applique PAS ici : l'espace appartient à celui qui
 * l'a créé, et son quota est déjà celui de sa formule.
 */
export function canCreateSharedGoal(tier: Tier): Denial {
  if (tier !== "free") return { allowed: true };
  return { allowed: false, reason: "needsSubscription", upgradeTo: "solo" };
}

/** Objectifs restants avant la limite. `null` = illimité. */
export function remainingGoals(
  tier: Tier,
  currentGoalCount: number,
): number | null {
  const max = limitsFor(tier).maxGoals;
  return max === null ? null : Math.max(0, max - currentGoalCount);
}

/**
 * Une année de l'échéancier est-elle lisible ?
 *
 * `offsetFromCurrentYear` vaut 0 pour l'année en cours, 1 pour la suivante, et
 * un nombre négatif pour le passé. LE PASSÉ RESTE LISIBLE : ce sont des
 * échéances déjà payées, et les masquer donnerait le sentiment qu'on retient
 * en otage l'historique de quelqu'un plutôt qu'on lui propose une projection.
 */
export function canSeeScheduleYear(
  tier: Tier,
  offsetFromCurrentYear: number,
): boolean {
  const years = limitsFor(tier).loanScheduleYears;
  if (years === null) return true;
  return offsetFromCurrentYear < years;
}

/**
 * Peut-on REJOINDRE un espace partagé ? Toujours oui.
 *
 * Écrit comme une fonction et non comme un `true` en dur pour que le jour où
 * quelqu'un voudra restreindre l'invitation, il tombe sur ce commentaire :
 * c'est l'abonné qui a payé pour inviter. Bloquer l'invité annulerait l'achat
 * qu'on vient d'encaisser.
 */
export function canJoinWorkspace(): boolean {
  return true;
}
