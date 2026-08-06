// Notifications des budgets d'événements : rappels de jalons + jour J.
// Import dynamique d'expo-notifications (inopérant sur le web, jamais bloquant).

import type { EventProject } from "../lib/premiumStore";

// Date d'un jalon : la date de l'événement moins N mois, à 09:00.
export function milestoneDate(eventDateIso: string, monthsBefore: number): Date {
  const d = new Date(eventDateIso + "T09:00:00");
  d.setMonth(d.getMonth() - monthsBefore);
  return d;
}

// (Re)planifie toutes les notifications d'un événement : un rappel par jalon
// non fait et à venir, un rappel J-7 et le jour J. Identifiants stables
// "event-<id>-…" pour pouvoir annuler à la mise à jour/suppression.
export async function scheduleEventNotifications(ev: EventProject): Promise<number> {
  try {
    const Notifications = await import("expo-notifications");
    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) {
      const req = await Notifications.requestPermissionsAsync();
      if (!req.granted) return 0;
    }
    await cancelEventNotifications(ev.id);
    const now = Date.now();
    let scheduled = 0;
    const push = async (id: string, title: string, body: string, date: Date) => {
      if (date.getTime() <= now) return;
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
      scheduled++;
    };
    for (const ms of ev.milestones) {
      if (ms.done || ms.monthsBefore === 0) continue;
      await push(
        `event-${ev.id}-${ms.id}`,
        `${ev.emoji} ${ev.name}`,
        `C'est le moment : ${ms.label}`,
        milestoneDate(ev.dateIso, ms.monthsBefore),
      );
    }
    const j7 = new Date(ev.dateIso + "T09:00:00");
    j7.setDate(j7.getDate() - 7);
    await push(
      `event-${ev.id}-j7`,
      `${ev.emoji} ${ev.name} — J-7 !`,
      "Dernière ligne droite : confirme les effectifs et vérifie le budget dans NetBudget.",
      j7,
    );
    await push(
      `event-${ev.id}-jday`,
      `${ev.emoji} C'est le grand jour !`,
      `${ev.name} — profite, tout est prêt. NetBudget te souhaite un merveilleux moment.`,
      new Date(ev.dateIso + "T08:30:00"),
    );
    return scheduled;
  } catch {
    return 0;
  }
}

export async function cancelEventNotifications(eventId: string): Promise<void> {
  try {
    const Notifications = await import("expo-notifications");
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.identifier.startsWith(`event-${eventId}-`)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
      }
    }
  } catch {}
}
