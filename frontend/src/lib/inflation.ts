// L'inflation comme étalon de lecture des conseils d'épargne.
//
// POURQUOI CE MODULE EXISTE. Un livret à 1,7 % ressemble à un gain. Si les
// prix montent de 2,7 %, c'est une perte de pouvoir d'achat de un point par
// an — et « place ton épargne ici » devient un mauvais conseil qu'on donnait
// avec aplomb. Le taux nominal seul ne permet pas de trancher ; l'écart avec
// l'inflation, si.
//
// D'OÙ VIENNENT LES CHIFFRES. De `inflationData.ts`, régénéré par
// `npm run fetch:inflation` depuis Eurostat, l'OCDE et la Banque mondiale.
// Aucun n'est saisi à la main, et un pays qu'aucune de ces trois institutions
// ne couvre n'apparaît pas : l'app n'affiche alors rien. Ne rien dire est
// toujours préférable à avancer un chiffre qu'on ne peut pas justifier.
//
// CE QUE CE MODULE NE FAIT PAS. Il ne prédit rien. Le taux est constaté, passé,
// et daté — l'app affiche sa période pour que personne ne le prenne pour une
// prévision.

import type { Country } from "../types/advice";
import { INFLATION, SOURCE_URLS, type InflationRow } from "./inflationData";
import { liveInflation } from "./inflationLive";

export type { InflationRow } from "./inflationData";
export { INFLATION_GENERATED_AT } from "./inflationData";

/**
 * Au-delà de cette ancienneté, le chiffre reste affiché — c'est le dernier
 * publié, donc le meilleur disponible — mais l'app le signale comme daté.
 *
 * 18 mois : les instituts nationaux publient au mois, la Banque mondiale à
 * l'année avec un décalage qui atteint couramment un an. Un seuil plus court
 * marquerait « daté » des chiffres parfaitement à jour pour leur source.
 */
export const STALE_AFTER_MONTHS = 18;

/**
 * Taux officiel du pays, ou `null` si aucune source ne le couvre.
 *
 * La table rafraîchie depuis le serveur l'emporte sur celle embarquée à la
 * compilation. Le repli n'est pas un détail : sans réseau, au premier
 * lancement, ou si le service est en panne, l'app doit continuer d'afficher un
 * chiffre — daté, avec sa période, mais présent.
 */
export function inflationFor(country: Country | undefined | null): InflationRow | null {
  if (!country) return null;
  return liveInflation()?.[country] ?? INFLATION[country] ?? null;
}

/** Lien vers la base publique d'où sort le chiffre, pour qui veut vérifier. */
export function sourceUrl(row: InflationRow): string {
  return SOURCE_URLS[row.source];
}

/**
 * Rendement réel — ce que le placement rapporte une fois les prix pris en
 * compte, en pourcentage.
 *
 * On applique la formule de Fisher (1+n)/(1+i)−1 plutôt que la soustraction
 * n−i. L'écart est faible aux taux courants, mais la soustraction est une
 * approximation, et rien n'oblige à approximer quand la formule exacte tient
 * sur une ligne.
 */
export function realRate(nominalPct: number, row: InflationRow): number {
  return ((1 + nominalPct / 100) / (1 + row.rate / 100) - 1) * 100;
}

/** Le placement protège-t-il le pouvoir d'achat ? */
export function beatsInflation(nominalPct: number, row: InflationRow): boolean {
  return nominalPct > row.rate;
}

/**
 * Ancienneté du chiffre, en mois.
 *
 * Une période annuelle ("2025") est datée de sa FIN — décembre — et non de
 * janvier : elle décrit l'année entière, la traiter comme un chiffre de janvier
 * la vieillirait de onze mois pour rien.
 */
export function monthsOld(row: InflationRow, now: Date = new Date()): number {
  const [y, m] = row.period.split("-");
  const year = Number(y);
  const month = m ? Number(m) : 12;
  if (!Number.isFinite(year) || !Number.isFinite(month)) return 0;
  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
}

export function isStale(row: InflationRow, now: Date = new Date()): boolean {
  return monthsOld(row, now) > STALE_AFTER_MONTHS;
}

/**
 * Période lisible : "août 2026" ou "2025", dans la langue de l'utilisateur.
 *
 * On passe par `Intl` plutôt que par une table de noms de mois traduite à la
 * main — huit langues de noms de mois, c'est huit occasions de se tromper, et
 * la plateforme les connaît déjà.
 */
export function periodLabel(row: InflationRow, locale: string): string {
  const [y, m] = row.period.split("-");
  if (!m) return y;
  const date = new Date(Number(y), Number(m) - 1, 1);
  try {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
  } catch {
    return row.period;
  }
}

/** Formatage d'un taux : une décimale, signe explicite si demandé. */
export function formatRate(pct: number, locale: string, signed = false): string {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(pct);
  } catch {
    return pct.toFixed(1);
  }
}
