// Prévenir de la vie d'un espace partagé — arrivée, départ, gros changement.
//
// Voir src/lib/workspaceActivity.ts pour la logique et ses limites : on
// compare ici ce qu'on vient de lire à l'instantané gardé sur l'appareil, et
// on notifie tout de suite. Mes propres écritures mettent l'instantané à jour
// (voir premiumStore.saveBudget / saveS1) : je ne suis pas prévenu de ce que
// je viens de faire moi-même.

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { loadBudget, loadS1 } from "../lib/premiumStore";
import {
  budgetTotalOf,
  diffWorkspace,
  type WorkspaceActivity,
  type WorkspaceSnapshot,
} from "../lib/workspaceActivity";
import { listMembersWithProfiles, listMyWorkspaces } from "../lib/workspacesStore";
import { loadNotifPrefs } from "./notificationScheduler";
import { readSnapshots, writeSnapshots, type SnapshotMap } from "../lib/workspaceSnapshots";

type Translate = (key: string, params?: Record<string, string | number>) => string;

function render(a: WorkspaceActivity, t: Translate, format: (n: number) => string) {
  const p = { who: "who" in a ? a.who : "", space: a.workspaceName };
  switch (a.kind) {
    case "joined":
      return { title: t("notif.ws.joined.title", p), body: t("notif.ws.joined.body", p) };
    case "left":
      return { title: t("notif.ws.left.title", p), body: t("notif.ws.left.body", p) };
    case "budget":
      return {
        title: t("notif.ws.budget.title", p),
        body: t("notif.ws.budget.body", { ...p, from: format(a.from), to: format(a.to) }),
      };
    case "goals":
      return {
        title: t("notif.ws.goals.title", p),
        body: t("notif.ws.goals.body", { ...p, n: a.to }),
      };
  }
}

/**
 * Relit mes espaces, compare, notifie, mémorise. Silencieux en cas d'échec :
 * une notification manquée ne doit jamais casser l'ouverture de l'app.
 */
export async function checkWorkspaceActivity(
  userId: string,
  t: Translate,
  format: (n: number) => string,
): Promise<WorkspaceActivity[]> {
  try {
    const prefs = await loadNotifPrefs();
    const workspaces = await listMyWorkspaces();
    const snapshots = await readSnapshots();
    const next: SnapshotMap = {};
    const found: WorkspaceActivity[] = [];

    for (const ws of workspaces) {
      const [members, budget, s1] = await Promise.all([
        listMembersWithProfiles(ws.id),
        loadBudget(userId, ws.id).catch(() => null),
        loadS1(userId, ws.id).catch(() => null),
      ]);
      const snap: WorkspaceSnapshot = {
        members: Object.fromEntries(
          members.map((m) => [m.user_id, m.first_name || m.username || t("notif.ws.someone")]),
        ),
        budgetTotal: budgetTotalOf(budget),
        goalsCount: s1?.goals?.length ?? 0,
      };
      next[ws.id] = snap;
      found.push(...diffWorkspace(snapshots[ws.id], snap, { id: ws.id, name: ws.name }, userId));
    }
    await writeSnapshots(next);

    if (!prefs.workspace || found.length === 0) return found;
    const granted = (await Notifications.getPermissionsAsync()).status === "granted";
    if (!granted) return found;

    for (const a of found) {
      const { title, body } = render(a, t, format);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `👥 ${title}`,
          body,
          sound: "default",
          data: { route: "/(premium)/workspaces", category: "workspace", notifKey: `ws-${a.kind}-${a.workspaceId}` },
          ...(Platform.OS === "android" ? { channelId: "personal" } : {}),
        },
        trigger: null,
      }).catch(() => {});
    }
    return found;
  } catch {
    return [];
  }
}
