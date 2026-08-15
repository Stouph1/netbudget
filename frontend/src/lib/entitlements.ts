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
  /** Espaces partagés autorisés (0 = fonctionnalité indisponible). */
  maxWorkspaces: number;
  /** Membres par espace partagé, l'abonné compris. */
  maxMembersPerWorkspace: number;
};

export const LIMITS: Record<Tier, Limits> = {
  // Sans abonnement : le budget complet reste utilisable hors ligne et sans
  // compte — c'est la promesse de l'app. Les événements sont Premium.
  free: {
    maxEvents: 0,
    blockedEventTypes: [],
    maxWorkspaces: 0,
    maxMembersPerWorkspace: 0,
  },
  // Solo : un seul événement à la fois, et pas le mariage.
  solo: {
    maxEvents: 1,
    blockedEventTypes: ["wedding"],
    maxWorkspaces: 0,
    maxMembersPerWorkspace: 0,
  },
  duo: {
    maxEvents: null,
    blockedEventTypes: [],
    maxWorkspaces: 1,
    maxMembersPerWorkspace: 2,
  },
  family: {
    maxEvents: null,
    blockedEventTypes: [],
    maxWorkspaces: 3,
    maxMembersPerWorkspace: 6,
  },
};

export function limitsFor(tier: Tier): Limits {
  return LIMITS[tier];
}

/** Palier minimal qui débloque un type d'événement, s'il en existe un. */
export function tierUnlocking(type: string): Tier | null {
  const order: Tier[] = ["free", "solo", "duo", "family"];
  return (
    order.find(
      (t) => LIMITS[t].maxEvents !== 0 && !LIMITS[t].blockedEventTypes.includes(type),
    ) ?? null
  );
}

export type Denial =
  | { allowed: true }
  | {
      allowed: false;
      /** Pourquoi, pour choisir le bon message et la bonne proposition. */
      reason: "needsSubscription" | "eventLimit" | "typeLocked";
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
    return { allowed: false, reason: "typeLocked", upgradeTo: tierUnlocking(type) };
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
export function remainingEvents(tier: Tier, currentEventCount: number): number | null {
  const max = limitsFor(tier).maxEvents;
  if (max === null) return null;
  return Math.max(0, max - currentEventCount);
}
