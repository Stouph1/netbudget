// Deux rappels mensuels :
//  - DÉBUT DE MOIS (1er à 10h00) : prépare ton budget pour le mois qui commence.
//  - FIN DE MOIS (28 à 10h00) : fais ton point avant de boucler le mois.
//
// Heure 10h00 : visible le matin sans réveiller, avant la routine.
// L'utilisateur peut désactiver les deux d'un coup depuis les Réglages.
// Permission demandée une seule fois — refusée, on n'insiste pas.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const ENABLED_KEY = "netbudget:notifications:monthlyEnabled";
const PERMISSION_ASKED_KEY = "netbudget:notifications:permissionAsked";
const SCHEDULED_START_ID_KEY = "netbudget:notifications:monthlyStartId";
const SCHEDULED_END_ID_KEY = "netbudget:notifications:monthlyEndId";

const START_REMINDER_DAY = 1;
const END_REMINDER_DAY = 28;
const REMINDER_HOUR = 10;
const REMINDER_MINUTE = 0;

export type MonthlyVariants = {
  start: { title: string; body: string };
  end: { title: string; body: string };
};

// 3 variantes par notif qui tournent selon le mois (mois % 3) — évite la
// répétition lassante. Rotation déterministe : facile à tester et prévisible.
//
// L'OS répète la notif avec le MÊME contenu tant que le calendar trigger est
// actif. Pour varier, on reschedule à chaque ouverture de l'app avec la
// variante du mois CIBLE (celui où la prochaine notif tombera).
function pickVariant(
  prefix: "monthStart" | "monthEnd",
  day: number,
  t: (key: string) => string,
  now: Date,
): { title: string; body: string } {
  const target = new Date(now);
  const hasPassedDayThisMonth =
    now.getDate() > day ||
    (now.getDate() === day &&
      (now.getHours() > REMINDER_HOUR ||
        (now.getHours() === REMINDER_HOUR && now.getMinutes() >= REMINDER_MINUTE)));
  if (hasPassedDayThisMonth) {
    target.setMonth(now.getMonth() + 1);
  }
  const idx = target.getMonth() % 3;
  const suffix = idx === 0 ? "" : `.v${idx + 1}`;
  return {
    title: t(`notification.${prefix}.title${suffix}`),
    body: t(`notification.${prefix}.body${suffix}`),
  };
}

export function pickMonthlyVariants(
  t: (key: string) => string,
  now: Date = new Date(),
): MonthlyVariants {
  return {
    start: pickVariant("monthStart", START_REMINDER_DAY, t, now),
    end: pickVariant("monthEnd", END_REMINDER_DAY, t, now),
  };
}

// Configuration globale du comportement de la notif quand l'app est ouverte.
// Appelée une fois au boot, idempotent.
let handlerSet = false;
export function setupNotificationHandler(): void {
  if (handlerSet) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerSet = true;
}

// Crée un canal Android dédié — sans canal, les notifs n'apparaissent pas sur Android 8+.
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("monthly-reminder", {
    name: "Rappel mensuel",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
    lightColor: "#10B981",
  });
}

export async function getMonthlyEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ENABLED_KEY);
    return v === null ? true : v === "1"; // par défaut activé
  } catch {
    return true;
  }
}

async function setMonthlyEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
  } catch {}
}

async function getStoredId(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function setStoredId(key: string, id: string | null): Promise<void> {
  try {
    if (id === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, id);
  } catch {}
}

// Vérifie l'état de permission ; ne déclenche PAS la demande système.
export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// Demande la permission une seule fois ; mémorise qu'on a demandé pour ne pas
// harceler l'utilisateur s'il refuse.
export async function requestPermissionOnce(): Promise<boolean> {
  const already = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
  if (already === "1") {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  }
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  await AsyncStorage.setItem(PERMISSION_ASKED_KEY, "1");
  return status === "granted";
}

async function cancelOne(key: string): Promise<void> {
  const id = await getStoredId(key);
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
  await setStoredId(key, null);
}

// Annule les deux notifs programmées et oublie leurs ids locaux.
export async function cancelMonthlyReminders(): Promise<void> {
  await cancelOne(SCHEDULED_START_ID_KEY);
  await cancelOne(SCHEDULED_END_ID_KEY);
}

async function scheduleOne(
  day: number,
  identifier: string,
  storageKey: string,
  title: string,
  body: string,
): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: "monthly-reminder" } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day,
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
        repeats: true,
      },
    });
    await setStoredId(storageKey, id);
    return id;
  } catch {
    return null;
  }
}

// Programme les deux notifs récurrentes (1er + 28 à 10h00). Idempotent : annule
// les existantes d'abord.
export async function scheduleMonthlyReminders(
  variants: MonthlyVariants,
): Promise<void> {
  await ensureAndroidChannel();
  await cancelMonthlyReminders();
  await scheduleOne(
    START_REMINDER_DAY,
    "netbudget-monthly-start",
    SCHEDULED_START_ID_KEY,
    variants.start.title,
    variants.start.body,
  );
  await scheduleOne(
    END_REMINDER_DAY,
    "netbudget-monthly-end",
    SCHEDULED_END_ID_KEY,
    variants.end.title,
    variants.end.body,
  );
}

// Toggle Settings : active ou désactive les rappels. Retourne le nouvel état effectif.
export async function setMonthlyReminderEnabled(
  enabled: boolean,
  variants: MonthlyVariants,
): Promise<boolean> {
  if (enabled) {
    const granted = await requestPermissionOnce();
    if (!granted) {
      await setMonthlyEnabled(false);
      return false;
    }
    await scheduleMonthlyReminders(variants);
    await setMonthlyEnabled(true);
    return true;
  }
  await cancelMonthlyReminders();
  await setMonthlyEnabled(false);
  return false;
}

// Appelé au boot : si l'utilisateur a déjà la permission et le toggle ON, on
// (re)programme les notifs. Permet de couvrir le cas où l'OS a effacé la planif
// (réinstall, mise à jour majeure, redémarrage prolongé).
export async function ensureMonthlyRemindersScheduled(
  variants: MonthlyVariants,
): Promise<void> {
  const enabled = await getMonthlyEnabled();
  if (!enabled) return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;
  await scheduleMonthlyReminders(variants);
}
