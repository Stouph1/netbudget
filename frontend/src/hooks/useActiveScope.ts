// useActiveScope — gère le scope actif (compte perso vs workspace partagé).
//
// Persistance en AsyncStorage (JSON {id, name}) pour que l'user retrouve son
// dernier scope au prochain launch ET que les écrans puissent afficher le nom
// du scope sans re-fetch. Le scope est global (S1, conseils, futurs S2-S4).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "netbudget:premium:activeScope";
// Ancienne clé (v1 : juste l'id) — lue en fallback puis migrée.
const LEGACY_KEY = "netbudget:premium:activeWorkspaceId";

export type ScopeKind = "couple" | "family" | "coloc" | "other";

type StoredScope = {
  id: string | null;
  name: string | null;
  kind: ScopeKind | null;
};

export function useActiveScope() {
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
          // Migration depuis la v1 (id seul, pas de nom)
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

  return {
    workspaceId: scope.id,
    workspaceName: scope.name,
    workspaceKind: scope.kind,
    // Libellé prêt à afficher dans un badge de scope
    scopeLabel: scope.id ? (scope.name ?? "Workspace") : "Perso",
    setScope,
    loading,
  };
}
