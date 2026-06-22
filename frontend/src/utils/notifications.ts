// Rappel mensuel : programme une notification locale le 28 de chaque mois à 10h00.
// Pourquoi le 28 : la plupart des salaires tombent en début/milieu de mois ; le 28
// laisse 3-4 jours pour ajuster son budget avant la fin du mois et anticiper le
// prochain. Heure 10h00 : visible le matin sans réveiller, avant la routine.
//
// L'utilisateur peut désactiver depuis les Réglages. Permission demandée une seule
// fois — refusée, on n'insiste pas (on garde un drapeau pour éviter de re-demander).

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const ENABLED_KEY = "netbudget:notifications:monthlyEnabled";
const PERMISSION_ASKED_KEY = "netbudget:notifications:permissionAsked";
const SCHEDULED_ID_KEY = "netbudget:notifications:monthlyId";

const REMINDER_DAY = 28;
const REMINDER_HOUR = 10;
const REMINDER_MINUTE = 0;

// 3 variantes qui tournent en fonction du mois — évite la répétition lassante
// chaque mois. Rotation déterministe (mois % 3) : facile à tester et prévisible.
//
// L'OS répète la notif avec le MÊME titre/corps tant que le calendar trigger est
// actif. Pour varier, on resschedule à chaque ouverture de l'app (voir
// `ensureMonthlyReminderScheduled` côté appelant) avec la variante du mois
// CIBLE (celui où la prochaine notif va tomber).
export function pickMonthlyVariant(
  t: (key: string) => string,
  now: Date = new Date(),
): { title: string; body: string } {
  // Mois cible : si on est passé le jour 28, la prochaine notif tombera le 28
  // du mois suivant, donc on prend la variante du mois suivant.
  const target = new Date(now);
  if (now.getDate() > REMINDER_DAY) {
    target.setMonth(now.getMonth() + 1);
  }
  const idx = target.getMonth() % 3;
  const suffix = idx === 0 ? "" : `.v${idx + 1}`;
  return {
    title: t(`notification.monthly.title${suffix}`),
    body: t(`notification.monthly.body${suffix}`),
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

async function getStoredScheduledId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SCHEDULED_ID_KEY);
  } catch {
    return null;
  }
}

async function setStoredScheduledId(id: string | null): Promise<void> {
  try {
    if (id === null) await AsyncStorage.removeItem(SCHEDULED_ID_KEY);
    else await AsyncStorage.setItem(SCHEDULED_ID_KEY, id);
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

// Annule la notif programmée et oublie son id local.
export async function cancelMonthlyReminder(): Promise<void> {
  const id = await getStoredScheduledId();
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
  await setStoredScheduledId(null);
}

// Programme la notif récurrente le 28 à 10h00. Idempotent : annule l'existant d'abord.
// `body` et `title` sont passés par l'appelant pour respecter la langue de l'app.
export async function scheduleMonthlyReminder(
  title: string,
  body: string,
): Promise<string | null> {
  await ensureAndroidChannel();
  await cancelMonthlyReminder();
  try {
    const id = await Notifications.scheduleNotificationAsync({
      identifier: "netbudget-monthly-reminder",
      content: {
        title,
        body,
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: "monthly-reminder" } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: REMINDER_DAY,
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
        repeats: true,
      },
    });
    await setStoredScheduledId(id);
    return id;
  } catch {
    return null;
  }
}

// Toggle Settings : active ou désactive le rappel. Retourne le nouvel état effectif.
export async function setMonthlyReminderEnabled(
  enabled: boolean,
  title: string,
  body: string,
): Promise<boolean> {
  if (enabled) {
    const granted = await requestPermissionOnce();
    if (!granted) {
      await setMonthlyEnabled(false);
      return false;
    }
    await scheduleMonthlyReminder(title, body);
    await setMonthlyEnabled(true);
    return true;
  }
  await cancelMonthlyReminder();
  await setMonthlyEnabled(false);
  return false;
}

// Appelé au boot : si l'utilisateur a déjà la permission et le toggle ON, on
// (re)programme la notif. Permet de couvrir le cas où l'OS a effacé la planif
// (réinstall, mise à jour majeure, redémarrage prolongé).
export async function ensureMonthlyReminderScheduled(
  title: string,
  body: string,
): Promise<void> {
  const enabled = await getMonthlyEnabled();
  if (!enabled) return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;
  await scheduleMonthlyReminder(title, body);
}
