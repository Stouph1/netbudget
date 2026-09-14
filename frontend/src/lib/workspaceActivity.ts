// Ce qui a changé dans un espace partagé depuis la dernière fois qu'on a regardé.
//
// POURQUOI UNE COMPARAISON LOCALE. Il n'y a pas de serveur de notifications :
// l'app ne garde aucun jeton d'appareil, et le contenu des espaces est chiffré
// de bout en bout — le serveur ne peut pas lire « le budget a changé », il ne
// voit passer que des octets. C'est donc le téléphone qui compare ce qu'il
// vient de lire à ce qu'il avait vu, et qui prévient. Conséquence assumée :
// l'avis arrive quand on ouvre l'app (ou qu'on y revient après une pause),
// pas à la seconde où l'autre membre agit.
//
// CE QU'ON SIGNALE. Une arrivée, un départ, un budget qui bouge nettement, des
// objectifs ajoutés ou retirés. Pas les retouches : un loyer corrigé de dix
// euros ne mérite pas une notification, et à force on couperait tout.

export type WorkspaceSnapshot = {
  /** user_id → nom affichable, tel que connu au moment de l'instantané. */
  members: Record<string, string>;
  /** Total mensuel des dépenses saisies dans l'espace (postes + prêts). */
  budgetTotal?: number;
  goalsCount?: number;
};

export type WorkspaceActivity =
  | { kind: "joined"; workspaceId: string; workspaceName: string; who: string }
  | { kind: "left"; workspaceId: string; workspaceName: string; who: string }
  | { kind: "budget"; workspaceId: string; workspaceName: string; from: number; to: number }
  | { kind: "goals"; workspaceId: string; workspaceName: string; from: number; to: number };

/** En dessous, un changement de budget est une retouche, pas une nouvelle. */
export const BUDGET_CHANGE_RATIO = 0.15;
export const BUDGET_CHANGE_MIN = 50;

export function isBigBudgetChange(from: number, to: number): boolean {
  const diff = Math.abs(to - from);
  if (diff < BUDGET_CHANGE_MIN) return false;
  const base = Math.max(Math.abs(from), 1);
  return diff / base >= BUDGET_CHANGE_RATIO;
}

/**
 * Compare deux instantanés. `prev` absent = première lecture de cet espace :
 * rien à signaler, on ne va pas annoncer l'arrivée de gens déjà là.
 * `selfId` : mes propres allées et venues ne me sont pas notifiées.
 */
export function diffWorkspace(
  prev: WorkspaceSnapshot | undefined,
  next: WorkspaceSnapshot,
  ws: { id: string; name: string },
  selfId: string,
): WorkspaceActivity[] {
  if (!prev) return [];
  const out: WorkspaceActivity[] = [];
  for (const [id, name] of Object.entries(next.members)) {
    if (id !== selfId && !(id in prev.members))
      out.push({ kind: "joined", workspaceId: ws.id, workspaceName: ws.name, who: name });
  }
  for (const [id, name] of Object.entries(prev.members)) {
    if (id !== selfId && !(id in next.members))
      out.push({ kind: "left", workspaceId: ws.id, workspaceName: ws.name, who: name });
  }
  if (
    prev.budgetTotal !== undefined &&
    next.budgetTotal !== undefined &&
    isBigBudgetChange(prev.budgetTotal, next.budgetTotal)
  ) {
    out.push({ kind: "budget", workspaceId: ws.id, workspaceName: ws.name, from: prev.budgetTotal, to: next.budgetTotal });
  }
  if (
    prev.goalsCount !== undefined &&
    next.goalsCount !== undefined &&
    prev.goalsCount !== next.goalsCount
  ) {
    out.push({ kind: "goals", workspaceId: ws.id, workspaceName: ws.name, from: prev.goalsCount, to: next.goalsCount });
  }
  return out;
}

/** Total mensuel d'un budget d'espace, depuis le payload brut tel que stocké. */
export function budgetTotalOf(payload: { expenseItems?: unknown[]; loans?: unknown[] } | null): number {
  if (!payload) return 0;
  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "0").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  let total = 0;
  for (const it of payload.expenseItems ?? []) total += num((it as { amount?: unknown }).amount);
  for (const l of payload.loans ?? []) {
    const loan = l as { mode?: string; directMonthly?: unknown; principal?: unknown; ratePercent?: unknown; years?: unknown; durationUnit?: string };
    if (loan.mode === "direct") {
      total += num(loan.directMonthly);
      continue;
    }
    const p = num(loan.principal);
    const months = loan.durationUnit === "months" ? num(loan.years) : num(loan.years) * 12;
    if (p <= 0 || months <= 0) continue;
    const r = num(loan.ratePercent) / 100 / 12;
    total += r === 0 ? p / months : (p * r) / (1 - Math.pow(1 + r, -months));
  }
  return Math.round(total * 100) / 100;
}
