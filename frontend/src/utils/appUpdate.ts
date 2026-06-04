// Vérifie si une nouvelle version de l'app est disponible sur l'App Store
// (et Google Play une fois publié). Renvoie la version du store et signale si
// elle est supérieure à la version installée.
//
// API publique iTunes Lookup : https://itunes.apple.com/lookup?id=<appId>
// Pas de clé. Cache local 24 h pour éviter de tape le réseau au démarrage.

import AsyncStorage from "@react-native-async-storage/async-storage";

const APP_STORE_ID = "6763551701";
const CACHE_KEY = "netbudget:storeVersion";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const DISMISSED_KEY = "netbudget:updateDismissedVersion";

export interface UpdateInfo {
  storeVersion: string;
  installedVersion: string;
  hasUpdate: boolean;
  appStoreUrl: string;
}

interface ItunesLookupResponse {
  resultCount: number;
  results: { version?: string; trackViewUrl?: string }[];
}

// "1.6.0" → [1, 6, 0]
function parseVersion(v: string): number[] {
  return v
    .replace(/[^\d.]/g, "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
}

// Renvoie 1 si a > b, -1 si a < b, 0 si égal. Compare numériquement champ par champ.
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

async function fetchStoreVersion(): Promise<{ version: string; url: string } | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const { ts, version, url } = JSON.parse(cached) as { ts: number; version: string; url: string };
      if (Date.now() - ts < CACHE_TTL_MS) return { version, url };
    }
  } catch {}
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${APP_STORE_ID}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ItunesLookupResponse;
    const first = data.results?.[0];
    if (!first?.version) return null;
    const out = {
      version: first.version,
      url: first.trackViewUrl ?? `https://apps.apple.com/app/id${APP_STORE_ID}`,
    };
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), ...out }));
    } catch {}
    return out;
  } catch {
    return null;
  }
}

// Vérifie la dispo d'une mise à jour. Renvoie null s'il n'y en a pas
// (ou si la version du store a déjà été ignorée par l'utilisateur).
export async function checkForUpdate(installedVersion: string): Promise<UpdateInfo | null> {
  const store = await fetchStoreVersion();
  if (!store) return null;
  if (compareVersions(store.version, installedVersion) <= 0) return null;
  try {
    const dismissed = await AsyncStorage.getItem(DISMISSED_KEY);
    if (dismissed === store.version) return null;
  } catch {}
  return {
    storeVersion: store.version,
    installedVersion,
    hasUpdate: true,
    appStoreUrl: store.url,
  };
}

// L'utilisateur a cliqué « plus tard » : on ne le rebombardera pas pour cette
// version-là. Mais si une 1.8 sort plus tard, on lui montrera à nouveau.
export async function dismissUpdate(storeVersion: string): Promise<void> {
  try {
    await AsyncStorage.setItem(DISMISSED_KEY, storeVersion);
  } catch {}
}
