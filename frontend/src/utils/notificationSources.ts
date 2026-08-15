// Assemblage du contexte de notifications à partir des stockages de l'app.
//
// C'est le point où les trois mondes de NetBudget se rejoignent : le budget
// local (gratuit, hors ligne), les données Premium (objectifs, événements) et
// le catalogue de conseils. Chacun peut être absent — un utilisateur gratuit
// n'a ni objectif ni événement — et l'assemblage doit rester valide dans tous
// les cas plutôt que d'exiger un compte.
//
// Toute lecture est protégée : une erreur de réseau ou de cache ne doit jamais
// empêcher l'app de démarrer. Au pire, on planifie moins de notifications.

import { matchAdvice } from "../lib/adviceEngine";
import {
  loadBudgetHistory,
  loadEvents,
  loadS1,
  type BudgetHistoryPoint,
  type EventProject,
} from "../lib/premiumStore";
import type { UserProfile } from "../types/advice";
import type { SavingsGoal } from "../types/premium";
import type { CurrencyCode } from "./currency";
import { computeLoanMonthlyPayment, parseNumber } from "./finance";
import {
  isBudgetFilledThisMonth,
  splitByWindow,
  toNotifEvents,
  toNotifGoals,
  toNotifLoans,
  toUnseenRights,
  type LoanInput,
} from "./notificationContext";
import { getSeenAdviceIds } from "./notificationScheduler";
import type { SyncInput } from "./notificationScheduler";
import { loadState } from "./storage";

/** Prêt tel qu'il dort dans AsyncStorage — champs texte, tous optionnels. */
type RawLoan = {
  id?: string;
  name?: string;
  mode?: string;
  principal?: string;
  ratePercent?: string;
  years?: string;
  directMonthly?: string;
  startDate?: string;
};

/**
 * Traduit les prêts du budget local en entrées calculables.
 *
 * On reproduit ici la règle de l'écran Budget : en mode « direct »,
 * l'utilisateur saisit lui-même la mensualité ; sinon on la calcule.
 */
export function parseStoredLoans(raw: unknown[]): LoanInput[] {
  const out: LoanInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const l = item as RawLoan;
    if (!l.id) continue;
    const principal = parseNumber(l.principal ?? "0");
    const ratePercent = parseNumber(l.ratePercent ?? "0");
    const years = parseNumber(l.years ?? "0");
    const monthlyPayment =
      l.mode === "direct"
        ? parseNumber(l.directMonthly ?? "0")
        : computeLoanMonthlyPayment(principal, ratePercent, years);
    out.push({
      id: l.id,
      name: l.name || "",
      principal,
      ratePercent,
      years,
      startDate: l.startDate,
      monthlyPayment,
    });
  }
  return out;
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export type BuildSyncInputOptions = {
  /** Absent pour un utilisateur gratuit : objectifs et événements sont ignorés. */
  userId?: string | null;
  /** Espace partagé courant, null pour l'espace personnel. */
  workspaceId?: string | null;
  displayCurrency?: CurrencyCode;
  /** Profil de conseil — sans lui, aucune notification « droits ». */
  profile?: UserProfile | null;
  now?: Date;
};

/**
 * Construit le contexte complet.
 *
 * Les lectures indépendantes partent en parallèle : au démarrage de l'app, ce
 * chemin ne doit pas retarder l'affichage.
 */
export async function buildSyncInput(opts: BuildSyncInputOptions): Promise<SyncInput> {
  const now = opts.now ?? new Date();
  const { userId, workspaceId = null, displayCurrency, profile } = opts;

  const [goals, events, history, state, seen] = await Promise.all([
    userId
      ? safe<SavingsGoal[]>(
          async () => (await loadS1(userId, workspaceId, displayCurrency)).goals ?? [],
          [],
        )
      : Promise.resolve<SavingsGoal[]>([]),
    userId
      ? safe<EventProject[]>(
          () => loadEvents(userId, workspaceId, displayCurrency),
          [],
        )
      : Promise.resolve<EventProject[]>([]),
    safe<BudgetHistoryPoint[]>(
      () => loadBudgetHistory(userId ?? "", workspaceId),
      [],
    ),
    safe(() => loadState(), null),
    safe(() => getSeenAdviceIds(), [] as string[]),
  ]);

  // `matchAdvice` filtre déjà par pays, profil ET mois : les cartes
  // saisonnières qui en sortent sont donc dans leur fenêtre en ce moment même.
  const { evergreen, seasonal } = profile
    ? splitByWindow(matchAdvice(profile))
    : { evergreen: [], seasonal: [] };

  return {
    now,
    unseenRights: toUnseenRights(evergreen, seen),
    seasonalRights: toUnseenRights(seasonal, seen),
    goals: toNotifGoals(goals),
    events: toNotifEvents(events, now),
    loans: toNotifLoans(parseStoredLoans(state?.loans ?? []), now),
    budgetFilledThisMonth: isBudgetFilledThisMonth(history, now),
  };
}
