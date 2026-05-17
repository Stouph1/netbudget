// Persistance locale via AsyncStorage.
// Schéma versionné — incrémente STORAGE_VERSION quand le modèle change,
// puis ajoute une étape de migration dans `migrate`.

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "netbudget:state";
const STORAGE_VERSION = 2;

export type PersistedState = {
  version: number;
  // Revenus (modèle v2 multi-sources)
  incomes?: unknown[]; // typé côté index.tsx, on stocke "tel quel"
  // Champs v1 conservés pour migration douce
  salaryMode?: "annual" | "monthly";
  baseAnnual?: string;
  variableAnnual?: string;
  proStatus?: string;
  timeMode?: "plein" | "partiel";
  chargesPercent?: string;
  variableMonth?: "monthly" | number;
  // Logement / prêts / dépenses
  rent?: string;
  expenseItems?: unknown[];
  loans?: unknown[];
  cityId?: string;
};

export async function loadState(): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export async function saveState(state: Omit<PersistedState, "version">): Promise<void> {
  try {
    const payload: PersistedState = { ...state, version: STORAGE_VERSION };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // silencieux — pas de blocage UX en cas d'erreur disque
  }
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // idem
  }
}

// Migration entre versions du schéma.
function migrate(state: PersistedState): PersistedState {
  if (!state.version || state.version < STORAGE_VERSION) {
    // Pas de migration spécifique nécessaire pour le moment :
    // les champs v1 (salaryMode, baseAnnual...) sont relus tels quels
    // et convertis en `incomes[]` au chargement par index.tsx.
    return { ...state, version: STORAGE_VERSION };
  }
  return state;
}
