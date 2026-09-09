// Rafraîchissement des taux d'inflation, sans dire à personne où l'on vit.
//
// COMMENT LA PROMESSE TIENT MALGRÉ UN APPEL RÉSEAU. L'app ne demande pas
// « l'inflation de la France » : elle demande LA TABLE, entière, pour les
// dix-sept pays. La requête ne porte aucun paramètre et la réponse est
// identique pour tout le monde — le serveur ne peut donc rien déduire du pays
// de qui appelle. Le tri se fait sur l'appareil.
//
// TROIS COMPORTEMENTS QUI COMPTENT PLUS QUE LA FRAÎCHEUR :
//
// 1. ON N'ATTEND JAMAIS LE RÉSEAU POUR AFFICHER. Le cache disque est lu en
//    premier et publié tout de suite ; l'appel part derrière. Un écran de
//    conseils qui attend Eurostat pour s'afficher serait un mauvais échange.
//
// 2. L'ÉCHEC EST SILENCIEUX. Sans réseau, sans serveur, avec une réponse
//    illisible : on garde ce qu'on a, et à défaut la table embarquée dans
//    l'app. Il y a TOUJOURS un chiffre, au pire daté — et sa période est
//    affichée, donc personne n'est trompé.
//
// 3. ON NE RAFRAÎCHIT QU'UNE FOIS PAR SEMAINE. Ces chiffres changent une fois
//    par mois. Appeler à chaque lancement dépenserait de la batterie et des
//    données pour rien.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Country } from "../types/advice";
import type { InflationRow, InflationSource } from "./inflationData";

const KEY = "netbudget:inflation";
const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 12000;

export type InflationTable = Partial<Record<Country, InflationRow>>;

type Cached = { fetchedAt: string; table: InflationTable };

/**
 * Table servie aux écrans, ou `null` tant que rien n'a été chargé.
 *
 * En mémoire et lue de façon SYNCHRONE : `inflationFor()` est appelée en plein
 * rendu, elle ne peut pas attendre une promesse.
 */
let live: InflationTable | null = null;

export function liveInflation(): InflationTable | null {
  return live;
}

const SOURCES: InflationSource[] = ["eurostat", "oecd", "worldbank"];

/**
 * Filtre ce qui arrive du réseau.
 *
 * Une ligne mal formée passerait dans l'affichage et donnerait un « NaN % » ou
 * un rendement réel absurde sur une décision d'épargne. On rejette plutôt que
 * de faire confiance.
 */
function sanitize(raw: unknown): InflationTable {
  if (typeof raw !== "object" || raw === null) return {};
  const out: InflationTable = {};
  for (const [country, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "object" || value === null) continue;
    const r = value as Record<string, unknown>;
    if (
      typeof r.rate === "number" &&
      Number.isFinite(r.rate) &&
      // Une inflation hors de cette fourchette signale une erreur de source ou
      // d'unité, pas une économie en crise : on préfère la table embarquée.
      r.rate > -50 &&
      r.rate < 500 &&
      typeof r.period === "string" &&
      /^\d{4}(-\d{2})?$/.test(r.period) &&
      typeof r.source === "string" &&
      SOURCES.includes(r.source as InflationSource)
    ) {
      out[country as Country] = {
        rate: r.rate,
        period: r.period,
        source: r.source as InflationSource,
      };
    }
  }
  return out;
}

async function readCache(): Promise<Cached | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Cached>;
    if (typeof parsed.fetchedAt !== "string") return null;
    return { fetchedAt: parsed.fetchedAt, table: sanitize(parsed.table) };
  } catch {
    return null;
  }
}

function endpoint(): string | null {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return base ? `${base.replace(/\/$/, "")}/functions/v1/inflation` : null;
}

async function fetchTable(): Promise<InflationTable | null> {
  const url = endpoint();
  if (!url) return null;
  try {
    // Aucun paramètre, aucun en-tête d'identification : la requête est
    // rigoureusement la même pour tous les utilisateurs.
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const body = (await res.json()) as { table?: unknown };
    const table = sanitize(body.table);
    return Object.keys(table).length ? table : null;
  } catch {
    return null;
  }
}

/**
 * À appeler une fois au démarrage. Ne rejette jamais.
 *
 * Publie d'abord le cache, puis rafraîchit s'il a plus d'une semaine.
 */
export async function loadInflation(now: Date = new Date()): Promise<void> {
  const cached = await readCache();
  if (cached && Object.keys(cached.table).length) live = cached.table;

  const age = cached ? now.getTime() - Date.parse(cached.fetchedAt) : Infinity;
  if (Number.isFinite(age) && age < REFRESH_AFTER_MS) return;

  const table = await fetchTable();
  if (!table) return;

  live = table;
  try {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ fetchedAt: now.toISOString(), table } satisfies Cached),
    );
  } catch {
    // Le rafraîchissement repartira au prochain lancement. Sans gravité.
  }
}

/** Pour les tests : remet le module dans son état initial. */
export function resetInflationCache(): void {
  live = null;
}
