// Adaptateurs : données de l'app → contexte du moteur de notifications.
//
// Pourquoi un fichier séparé du planificateur : ce module est PUR. Il ne lit
// aucun stockage et n'appelle aucune API système, donc il se teste sans mocker
// expo-notifications. Tout ce qui a un effet de bord vit dans
// notificationScheduler.ts, qui se contente d'assembler ces morceaux.
//
// Règle de fond, la même que dans le moteur : quand une donnée manque ou est
// ambiguë, on renvoie ce qui produit LE MOINS de notifications. Une relance de
// trop coûte plus cher qu'une relance manquée.

import type { AdviceCard } from "../types/advice";
import type { BudgetHistoryPoint, EventProject } from "../lib/premiumStore";
import type { SavingsGoal } from "../types/premium";
import { loanProgress } from "./loanSchedule";
import type { NotifContext } from "./notificationEngine";

/** Soustrait des mois en gardant une date valide (31 mars − 1 mois = 28/29 févr.). */
export function minusMonths(date: Date, months: number): Date {
  const out = new Date(date);
  const day = out.getDate();
  out.setDate(1);
  out.setMonth(out.getMonth() - months);
  const lastDay = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(day, lastDay));
  return out;
}

/** Date d'un événement, à midi pour éviter les bascules de fuseau. */
export function eventDate(ev: { dateIso: string }): Date | null {
  const d = new Date(ev.dateIso + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Part de l'événement déjà financée, entre 0 et 1.
 *
 * On compare l'épargne au coût RÉEL quand il est connu (`actual`, issu d'un
 * devis) et au prévisionnel sinon : un devis reçu vaut mieux qu'une estimation.
 * Sans aucun poste chiffré, on renvoie 1 — il n'y a rien à financer, donc rien
 * à signaler.
 */
export function eventFundedRatio(ev: EventProject): number {
  const total = ev.items.reduce(
    (sum, it) => sum + (it.actual != null && it.actual > 0 ? it.actual : it.estimated),
    0,
  );
  if (!(total > 0)) return 1;
  return Math.max(0, Math.min(1, (ev.saved ?? 0) / total));
}

/**
 * Prochain jalon non fait, converti en date absolue.
 *
 * Les jalons sont stockés en « mois avant l'événement » ; on les projette sur
 * le calendrier et on garde le plus proche encore à venir. Un jalon déjà
 * dépassé ne déclenche rien : rappeler de réserver la salle quand la date est
 * passée n'aide personne et fait culpabiliser.
 */
export function nextMilestoneAt(ev: EventProject, now: Date): Date | undefined {
  const day = eventDate(ev);
  if (!day) return undefined;
  const upcoming = ev.milestones
    .filter((m) => !m.done)
    .map((m) => minusMonths(day, m.monthsBefore))
    .filter((d) => d.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  return upcoming[0];
}

export function toNotifEvents(events: EventProject[], now: Date): NotifContext["events"] {
  return events
    .filter((ev) => {
      const d = eventDate(ev);
      return d != null && d.getTime() > now.getTime(); // un événement passé ne se prépare plus
    })
    .map((ev) => ({
      id: ev.id,
      name: ev.name,
      emoji: ev.emoji,
      dateIso: ev.dateIso,
      nextMilestoneAt: nextMilestoneAt(ev, now),
      fundedRatio: eventFundedRatio(ev),
    }));
}

/**
 * Objectifs d'épargne exploitables.
 *
 * Les objectifs sans montant cible sont écartés : sans cible, il n'y a pas de
 * palier à franchir, donc rien à célébrer.
 */
export function toNotifGoals(goals: SavingsGoal[]): NotifContext["goals"] {
  return goals
    .filter((g) => g.targetAmount > 0)
    .map((g) => ({
      id: g.id,
      label: g.label,
      current: g.currentAmount,
      target: g.targetAmount,
    }));
}

/** Prêt tel que l'écran Budget le connaît, une fois les champs texte convertis. */
export type LoanInput = {
  id: string;
  name: string;
  principal: number;
  ratePercent: number;
  years: number;
  startDate?: string;
  monthlyPayment: number;
};

/**
 * Prêts en cours avec leur avancement.
 *
 * Un prêt dont on ignore la date de première échéance n'a pas d'avancement
 * calculable : `loanProgress` renvoie null et on l'ignore plutôt que de
 * supposer une date.
 */
export function toNotifLoans(loans: LoanInput[], now: Date): NotifContext["loans"] {
  const out: NotifContext["loans"] = [];
  for (const l of loans) {
    const p = loanProgress(
      l.principal,
      l.ratePercent,
      l.years,
      l.startDate,
      l.monthlyPayment,
      now,
    );
    if (!p || p.finished) continue;
    out.push({
      id: l.id,
      name: l.name,
      remainingMonths: p.remainingMonths,
      remainingPrincipal: Math.round(p.remainingPrincipal),
      // Sur le CAPITAL emprunté, pas sur le total remboursé intérêts compris :
      // c'est la dette qui recule, et c'est ce dont on est fier.
      repaidPercent: l.principal > 0 ? (p.repaidPrincipal / l.principal) * 100 : 0,
    });
  }
  return out;
}

/**
 * Conseils qui correspondent au profil et que l'utilisateur n'a jamais vus.
 *
 * C'est la matière première de la notification la plus utile de l'app : de
 * l'argent auquel il a droit sans le savoir. On plafonne la liste parce que le
 * moteur n'en envoie qu'un à la fois — le reste ne sert qu'à décider s'il y a
 * assez de nouveauté pour justifier une reprise après absence.
 */
export function toUnseenRights(
  matched: AdviceCard[],
  seenIds: readonly string[],
  limit = 20,
): NotifContext["unseenRights"] {
  const seen = new Set(seenIds);
  return matched
    .filter((c) => !seen.has(c.id))
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      titleKey: c.titleKey ?? c.title ?? "",
      priority: c.priority,
    }))
    .filter((r) => r.titleKey !== ""); // sans texte, pas de notification
}

/**
 * Sépare les conseils permanents de ceux dont la fenêtre se ferme.
 *
 * Le catalogue porte déjà l'information : `months` restreint une carte à
 * certains mois de l'année (déclaration d'impôts, rentrée, fin d'année). Ces
 * cartes se périment — d'où une catégorie de notification distincte, que
 * l'utilisateur peut garder même s'il coupe le reste.
 */
export function splitByWindow(cards: AdviceCard[]): {
  evergreen: AdviceCard[];
  seasonal: AdviceCard[];
} {
  const evergreen: AdviceCard[] = [];
  const seasonal: AdviceCard[] = [];
  for (const c of cards) {
    // `months` couvrant les 12 mois n'est pas une fenêtre : c'est du permanent
    // écrit autrement.
    if (c.months && c.months.length > 0 && c.months.length < 12) seasonal.push(c);
    else evergreen.push(c);
  }
  return { evergreen, seasonal };
}

/** Clé de mois « AAAA-MM » utilisée par l'historique de budget. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Le budget du mois courant a-t-il été enregistré ?
 *
 * On s'appuie sur l'historique plutôt que sur « le budget contient des
 * lignes » : les lignes survivent d'un mois à l'autre, un point d'historique
 * signe une vraie mise à jour ce mois-ci.
 */
export function isBudgetFilledThisMonth(
  history: BudgetHistoryPoint[],
  now: Date,
): boolean {
  const key = monthKey(now);
  return history.some((h) => h.month === key);
}
