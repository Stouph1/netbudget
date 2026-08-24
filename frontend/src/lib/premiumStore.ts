// Store Premium : lit et écrit les payloads dans `encrypted_payloads` côté
// Supabase, avec un cache local AsyncStorage pour le hors ligne.
//
// LE CONTENU EST CHIFFRÉ quand l'utilisateur a activé le chiffrement de bout en
// bout : XSalsa20-Poly1305, clé dérivée de sa phrase de récupération, jamais
// transmise. Le serveur ne voit que des octets et un nonce.
//
// TROIS ÉTATS COEXISTENT, et il faut les connaître pour lire ce fichier :
//
//   sans compte        les données ne passent pas ici du tout, tout reste sur
//                      l'appareil (AsyncStorage, géré par l'écran Budget).
//
//   compte sans phrase le contenu part en clair, exactement comme avant. On
//                      n'impose pas le chiffrement : quelqu'un qui ne note pas
//                      sa phrase perdrait l'accès à ses propres données.
//                      `crypto_version` = 0.
//
//   compte chiffré     tout part chiffré, `crypto_version` = 1. Les anciennes
//                      lignes en clair sont converties la première fois qu'on
//                      les relit.
//
// LA RÈGLE À NE PAS ENFREINDRE : quand un compte est chiffré mais que la clé
// n'est pas sur l'appareil, `writePayload` REFUSE. Écrire en clair « en
// attendant » remettrait les données à nu sans que personne ne le voie.
//
// Les policies RLS restent la deuxième ligne de défense — ne jamais les
// affaiblir sous prétexte que le contenu est chiffré : les métadonnées
// (qui possède quoi, quand) ne le sont pas.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserProfile } from "../types/advice";
import { EMPTY_S1_PAYLOAD, type S1Payload } from "../types/premium";
import { supabase } from "./supabase";
import type { CurrencyCode } from "../utils/currency";
import { getRates } from "../utils/exchangeRates";
import { convertEvents, convertGoals } from "../utils/convertData";
import { sodium } from "./crypto/sodium";
import { keyForUser, stateForUser } from "./crypto/vaultSession";
import { canWrite, needsMigration, shouldEncrypt } from "./crypto/vaultState";

const CACHE_KEY_PREFIX = "netbudget:premium:cache:";

// ============================================================================
// CHIFFREMENT
//
// Deux formats coexistent en base, et c'est voulu :
//
//   crypto_version 0 — JSON en clair. Ce sont les données écrites avant le
//                      chiffrement. Elles doivent rester lisibles : sans ça, la
//                      mise à jour de l'app effacerait l'historique de tous les
//                      comptes déjà créés. Elles sont converties au format
//                      chiffré la première fois qu'on les relit avec une clé.
//
//   crypto_version 1 — XSalsa20-Poly1305, clé dérivée de la phrase de
//                      récupération de l'utilisateur.
//
// LA RÈGLE À NE PAS ENFREINDRE : quand un compte est chiffré mais que la clé
// n'est pas sur l'appareil, on n'écrit RIEN. Écrire en clair « en attendant »
// remettrait les données à nu sans que personne ne le voie, et la lecture
// suivante les accepterait sans broncher puisque le format 0 reste valide.
// ============================================================================

const CRYPTO_PLAINTEXT = 0;
const CRYPTO_SECRETBOX = 1;

/** Nonce des lignes en clair : la colonne est NOT NULL, il faut y mettre quelque chose. */
const EMPTY_NONCE = new Uint8Array(24);

// ============================================================================
// Cache local — pour affichage instantané au boot, sync differ derrière
// ============================================================================

// Scope de cache : "perso" ou "ws:<uuid>"
function cacheKey(payloadKey: string, workspaceId: string | null): string {
  const scope = workspaceId ? `ws:${workspaceId}` : "perso";
  return `${CACHE_KEY_PREFIX}${scope}:${payloadKey}`;
}

async function readCache<T>(
  payloadKey: string,
  workspaceId: string | null,
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(payloadKey, workspaceId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeCache<T>(
  payloadKey: string,
  workspaceId: string | null,
  data: T,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      cacheKey(payloadKey, workspaceId),
      JSON.stringify(data),
    );
  } catch {}
}

// ============================================================================
// Read / Write générique vers encrypted_payloads
// ============================================================================

// Convert Uint8Array to base64 (for storage in bytea)
function u8ToBase64(u8: Uint8Array): string {
  let bin = "";
  for (const b of u8) bin += String.fromCharCode(b);
  return globalThis.btoa(bin);
}

function base64ToU8(b64: string): Uint8Array {
  const bin = globalThis.atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

async function readPayload<T>(
  payloadKey: string,
  userId: string,
  fallback: T,
  workspaceId: string | null = null,
): Promise<T> {
  // 1. Cache local d'abord : l'app s'affiche instantanément et fonctionne
  //    hors ligne.
  const cached = await readCache<T>(payloadKey, workspaceId);

  try {
    let query = supabase
      .from("encrypted_payloads")
      .select("ciphertext, nonce, crypto_version")
      .eq("payload_key", payloadKey);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else {
      // Perso : filtre user_id ET workspace_id IS NULL
      query = query.eq("user_id", userId).is("workspace_id", null);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return cached ?? fallback;

    const bytes = toBytes(data.ciphertext as unknown);
    const version = (data.crypto_version as number | null) ?? CRYPTO_PLAINTEXT;

    // --- Données en clair (écrites avant le chiffrement) ------------------
    if (version === CRYPTO_PLAINTEXT) {
      const parsed = JSON.parse(new TextDecoder().decode(bytes)) as T;
      await writeCache(payloadKey, workspaceId, parsed);

      // Conversion opportuniste : on ne lance PAS de traitement massif, chaque
      // donnée se chiffre la première fois qu'on y touche. Sans await : la
      // lecture ne doit pas attendre une réécriture, et si elle échoue la
      // donnée reste lisible en clair et sera reprise plus tard.
      if (needsMigration(stateForUser(userId), true)) {
        void writePayload(payloadKey, userId, parsed, workspaceId);
      }
      return parsed;
    }

    // --- Données chiffrées ------------------------------------------------
    if (version !== CRYPTO_SECRETBOX) {
      // Écrit par une version plus récente de l'app : on ne devine pas le
      // format, on garde ce qu'on a en cache.
      return cached ?? fallback;
    }

    const key = keyForUser(userId);
    if (!key) return cached ?? fallback; // coffre verrouillé : l'UI le signale

    await sodium.ready();
    const opened = sodium.open(bytes, toBytes(data.nonce as unknown), key);
    // Poly1305 a rejeté : mauvaise clé, ou octets altérés. On ne renvoie
    // JAMAIS de données douteuses — sur des montants, une donnée fausse est
    // pire qu'une donnée absente.
    if (!opened) return cached ?? fallback;

    const parsed = JSON.parse(new TextDecoder().decode(opened)) as T;
    await writeCache(payloadKey, workspaceId, parsed);
    return parsed;
  } catch {
    return cached ?? fallback;
  }
}

/** Colonne bytea : Supabase la renvoie en hexadécimal `\x…`, en base64, ou brute. */
function toBytes(raw: unknown): Uint8Array {
  if (typeof raw !== "string") return raw as Uint8Array;
  return raw.startsWith("\\x") ? hexToU8(raw.slice(2)) : base64ToU8(raw);
}

function hexToU8(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function writePayload<T>(
  payloadKey: string,
  userId: string,
  data: T,
  workspaceId: string | null = null,
): Promise<{ ok: boolean; error?: string }> {
  const state = stateForUser(userId);

  // Coffre verrouillé : on REFUSE, et bruyamment. Écrire en clair remettrait
  // les données à nu, et la lecture suivante l'accepterait sans rien signaler
  // puisque le format en clair reste valide. Le cache local n'est pas écrit non
  // plus : il servirait de source à une synchro ultérieure et propagerait la
  // même erreur.
  if (!canWrite(state)) {
    return { ok: false, error: "vault-locked" };
  }

  // Cache immédiat : l'interface répond sans attendre le réseau.
  await writeCache(payloadKey, workspaceId, data);

  try {
    const plaintext = new TextEncoder().encode(JSON.stringify(data));
    const key = shouldEncrypt(state) ? keyForUser(userId) : null;

    let payload: Record<string, unknown>;
    if (key) {
      await sodium.ready();
      const { ciphertext, nonce } = sodium.seal(plaintext, key);
      payload = {
        user_id: userId,
        workspace_id: workspaceId,
        payload_key: payloadKey,
        ciphertext: u8ToBase64(ciphertext),
        nonce: u8ToBase64(nonce),
        crypto_version: CRYPTO_SECRETBOX,
        updated_at: new Date().toISOString(),
      };
    } else {
      // Chiffrement pas encore activé par l'utilisateur : on continue comme
      // avant. Le lui imposer sans son accord lui ferait perdre l'accès à ses
      // propres données s'il ne note pas sa phrase.
      payload = {
        user_id: userId,
        workspace_id: workspaceId,
        payload_key: payloadKey,
        ciphertext: u8ToBase64(plaintext),
        nonce: u8ToBase64(EMPTY_NONCE),
        crypto_version: CRYPTO_PLAINTEXT,
        updated_at: new Date().toISOString(),
      };
    }

    // L'index unique utilise coalesce : l'upsert de Supabase ne sait pas s'en
    // servir. On fait donc select puis update ou insert à la main.
    let query = supabase
      .from("encrypted_payloads")
      .select("id")
      .eq("user_id", userId)
      .eq("payload_key", payloadKey);
    query = workspaceId
      ? query.eq("workspace_id", workspaceId)
      : query.is("workspace_id", null);
    const { data: existing } = await query.maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("encrypted_payloads")
        .update(payload)
        .eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("encrypted_payloads").insert(payload);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, error: err.message };
  }
}

// ============================================================================
// API S1 — surface consommée par les écrans
// ============================================================================


// ============================================================================
// Devise des payloads PARTAGÉS
//
// Problème : dans un espace commun, si Ramy (euros) convertissait les montants,
// il réécrivait les données de Stivie (yens). Les réglages d'un membre ne
// doivent JAMAIS modifier ce que voient les autres.
//
// Solution : chaque payload porte la devise de ses nombres — fixée par son
// créateur, immuable ensuite. À la lecture on convertit vers la devise
// d'affichage du lecteur ; à l'écriture on reconvertit vers celle du payload.
// Les nombres stockés restent donc identiques pour tout le monde.
// ============================================================================

/** Devise dans laquelle les nombres d'un payload sont exprimés. */
export type CurrencyStamped = { currency?: CurrencyCode };

/**
 * Convertit un payload de sa devise vers `display` (lecture), ou l'inverse
 * (écriture). Sans devise enregistrée — données d'avant cette version — on ne
 * touche à rien : on ignore dans quelle devise elles sont, mieux vaut ne rien
 * faire que fausser des montants.
 */
async function convertPayload<T>(
  payload: T,
  stamped: CurrencyCode | undefined,
  display: CurrencyCode | undefined,
  apply: (data: T, from: CurrencyCode, to: CurrencyCode, rates: NonNullable<Awaited<ReturnType<typeof getRates>>>) => T,
  direction: "toDisplay" | "toStored",
): Promise<T> {
  if (!stamped || !display || stamped === display) return payload;
  const rates = await getRates();
  if (!rates) return payload; // hors ligne : afficher tel quel plutôt que faux
  return direction === "toDisplay"
    ? apply(payload, stamped, display, rates)
    : apply(payload, display, stamped, rates);
}

export async function loadS1(
  userId: string,
  workspaceId: string | null = null,
  displayCurrency?: CurrencyCode,
): Promise<S1Payload> {
  const payload = await readPayload<S1Payload>("s1", userId, EMPTY_S1_PAYLOAD, workspaceId);
  return convertPayload(
    payload,
    (payload as S1Payload & CurrencyStamped).currency,
    displayCurrency,
    (d, from, to, rates) => convertGoals(d as Record<string, unknown>, from, to, rates) as S1Payload,
    "toDisplay",
  );
}

export async function saveS1(
  userId: string,
  payload: S1Payload,
  workspaceId: string | null = null,
  displayCurrency?: CurrencyCode,
): Promise<{ ok: boolean; error?: string }> {
  // Devise du payload : celle déjà enregistrée, sinon celle du créateur.
  const existing = await readPayload<S1Payload & CurrencyStamped>(
    "s1", userId, EMPTY_S1_PAYLOAD as S1Payload & CurrencyStamped, workspaceId,
  );
  const stamped = existing.currency ?? displayCurrency;
  const back = await convertPayload(
    payload,
    stamped,
    displayCurrency,
    (d, from, to, rates) => convertGoals(d as Record<string, unknown>, from, to, rates) as S1Payload,
    "toStored",
  );
  return writePayload<S1Payload & CurrencyStamped>(
    "s1", userId, { ...back, currency: stamped }, workspaceId,
  );
}

// ============================================================================
// API Budget — le tab Budget scopé par workspace (Premium).
//
// Perso : le budget reste 100 % local (AsyncStorage `netbudget:state`),
// géré par index.tsx — AUCUN changement pour le free tier.
// Workspace : le budget vit ici (cloud + cache), partagé entre les membres.
// Les types précis (IncomeSource, ExpenseItem, Loan) vivent dans index.tsx ;
// on stocke "tel quel" comme le fait déjà utils/storage.ts.
// ============================================================================

export type BudgetPayload = {
  incomes?: unknown[];
  rent?: string;
  expenseItems?: unknown[];
  loans?: unknown[];
};

export async function loadBudget(
  userId: string,
  workspaceId: string,
): Promise<BudgetPayload | null> {
  return readPayload<BudgetPayload | null>("budget", userId, null, workspaceId);
}

export async function saveBudget(
  userId: string,
  payload: BudgetPayload,
  workspaceId: string,
): Promise<{ ok: boolean; error?: string }> {
  return writePayload<BudgetPayload>("budget", userId, payload, workspaceId);
}

// ============================================================================
// API Historique budget — un point agrégé par mois et par scope, enregistré
// automatiquement quand le budget change (voir index.tsx).
// Perso : local uniquement (le budget perso ne quitte jamais le téléphone).
// Workspace : cloud partagé entre membres + cache local.
// ============================================================================

export type BudgetHistoryItemLine = {
  id: string;
  label: string; // label résolu au moment de l'enregistrement
  family: string; // "besoins" | "loisirs" | "epargne"
  amount: number;
};

// Détail du mois — permet la fiche mois et la comparaison ligne par ligne.
export type BudgetHistoryBreakdown = {
  rent: number;
  loans: number;
  besoins: number;
  loisirs: number;
  epargne: number;
  items: BudgetHistoryItemLine[];
};

export type BudgetHistoryPoint = {
  month: string; // "2026-07"
  net: number; // net mensuel moyen
  expenses: number; // dépenses mensuelles totales
  remaining: number; // reste à vivre
  breakdown?: BudgetHistoryBreakdown; // absent sur les points antérieurs à cette version
};

const HISTORY_KEY = "budget_history";
const HISTORY_MAX_MONTHS = 24;

export async function loadBudgetHistory(
  userId: string,
  workspaceId: string | null,
): Promise<BudgetHistoryPoint[]> {
  if (!workspaceId) {
    return (await readCache<BudgetHistoryPoint[]>(HISTORY_KEY, null)) ?? [];
  }
  return readPayload<BudgetHistoryPoint[]>(HISTORY_KEY, userId, [], workspaceId);
}

/**
 * Remplace TOUT l'historique d'un scope. Utilisé par la conversion de devise
 * (on réécrit les points convertis) — pas par l'enregistrement courant, qui
 * passe par recordBudgetHistoryPoint.
 */
export async function saveBudgetHistory(
  userId: string,
  points: BudgetHistoryPoint[],
  workspaceId: string | null,
): Promise<void> {
  await writePayload(HISTORY_KEY, userId, points, workspaceId);
}

export async function recordBudgetHistoryPoint(
  userId: string,
  workspaceId: string | null,
  point: BudgetHistoryPoint,
): Promise<void> {
  const hist = await loadBudgetHistory(userId, workspaceId);
  const next = hist.filter((h) => h.month !== point.month);
  next.push(point);
  next.sort((a, b) => a.month.localeCompare(b.month));
  const trimmed = next.slice(-HISTORY_MAX_MONTHS);
  if (!workspaceId) {
    await writeCache(HISTORY_KEY, null, trimmed);
  } else {
    await writePayload(HISTORY_KEY, userId, trimmed, workspaceId);
  }
}

// DEV uniquement (bouton __DEV__ dans PremiumHomePanel) : remplit l'historique
// avec 8 mois de démonstration pour visualiser le graphe sans attendre.
// Le point du mois courant sera ré-écrasé par les vraies données du budget.
export async function seedDemoBudgetHistory(
  userId: string,
  workspaceId: string | null,
): Promise<BudgetHistoryPoint[]> {
  const base = [
    { net: 2980, expenses: 2210 },
    { net: 2980, expenses: 2350 },
    { net: 3050, expenses: 2180 },
    { net: 3050, expenses: 2050 },
    { net: 3050, expenses: 2400 },
    { net: 3150, expenses: 2220 },
    { net: 3150, expenses: 2100 },
    { net: 3150, expenses: 1900 },
  ];
  const RENT = 900;
  const LOANS = 250;
  const now = new Date();
  const points: BudgetHistoryPoint[] = base.map((b, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (base.length - 1 - i), 1);
    // Ventilation cohérente : dépenses = loyer + prêts + besoins + loisirs + épargne
    const rest = b.expenses - RENT - LOANS;
    const besoins = Math.round(rest * 0.55);
    const loisirs = Math.round(rest * 0.3);
    const epargne = rest - besoins - loisirs;
    const alimentation = Math.round(besoins * 0.6);
    const sorties = Math.round(loisirs * 0.7);
    return {
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      net: b.net,
      expenses: b.expenses,
      remaining: b.net - b.expenses,
      breakdown: {
        rent: RENT,
        loans: LOANS,
        besoins,
        loisirs,
        epargne,
        items: [
          { id: "alimentation", label: "Alimentation", family: "besoins", amount: alimentation },
          { id: "transport", label: "Transport", family: "besoins", amount: besoins - alimentation },
          { id: "sorties", label: "Sorties / Restos", family: "loisirs", amount: sorties },
          { id: "streaming", label: "Streaming / Hobbies", family: "loisirs", amount: loisirs - sorties },
          { id: "livret", label: "Livret A / LDDS", family: "epargne", amount: epargne },
        ],
      },
    };
  });
  if (!workspaceId) {
    await writeCache(HISTORY_KEY, null, points);
  } else {
    await writePayload(HISTORY_KEY, userId, points, workspaceId);
  }
  return points;
}

// ============================================================================
// API Dépôt de conseils — les cartes que l'utilisateur GARDE (swipe droite
// à l'anniversaire, plus tard depuis le Coach). Perso uniquement.
// ============================================================================

export type SavedAdviceItem = {
  id: string;
  emoji?: string;
  title: string;
  body: string;
  tone?: "good" | "gold" | "bad" | "neutral";
  sources?: string[]; // liens officiels
  savedAt: string; // ISO
  source: string; // "birthday" | "child:<nom>" | "pet:<nom>" | "coach" | …
};

// Anniversaires suivis (enfants, animaux) — même mécanique de cartes le jour J.
export type CelebrationPerson = {
  id: string;
  kind: "child" | "pet";
  name: string;
  birthdate: string; // ISO "AAAA-MM-JJ"
  species?: "dog" | "cat" | "other";
};

const CELEBRATIONS_KEY = "celebrations";

export async function loadCelebrations(userId: string): Promise<CelebrationPerson[]> {
  return readPayload<CelebrationPerson[]>(CELEBRATIONS_KEY, userId, [], null);
}

export async function saveCelebrations(
  userId: string,
  list: CelebrationPerson[],
): Promise<void> {
  await writePayload(CELEBRATIONS_KEY, userId, list, null);
}

// ============================================================================
// API Budgets d'événements — mariage, voyage, naissance, funérailles, fêtes…
// Scopé par workspace : un événement créé dans un espace couple/famille est
// partagé ; en Perso il reste local à l'utilisateur.
// ============================================================================

export type EventLineItem = {
  id: string;
  label: string;
  emoji?: string;
  estimated: number; // budget prévu (€)
  actual?: number | null; // dépensé/devisé réel
  paidBy?: string; // qui paie / a payé (texte libre, utile à plusieurs)
  done?: boolean; // poste réglé
};

export type EventMilestone = {
  id: string;
  label: string;
  monthsBefore: number; // jalons du rétro-planning (0 = jour J)
  done?: boolean;
};

// Relevé de prix : l'utilisateur note un devis/prix repéré (vol, hôtel,
// traiteur…) à une date donnée — l'app montre l'évolution entre relevés.
export type EventQuote = {
  id: string;
  label: string; // "Vol Paris-Dakar", "Traiteur Maison X"…
  price: number;
  date: string; // ISO
  source?: string; // site/prestataire (texte libre)
};

export type EventProject = {
  id: string;
  type: string; // clé du template (wedding, travel, baby…)
  name: string;
  emoji: string;
  dateIso: string; // date de l'événement "AAAA-MM-JJ"
  guests?: number | null;
  tier?: "low" | "mid" | "high";
  style?: string; // réponse au mini-questionnaire (aventure, détente…)
  destinations?: string[]; // voyage : une ou plusieurs étapes
  items: EventLineItem[];
  milestones: EventMilestone[];
  quotes?: EventQuote[]; // suivi des prix dans le temps
  saved: number; // épargne déjà mise de côté pour l'événement
  createdAt: string; // ISO
};

const EVENTS_KEY = "events";

// Les événements sont stockés sous forme d'enveloppe { currency, events } pour
// porter leur devise. L'ancien format (tableau nu) reste lisible.
type EventsEnvelope = { currency?: CurrencyCode; events: EventProject[] };

function unwrapEvents(raw: EventProject[] | EventsEnvelope): EventsEnvelope {
  return Array.isArray(raw) ? { events: raw } : raw;
}

export async function loadEvents(
  userId: string,
  workspaceId: string | null,
  displayCurrency?: CurrencyCode,
): Promise<EventProject[]> {
  const raw = await readPayload<EventProject[] | EventsEnvelope>(
    EVENTS_KEY, userId, [], workspaceId,
  );
  const env = unwrapEvents(raw);
  return convertPayload(
    env.events,
    env.currency,
    displayCurrency,
    (d, from, to, rates) =>
      convertEvents(d as unknown as Record<string, unknown>[], from, to, rates) as unknown as EventProject[],
    "toDisplay",
  );
}

export async function saveEvents(
  userId: string,
  list: EventProject[],
  workspaceId: string | null,
  displayCurrency?: CurrencyCode,
): Promise<void> {
  const raw = await readPayload<EventProject[] | EventsEnvelope>(
    EVENTS_KEY, userId, [], workspaceId,
  );
  const stamped = unwrapEvents(raw).currency ?? displayCurrency;
  const back = await convertPayload(
    list,
    stamped,
    displayCurrency,
    (d, from, to, rates) =>
      convertEvents(d as unknown as Record<string, unknown>[], from, to, rates) as unknown as EventProject[],
    "toStored",
  );
  await writePayload<EventsEnvelope>(
    EVENTS_KEY, userId, { currency: stamped, events: back }, workspaceId,
  );
}

const SAVED_ADVICE_KEY = "saved_advice";

export async function loadSavedAdvice(userId: string): Promise<SavedAdviceItem[]> {
  return readPayload<SavedAdviceItem[]>(SAVED_ADVICE_KEY, userId, [], null);
}

export async function addSavedAdvice(
  userId: string,
  item: SavedAdviceItem,
): Promise<void> {
  const list = await loadSavedAdvice(userId);
  if (list.some((x) => x.id === item.id)) return; // déjà gardé
  await writePayload(SAVED_ADVICE_KEY, userId, [item, ...list], null);
}

export async function removeSavedAdvice(
  userId: string,
  id: string,
): Promise<void> {
  const list = await loadSavedAdvice(userId);
  await writePayload(
    SAVED_ADVICE_KEY,
    userId,
    list.filter((x) => x.id !== id),
    null,
  );
}

// ============================================================================
// API Profil advice — pour personnaliser les conseils Premium
// ============================================================================

const EMPTY_PROFILE: UserProfile = {};

// Profil advice scopé : le profil d'un workspace "couple" peut différer du
// profil perso (ex: situation familiale du foyer vs individuelle).
export async function loadAdviceProfile(
  userId: string,
  workspaceId: string | null = null,
): Promise<UserProfile> {
  return readPayload<UserProfile>(
    "advice_profile",
    userId,
    EMPTY_PROFILE,
    workspaceId,
  );
}

export async function saveAdviceProfile(
  userId: string,
  profile: UserProfile,
  workspaceId: string | null = null,
): Promise<{ ok: boolean; error?: string }> {
  return writePayload<UserProfile>(
    "advice_profile",
    userId,
    profile,
    workspaceId,
  );
}
