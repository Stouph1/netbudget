// Planification des notifications personnalisées.
//
// Le moteur (notificationEngine.ts) décide, les adaptateurs
// (notificationContext.ts) traduisent les données ; ce module est le seul à
// avoir des effets de bord : stockage, permissions, programmation système.
//
// DEUX ÉTATS À NE PAS CONFONDRE
//   - `planned` : notifications programmées mais pas encore délivrées. On les
//     annule et on les reprogramme à chaque synchronisation, parce que le
//     contexte a pu changer (objectif atteint entre-temps, jalon coché).
//   - `sent`    : notifications dont l'heure est passée, donc réellement
//     reçues. Celles-là ne reviendront jamais — c'est ce qui garantit qu'on ne
//     répète pas le même message.
//
// Le passage de `planned` à `sent` se fait à la synchronisation suivante, en
// comparant l'heure prévue à maintenant. Pas de callback système à écouter,
// donc rien qui puisse se désynchroniser si l'app est tuée.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { resolveAdviceText } from "../types/advice";
import {
  DEFAULT_NOTIF_PREFS,
  planNotifications,
  type NotifCandidate,
  type NotifContext,
  type NotifPrefs,
} from "./notificationEngine";
import { requestPermissionOnce } from "./notifications";

const PREFS_KEY = "netbudget:notifications:prefs";
const PLANNED_KEY = "netbudget:notifications:planned";
const SENT_KEY = "netbudget:notifications:sent";
const LAST_OPENED_KEY = "netbudget:notifications:lastOpened";
const SEEN_ADVICE_KEY = "netbudget:notifications:seenAdvice";

const CHANNEL_ID = "personal";

/** Au-delà, l'historique des envois ne sert plus qu'à grossir le stockage. */
const SENT_HISTORY_MAX = 300;

type PlannedEntry = { notifId: string; at: string };
type PlannedMap = Record<string, PlannedEntry>;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ============================================================================
// Préférences
// ============================================================================

export async function loadNotifPrefs(): Promise<NotifPrefs> {
  const stored = await readJson<Partial<NotifPrefs>>(PREFS_KEY, {});
  // Fusion avec les défauts : une catégorie ajoutée dans une version future
  // arrive activée plutôt qu'absente (donc traitée comme désactivée).
  return { ...DEFAULT_NOTIF_PREFS, ...stored };
}

export async function saveNotifPrefs(prefs: NotifPrefs): Promise<void> {
  await writeJson(PREFS_KEY, prefs);
}

// ============================================================================
// Traces d'activité
// ============================================================================

/** Appelé au démarrage : sert à mesurer une absence, jamais à culpabiliser. */
export async function markAppOpened(now: Date = new Date()): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_OPENED_KEY, now.toISOString());
  } catch {}
}

export async function getLastOpenedAt(): Promise<Date | undefined> {
  try {
    const raw = await AsyncStorage.getItem(LAST_OPENED_KEY);
    if (!raw) return undefined;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

/** Conseils déjà affichés — on ne notifie que ce que l'utilisateur n'a pas vu. */
export async function getSeenAdviceIds(): Promise<string[]> {
  return readJson<string[]>(SEEN_ADVICE_KEY, []);
}

export async function markAdviceSeen(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const current = await getSeenAdviceIds();
  const merged = [...new Set([...current, ...ids])];
  await writeJson(SEEN_ADVICE_KEY, merged);
}

// ============================================================================
// Programmation
// ============================================================================

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "NetBudget",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
    lightColor: "#4ADE80",
  });
}

/**
 * Bascule les notifications dont l'heure est passée de `planned` vers `sent`,
 * et annule celles encore à venir pour laisser la place au nouveau plan.
 *
 * Renvoie la carte `sent` à jour, qui alimentera `alreadySent`.
 */
async function rotatePlanned(now: Date): Promise<Record<string, string>> {
  const planned = await readJson<PlannedMap>(PLANNED_KEY, {});
  const sent = await readJson<Record<string, string>>(SENT_KEY, {});

  for (const [id, entry] of Object.entries(planned)) {
    const at = new Date(entry.at);
    if (!Number.isNaN(at.getTime()) && at.getTime() <= now.getTime()) {
      sent[id] = entry.at; // délivrée : elle ne repassera plus
      continue;
    }
    try {
      await Notifications.cancelScheduledNotificationAsync(entry.notifId);
    } catch {}
  }

  const pruned = Object.entries(sent)
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, SENT_HISTORY_MAX);

  const next = Object.fromEntries(pruned);
  await writeJson(SENT_KEY, next);
  await writeJson(PLANNED_KEY, {});
  return next;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * Texte affiché d'une candidate.
 *
 * Le corps d'une notification « droits » est le TITRE d'une carte de conseil :
 * soit une clé i18n, soit du français en dur pour les cartes non migrées.
 * `resolveAdviceText` gère les deux cas.
 */
function renderCandidate(
  c: NotifCandidate,
  t: Translate,
): { title: string; body: string } {
  return {
    title: t(c.titleKey, c.params),
    body:
      c.category === "rights"
        ? resolveAdviceText(c.bodyKey, t, c.bodyKey)
        : t(c.bodyKey, c.params),
  };
}

async function scheduleCandidate(
  c: NotifCandidate,
  t: Translate,
): Promise<PlannedEntry | null> {
  const { title, body } = renderCandidate(c, t);
  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        // La route voyage dans le payload : au tap, l'app ouvre l'écran
        // concerné. Une notification qui retombe sur l'accueil oblige
        // l'utilisateur à retrouver lui-même ce dont on vient de lui parler.
        data: { route: c.route ?? null, category: c.category, notifKey: c.id },
        ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: c.at,
      },
    });
    return { notifId, at: c.at.toISOString() };
  } catch {
    return null;
  }
}

/** Tout ce dont la synchronisation a besoin, hors préférences et historique. */
export type SyncInput = Omit<NotifContext, "prefs" | "alreadySent" | "lastOpenedAt">;

export type SyncResult = {
  /** Notifications effectivement programmées. */
  scheduled: NotifCandidate[];
  /** Raison d'un plan vide, pour l'écran de réglages. */
  blocked?: "permission" | "none";
};

/**
 * Recalcule et reprogramme le plan complet.
 *
 * Idempotent : deux appels d'affilée avec les mêmes données produisent le même
 * état. C'est ce qui permet de l'appeler à chaque ouverture de l'app sans
 * risquer d'empiler les notifications.
 */
export async function syncPersonalNotifications(
  input: SyncInput,
  t: Translate,
  opts: { requestPermission?: boolean } = {},
): Promise<SyncResult> {
  const prefs = await loadNotifPrefs();

  const granted = opts.requestPermission
    ? await requestPermissionOnce()
    : (await Notifications.getPermissionsAsync()).status === "granted";
  if (!granted) {
    // Sans permission, on ne touche à rien : l'utilisateur a dit non, on ne
    // reformule pas la question à chaque ouverture.
    return { scheduled: [], blocked: "permission" };
  }

  await ensureChannel();

  const alreadySent = await rotatePlanned(input.now);
  const lastOpenedAt = await getLastOpenedAt();

  const plan = planNotifications({ ...input, prefs, alreadySent, lastOpenedAt });

  const planned: PlannedMap = {};
  const scheduled: NotifCandidate[] = [];
  for (const c of plan) {
    const entry = await scheduleCandidate(c, t);
    if (entry) {
      planned[c.id] = entry;
      scheduled.push(c);
    }
  }
  await writeJson(PLANNED_KEY, planned);

  return { scheduled, blocked: scheduled.length === 0 ? "none" : undefined };
}

/** Annule tout le plan personnalisé — utilisé quand l'utilisateur coupe tout. */
export async function cancelPersonalNotifications(): Promise<void> {
  const planned = await readJson<PlannedMap>(PLANNED_KEY, {});
  for (const entry of Object.values(planned)) {
    try {
      await Notifications.cancelScheduledNotificationAsync(entry.notifId);
    } catch {}
  }
  await writeJson(PLANNED_KEY, {});
}

/**
 * Aperçu sans effet de bord, pour l'écran de réglages.
 *
 * Montrer ce qui va arriver est la meilleure défense contre le réflexe « je
 * coupe tout » : l'utilisateur voit qu'il s'agit de trois messages utiles, pas
 * d'un robinet.
 */
export async function previewNotifications(
  input: SyncInput,
  overrides?: Partial<NotifPrefs>,
): Promise<NotifCandidate[]> {
  const prefs = { ...(await loadNotifPrefs()), ...overrides };
  const alreadySent = await readJson<Record<string, string>>(SENT_KEY, {});
  const lastOpenedAt = await getLastOpenedAt();
  return planNotifications({ ...input, prefs, alreadySent, lastOpenedAt });
}
