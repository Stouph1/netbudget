// Notifications des budgets d'événements : rappels de jalons + jour J.
// Import dynamique d'expo-notifications (inopérant sur le web, jamais bloquant).

import { resolveEventLabel } from "../constants/eventTemplates";
import { t as translateDefault } from "../i18n/translations";
import type { EventProject } from "../lib/premiumStore";

/** Remplace les {jetons} d'un modèle traduit. */
function interp(tpl: string, params: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

// Date d'un jalon : la date de l'événement moins N mois, à 09:00.
export function milestoneDate(eventDateIso: string, monthsBefore: number): Date {
  const d = new Date(eventDateIso + "T09:00:00");
  d.setMonth(d.getMonth() - monthsBefore);
  return d;
}

/**
 * Jalons à rappeler, regroupés par jour.
 *
 * Deux jalons « 3 mois avant » tombent le même matin : deux notifications
 * identiques à la même minute, ce que tout le monde lit comme un bug. Un
 * seul rappel liste alors les deux tâches.
 */
export function groupMilestonesByDay(
  ev: Pick<EventProject, "dateIso" | "milestones">,
): { at: Date; ids: string[]; labels: string[] }[] {
  const byDay = new Map<number, { at: Date; ids: string[]; labels: string[] }>();
  for (const ms of ev.milestones) {
    if (ms.done || ms.monthsBefore === 0) continue;
    const at = milestoneDate(ev.dateIso, ms.monthsBefore);
    const key = at.getTime();
    const g = byDay.get(key) ?? { at, ids: [], labels: [] };
    g.ids.push(ms.id);
    g.labels.push(ms.label);
    byDay.set(key, g);
  }
  return [...byDay.values()].sort((a, b) => a.at.getTime() - b.at.getTime());
}

// (Re)planifie toutes les notifications d'un événement : un rappel par jalon
// non fait et à venir, un rappel J-7 et le jour J. Identifiants stables
// "event-<id>-…" pour pouvoir annuler à la mise à jour/suppression.
// `translate` : le `t` de la langue courante (LangContext). Les jalons sont
// persistés sous forme de CLÉ i18n — sans traducteur on retomberait sur la
// langue par défaut. Les événements d'avant l'i18n gardent leur texte brut.
export async function scheduleEventNotifications(
  ev: EventProject,
  translate: (key: string) => string = (key) => translateDefault(key),
): Promise<number> {
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
    for (const group of groupMilestonesByDay(ev)) {
      await push(
        `event-${ev.id}-${group.ids.join("+")}`,
        `${ev.emoji} ${ev.name}`,
        interp(translate("evtNotif.milestone"), {
          label: group.labels.map((l) => resolveEventLabel(l, translate)).join(" · "),
        }),
        group.at,
      );
    }
    const j7 = new Date(ev.dateIso + "T09:00:00");
    j7.setDate(j7.getDate() - 7);
    await push(
      `event-${ev.id}-j7`,
      interp(translate("evtNotif.j7.title"), { emoji: ev.emoji, name: ev.name }),
      translate("evtNotif.j7.body"),
      j7,
    );
    await push(
      `event-${ev.id}-jday`,
      interp(translate("evtNotif.jday.title"), { emoji: ev.emoji }),
      interp(translate("evtNotif.jday.body"), { name: ev.name }),
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
