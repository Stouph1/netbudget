// Le conseil de la semaine : quelle semaine, quel conseil. Logique pure, sans
// écran, testée à part (voir __tests__/weeklyAdvice.test.ts).
import type { AdviceCard } from "../types/advice";

/** Semaine ISO, stable d'un appareil à l'autre. */
export function weekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Le conseil de la semaine parmi ceux qui s'appliquent, triés par priorité. */
export function pickWeekly(cards: AdviceCard[], key: string): AdviceCard | null {
  if (cards.length === 0) return null;
  const sorted = [...cards].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return sorted[h % sorted.length];
}

