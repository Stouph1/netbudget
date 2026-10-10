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
  currency?: string;
  lang?: string;
  // Dons & cadeaux, pour l'usage SANS compte. Avec un compte, la valeur vit
  // dans le profil et prime sur celle-ci.
  titheEnabled?: boolean;
  tithePercent?: number;
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

// ============================================================================
// Budget local PAR COMPTE
// ============================================================================
//
// Le budget « perso » d'un compte connecté vivait dans le même blob que celui
// du téléphone sans compte. Résultat : on se déconnecte, le budget est encore
// là ; on crée un second compte, il hérite du budget du premier. Chaque
// compte a maintenant son propre emplacement. Le blob du téléphone reste
// celui de l'usage sans compte.
//
// Le PREMIER compte créé sur un téléphone adopte le budget que la personne
// avait saisi avant de s'inscrire — sinon elle verrait tout disparaître à
// l'inscription. Les comptes suivants partent de zéro.

const USER_BUDGET_PREFIX = "netbudget:budget:user:";
const FIRST_OWNER_KEY = "netbudget:budget:firstOwner";

export type LocalBudget = Pick<PersistedState, "incomes" | "rent" | "expenseItems" | "loans">;

const BUDGET_FIELDS: (keyof LocalBudget)[] = ["incomes", "rent", "expenseItems", "loans"];

function pickBudget(state: PersistedState | null): LocalBudget | null {
  if (!state) return null;
  const out: LocalBudget = {};
  for (const f of BUDGET_FIELDS) if (state[f] !== undefined) (out as Record<string, unknown>)[f] = state[f];
  return Object.keys(out).length > 0 ? out : null;
}

/** Ce que doit faire le chargement du budget perso d'un compte. */
export function decideUserBudgetSource(input: {
  hasSlot: boolean;
  firstOwner: string | null;
  userId: string;
}): "slot" | "adopt" | "fresh" {
  if (input.hasSlot) return "slot";
  if (!input.firstOwner || input.firstOwner === input.userId) return "adopt";
  return "fresh";
}

export async function loadUserBudget(userId: string): Promise<LocalBudget | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_BUDGET_PREFIX + userId);
    const firstOwner = await AsyncStorage.getItem(FIRST_OWNER_KEY);
    const decision = decideUserBudgetSource({ hasSlot: raw != null, firstOwner, userId });
    if (decision === "slot") return JSON.parse(raw as string) as LocalBudget;
    if (decision === "fresh") return null;
    // Adoption : le budget saisi sans compte devient celui de ce compte, et
    // le téléphone repart vide (les réglages — devise, langue, ville — restent).
    const device = await loadState();
    const adopted = pickBudget(device);
    await AsyncStorage.setItem(FIRST_OWNER_KEY, userId);
    await AsyncStorage.setItem(USER_BUDGET_PREFIX + userId, JSON.stringify(adopted ?? {}));
    if (device && adopted) {
      const rest = { ...device } as PersistedState;
      for (const f of BUDGET_FIELDS) delete rest[f];
      await saveState(rest);
    }
    return adopted;
  } catch {
    return null;
  }
}

export async function saveUserBudget(userId: string, budget: LocalBudget): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_BUDGET_PREFIX + userId, JSON.stringify(budget));
  } catch {}
}

/**
 * À la suppression du compte : « ton budget local reste sur ce téléphone »
 * est une promesse de la feuille de départ. Le budget du compte redevient
 * celui du téléphone, puis l'emplacement du compte disparaît.
 */
export async function releaseUserBudgetToDevice(userId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(USER_BUDGET_PREFIX + userId);
    if (raw) {
      const budget = JSON.parse(raw) as LocalBudget;
      const device = await loadState();
      await saveState({ ...(device ?? {}), ...budget });
    }
    await AsyncStorage.removeItem(USER_BUDGET_PREFIX + userId);
    const firstOwner = await AsyncStorage.getItem(FIRST_OWNER_KEY);
    if (firstOwner === userId) await AsyncStorage.removeItem(FIRST_OWNER_KEY);
  } catch {}
}
