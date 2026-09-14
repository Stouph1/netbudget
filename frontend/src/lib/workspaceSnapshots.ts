// Instantanés des espaces partagés, gardés sur l'appareil.
//
// Séparé de la détection (workspaceActivityNotify) pour que premiumStore puisse
// mettre l'instantané à jour après MES écritures sans importer le module qui
// l'importe lui-même.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkspaceSnapshot } from "./workspaceActivity";

const SNAPSHOTS_KEY = "netbudget:workspaces:snapshots";
export type SnapshotMap = Record<string, WorkspaceSnapshot>;

export async function readSnapshots(): Promise<SnapshotMap> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOTS_KEY);
    return raw ? (JSON.parse(raw) as SnapshotMap) : {};
  } catch {
    return {};
  }
}

export async function writeSnapshots(map: SnapshotMap): Promise<void> {
  try {
    await AsyncStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Après MA propre écriture dans un espace : l'instantané suit, pour que le
 * prochain contrôle ne me raconte pas ce que je viens de faire.
 */
export async function noteOwnWorkspaceWrite(
  workspaceId: string,
  part: Partial<Pick<WorkspaceSnapshot, "budgetTotal" | "goalsCount">>,
): Promise<void> {
  const map = await readSnapshots();
  const cur = map[workspaceId];
  if (!cur) return; // pas encore observé : le premier contrôle posera la base
  map[workspaceId] = { ...cur, ...part };
  await writeSnapshots(map);
}
