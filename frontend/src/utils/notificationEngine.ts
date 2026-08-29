// Moteur de notifications personnalisées.
//
// PRINCIPE DE CONCEPTION, et il n'est pas moral mais pratique :
// une notification qui ne valait pas le dérangement se paie deux fois — elle
// est ignorée, puis toutes les suivantes le sont. Sur une app d'argent, une
// relance culpabilisante fait pire : elle crée de l'anxiété, et on désinstalle
// ce qui angoisse. La rétention durable vient donc de notifications où ouvrir
// l'app RAPPORTE quelque chose : un droit qu'on ignorait, une échéance qu'on
// allait rater, un objectif franchi.
//
// Ce module ne fait AUCUN effet de bord : il reçoit un contexte, il renvoie
// une liste ordonnée de candidates. La planification est ailleurs, ce qui rend
// tout ce raisonnement testable.

export type NotifCategory =
  | "budget" // rappels mensuels de saisie
  | "rights" // un droit auquel l'utilisateur peut prétendre
  | "goal" // progression d'un objectif d'épargne
  | "event" // jalon d'un budget d'événement
  | "loan" // étape d'un prêt
  | "seasonal" // fenêtre courte : impôts, soldes, rentrée, fêtes
  | "comeback" // reprise après une absence
  | "billing"; // fin d'essai, reconduction — de l'argent va partir

export type NotifCandidate = {
  id: string;
  category: NotifCategory;
  /** Clé i18n du titre. */
  titleKey: string;
  /** Clé i18n du corps. */
  bodyKey: string;
  /** Paramètres d'interpolation. */
  params?: Record<string, string | number>;
  /** 0-100. Ce qui rend l'ouverture réellement utile monte ; le bavardage descend. */
  score: number;
  /** Quand l'envoyer. */
  at: Date;
  /** Route ouverte au tap — une notif qui retombe sur l'accueil est une notif ratée. */
  route?: string;
};

export type NotifPrefs = {
  budget: boolean;
  rights: boolean;
  goal: boolean;
  event: boolean;
  loan: boolean;
  seasonal: boolean;
  comeback: boolean;
  /**
   * Fin d'essai et reconduction.
   *
   * Activée par défaut, et volontairement traitée à part partout : c'est la
   * seule catégorie qui annonce un DÉBIT. La couper revient à demander à être
   * prélevé sans prévenir — l'écran de réglages le dit, et le plafond
   * hebdomadaire ne s'y applique pas.
   */
  billing: boolean;
  /** Plafond hebdomadaire, toutes catégories confondues. */
  maxPerWeek: number;
  /** Heure d'envoi (0-23). */
  hour: number;
};

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  budget: true,
  rights: true,
  goal: true,
  event: true,
  loan: true,
  seasonal: true,
  comeback: true,
  billing: true,
  // 3 par semaine : au-delà, le taux d'ouverture s'effondre et l'utilisateur
  // coupe TOUT — on perd alors même les rappels utiles.
  maxPerWeek: 3,
  hour: 19, // début de soirée : l'app se consulte au calme, pas au travail
};

export type NotifContext = {
  now: Date;
  prefs: NotifPrefs;
  /** Dernière ouverture de l'app. */
  lastOpenedAt?: Date;
  /** Notifications déjà envoyées (id → date), pour ne rien répéter. */
  alreadySent: Record<string, string>;
  /** Conseils à fort enjeu qui correspondent au profil et jamais montrés. */
  unseenRights: { id: string; titleKey: string; priority: number }[];
  /**
   * Mêmes conseils, mais dont la fenêtre est SAISONNIÈRE (déclaration
   * d'impôts, rentrée, fin d'année). Séparés parce qu'ils se périment : passé
   * le mois, l'information ne vaut plus rien avant un an.
   */
  seasonalRights?: { id: string; titleKey: string; priority: number }[];
  /** Objectifs d'épargne en cours. */
  goals: { id: string; label: string; current: number; target: number }[];
  /** Événements à venir avec leur prochain jalon non fait. */
  events: {
    id: string;
    name: string;
    emoji: string;
    dateIso: string;
    nextMilestoneAt?: Date;
    fundedRatio: number;
  }[];
  /** Prêts en cours. */
  loans: { id: string; name: string; remainingMonths: number; remainingPrincipal: number }[];
  /** Le budget du mois a-t-il été renseigné ? */
  budgetFilledThisMonth: boolean;
  /**
   * Abonnement en cours, quand il y en a un.
   *
   * `renewsAt` est la date à laquelle la boutique prélèvera. `trialEndsAt` est
   * renseignée pendant une période d'essai — c'est la même date, mais le
   * message n'est pas le même : « ton essai se termine » se comprend, « ton
   * abonnement se renouvelle » alarme quelqu'un qui n'a encore rien payé.
   */
  subscription?: {
    isTrial: boolean;
    /** Fin d'essai ou date de reconduction, selon `isTrial`. */
    renewsAt: Date;
    /** Résiliation déjà demandée : il n'y aura pas de prélèvement. */
    cancelled: boolean;
    /** Périodicité, pour n'annoncer la reconduction que sur l'annuel. */
    period: "monthly" | "yearly";
  };
};

const DAY_MS = 86_400_000;

/** Place une date à l'heure de préférence de l'utilisateur. */
function atHour(d: Date, hour: number): Date {
  const out = new Date(d);
  out.setHours(hour, 0, 0, 0);
  return out;
}

const daysBetween = (a: Date, b: Date) =>
  Math.floor((b.getTime() - a.getTime()) / DAY_MS);

/**
 * Construit les notifications candidates, triées par valeur décroissante.
 * N'envoie rien : c'est une décision, pas une action.
 */
export function buildCandidates(ctx: NotifContext): NotifCandidate[] {
  const { now, prefs } = ctx;
  const out: NotifCandidate[] = [];
  const push = (c: NotifCandidate) => {
    if (!prefs[c.category]) return;
    if (ctx.alreadySent[c.id]) return; // jamais deux fois la même
    if (c.at.getTime() <= now.getTime()) return; // pas dans le passé
    out.push(c);
  };

  // --- 0. ARGENT QUI VA PARTIR -------------------------------------------
  //
  // En tête, et avec les scores les plus élevés de tout le moteur. C'est la
  // seule catégorie qui annonce un DÉBIT : un utilisateur prélevé sans
  // avertissement demande un remboursement et laisse un avis à une étoile, et
  // il a raison. Toutes les autres notifications peuvent attendre, pas
  // celle-ci.
  //
  // Rien n'est envoyé si la résiliation est déjà demandée : il n'y aura pas de
  // prélèvement, donc rien à annoncer.
  //
  // SEULE la fin d'essai est annoncée. L'avis de reconduction annuelle a été
  // retiré : il invitait à résilier au moment le moins opportun. La fin
  // d'essai, elle, protège le revenu plutôt qu'elle ne le menace — un client
  // prélevé sans prévenir demande un remboursement à la boutique et laisse un
  // avis à une étoile.
  const sub = ctx.subscription;
  if (sub && !sub.cancelled) {
    const daysLeft = daysBetween(now, sub.renewsAt);

    if (sub.isTrial) {
      // Deux jours : assez pour décider et résilier sans se presser, assez
      // près pour que ce soit encore d'actualité. La veille serait déloyal.
      const at = atHour(new Date(sub.renewsAt.getTime() - 2 * DAY_MS), prefs.hour);
      if (daysLeft > 0) {
        push({
          id: `billing-trial-${sub.renewsAt.toISOString().slice(0, 10)}`,
          category: "billing",
          titleKey: "notif.billing.trial.title",
          bodyKey: "notif.billing.trial.body",
          params: { days: 2 },
          score: 100,
          at,
          route: "/plans",
        });
      }
    }
  }

  // --- 1. DROITS NON RÉCLAMÉS -------------------------------------------
  // C'est la notification qui justifie l'app à elle seule : de l'argent que
  // l'utilisateur ignore pouvoir toucher. On envoie le conseil de plus forte
  // priorité, un seul à la fois pour ne pas banaliser.
  const topRight = [...ctx.unseenRights].sort((a, b) => b.priority - a.priority)[0];
  if (topRight) {
    push({
      id: `rights-${topRight.id}`,
      category: "rights",
      titleKey: "notif.rights.title",
      bodyKey: topRight.titleKey, // le titre du conseil EST le message utile
      score: 95,
      at: atHour(new Date(now.getTime() + 2 * DAY_MS), prefs.hour),
      route: "/(premium)/advice",
    });
  }

  // --- 2. FENÊTRE SAISONNIÈRE QUI SE FERME --------------------------------
  // Score au-dessus des jalons d'événement : une échéance fiscale ou une aide
  // de rentrée ne se rattrape pas le mois suivant. On envoie vite — le lendemain
  // — parce que la valeur de l'information décroît chaque jour.
  const topSeasonal = [...(ctx.seasonalRights ?? [])].sort(
    (a, b) => b.priority - a.priority,
  )[0];
  if (topSeasonal) {
    push({
      id: `seasonal-${topSeasonal.id}`,
      category: "seasonal",
      titleKey: "notif.seasonal.title",
      bodyKey: topSeasonal.titleKey,
      score: 92,
      at: atHour(new Date(now.getTime() + DAY_MS), prefs.hour),
      route: "/(premium)/advice",
    });
  }

  // --- 3. ÉVÉNEMENTS ------------------------------------------------------
  // Un jalon raté coûte cher (lieu déjà réservé par d'autres, billets plus
  // chers). Score élevé car l'information est périssable.
  for (const ev of ctx.events) {
    if (ev.nextMilestoneAt && ev.nextMilestoneAt > now) {
      push({
        id: `event-ms-${ev.id}-${ev.nextMilestoneAt.toISOString().slice(0, 10)}`,
        category: "event",
        titleKey: "notif.event.milestone.title",
        bodyKey: "notif.event.milestone.body",
        params: { emoji: ev.emoji, name: ev.name },
        score: 90,
        at: atHour(ev.nextMilestoneAt, prefs.hour),
        route: "/(premium)/events",
      });
    }
    // Sous-financé à l'approche : le dire TÔT laisse le temps d'agir.
    const eventDate = new Date(ev.dateIso + "T12:00:00");
    const daysLeft = daysBetween(now, eventDate);
    if (daysLeft > 0 && daysLeft <= 45 && ev.fundedRatio < 0.8) {
      push({
        id: `event-fund-${ev.id}`,
        category: "event",
        titleKey: "notif.event.funding.title",
        bodyKey: "notif.event.funding.body",
        params: { name: ev.name, pct: Math.round(ev.fundedRatio * 100) },
        score: 85,
        at: atHour(new Date(now.getTime() + DAY_MS), prefs.hour),
        route: "/(premium)/events",
      });
    }
  }

  // --- 4. OBJECTIFS : on célèbre les paliers ------------------------------
  // Franchir 25/50/75/100 % est un vrai moment. C'est la seule notification
  // qui n'apporte pas d'information neuve, et elle se justifie parce qu'elle
  // renforce un comportement que l'utilisateur a choisi.
  for (const g of ctx.goals) {
    if (g.target <= 0) continue;
    const pct = (g.current / g.target) * 100;
    const milestone = [100, 75, 50, 25].find((m) => pct >= m);
    if (milestone) {
      push({
        id: `goal-${g.id}-${milestone}`,
        category: "goal",
        titleKey: milestone === 100 ? "notif.goal.done.title" : "notif.goal.step.title",
        bodyKey: milestone === 100 ? "notif.goal.done.body" : "notif.goal.step.body",
        params: { label: g.label, pct: milestone },
        score: milestone === 100 ? 80 : 60,
        at: atHour(new Date(now.getTime() + DAY_MS), prefs.hour),
        route: "/(premium)/s1-epargne",
      });
    }
  }

  // --- 5. PRÊTS : les caps qui font plaisir -------------------------------
  for (const l of ctx.loans) {
    if (l.remainingMonths > 0 && l.remainingMonths % 12 === 0) {
      push({
        id: `loan-${l.id}-${l.remainingMonths}`,
        category: "loan",
        titleKey: "notif.loan.milestone.title",
        bodyKey: "notif.loan.milestone.body",
        params: { name: l.name, years: l.remainingMonths / 12 },
        score: 55,
        at: atHour(new Date(now.getTime() + DAY_MS), prefs.hour),
      });
    }
  }

  // --- 6. BUDGET DU MOIS non rempli ---------------------------------------
  // Seulement si le mois est déjà bien entamé : relancer le 2 du mois est du
  // bruit, relancer le 10 est un service.
  if (!ctx.budgetFilledThisMonth && now.getDate() >= 8) {
    push({
      id: `budget-${now.getFullYear()}-${now.getMonth()}`,
      category: "budget",
      titleKey: "notif.budget.fill.title",
      bodyKey: "notif.budget.fill.body",
      score: 70,
      at: atHour(new Date(now.getTime() + DAY_MS), prefs.hour),
    });
  }

  // --- 7. REPRISE APRÈS ABSENCE -------------------------------------------
  // Jamais de reproche, jamais de « on ne te voit plus » : une RAISON de
  // revenir. Et seulement s'il y a réellement quelque chose de neuf.
  if (ctx.lastOpenedAt) {
    const away = daysBetween(ctx.lastOpenedAt, now);
    const fresh = ctx.unseenRights.length + (ctx.seasonalRights?.length ?? 0);
    if (away >= 21 && fresh >= 3) {
      push({
        id: `comeback-${now.getFullYear()}-${now.getMonth()}`,
        category: "comeback",
        titleKey: "notif.comeback.title",
        bodyKey: "notif.comeback.body",
        params: { n: fresh },
        score: 50,
        at: atHour(new Date(now.getTime() + DAY_MS), prefs.hour),
        route: "/(premium)/advice",
      });
    }
  }

  return out.sort((a, b) => b.score - a.score || a.at.getTime() - b.at.getTime());
}

/**
 * Applique le plafond hebdomadaire et espace les envois.
 *
 * Deux notifications le même jour, c'est une de trop : la seconde est ignorée
 * et décrédibilise la première. On garde donc la meilleure par jour.
 */
export function applyBudgetLimits(
  candidates: NotifCandidate[],
  prefs: NotifPrefs,
  now: Date,
): NotifCandidate[] {
  const kept: NotifCandidate[] = [];
  const usedDays = new Set<string>();
  const weekCount = new Map<string, number>();

  for (const c of candidates) {
    // La facturation échappe au plafond ET au « une par jour ». Supprimer un
    // avis de prélèvement au nom de l'anti-spam, c'est faire exactement le
    // dommage que le plafond cherche à éviter : perdre la confiance.
    if (c.category === "billing") {
      kept.push(c);
      continue;
    }

    const dayKey = c.at.toISOString().slice(0, 10);
    if (usedDays.has(dayKey)) continue;

    // Semaine glissante depuis maintenant, pas semaine civile : sinon on peut
    // recevoir 6 notifications à cheval sur un dimanche.
    const weekIndex = Math.floor((c.at.getTime() - now.getTime()) / (7 * DAY_MS));
    const key = String(weekIndex);
    const count = weekCount.get(key) ?? 0;
    if (count >= prefs.maxPerWeek) continue;

    kept.push(c);
    usedDays.add(dayKey);
    weekCount.set(key, count + 1);
  }
  return kept;
}

/** Chaîne complète : candidates → plafonds → liste à planifier. */
export function planNotifications(ctx: NotifContext): NotifCandidate[] {
  return applyBudgetLimits(buildCandidates(ctx), ctx.prefs, ctx.now);
}
