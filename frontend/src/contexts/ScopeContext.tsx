// Contexte GLOBAL du scope actif (Perso / workspace).
//
// Pourquoi un contexte et pas un simple hook : l'ancienne version de
// useActiveScope gardait un useState LOCAL par composant. Quand le
// ScopeSwitcher changeait le scope, seul SON state bougeait — S1, Conseils
// et le tab Budget gardaient l'ancien scope jusqu'au remount. Avec un
// Provider unique (monté dans _layout.tsx), tous les écrans partagent le
// même état et se re-rendent instantanément au switch.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "netbudget:premium:activeScope";
// Ancienne clé (v1 : juste l'id) — lue en fallback puis migrée.
const LEGACY_KEY = "netbudget:premium:activeWorkspaceId";

export type ScopeKind = "couple" | "family" | "coloc" | "association" | "other";

type StoredScope = {
  id: string | null;
  name: string | null;
  kind: ScopeKind | null;
};

type ScopeContextValue = {
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceKind: ScopeKind | null;
  /** Nom affichable. Pour le scope perso, c'est une CLÉ i18n (voir
   *  scopeLabelIsKey) : le contexte est monté avant celui de la langue et ne
   *  peut donc pas traduire lui-même. */
  scopeLabel: string;
  /** true quand scopeLabel est une clé à passer à t(), pas un nom d'espace. */
  scopeLabelIsKey: boolean;
  setScope: (
    id: string | null,
    name?: string | null,
    kind?: ScopeKind | null,
  ) => Promise<void>;
  loading: boolean;
};

const ScopeContext = createContext<ScopeContextValue | null>(null);

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<StoredScope>({
    id: null,
    name: null,
    kind: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<StoredScope>;
          setScopeState({
            id: parsed.id ?? null,
            name: parsed.name ?? null,
            kind: parsed.kind ?? null,
          });
        } else {
          const legacy = await AsyncStorage.getItem(LEGACY_KEY);
          if (legacy) {
            const migrated: StoredScope = { id: legacy, name: null, kind: null };
            setScopeState(migrated);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
            await AsyncStorage.removeItem(LEGACY_KEY);
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const setScope = useCallback(
    async (id: string | null, name?: string | null, kind?: ScopeKind | null) => {
      const next: StoredScope = {
        id,
        name: id ? (name ?? null) : null,
        kind: id ? (kind ?? null) : null,
      };
      setScopeState(next);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
    },
    [],
  );

  const value = useMemo<ScopeContextValue>(
    () => ({
      workspaceId: scope.id,
      workspaceName: scope.name,
      workspaceKind: scope.kind,
      scopeLabel: scope.id ? (scope.name ?? "ws.deletedSpace") : "ws.personalShort",
      scopeLabelIsKey: !scope.id || !scope.name,
      setScope,
      loading,
    }),
    [scope, setScope, loading],
  );

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useActiveScope(): ScopeContextValue {
  const ctx = useContext(ScopeContext);
  if (!ctx) {
    throw new Error("useActiveScope must be used within <ScopeProvider>");
  }
  return ctx;
}
