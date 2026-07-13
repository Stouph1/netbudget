// useActiveScope — gère le scope actif (compte perso vs workspace partagé).
//
// Persistance en AsyncStorage pour que l'user retrouve son dernier scope au
// prochain launch. Le scope est global (partagé entre S1, futures S2-S4, etc.).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "netbudget:premium:activeWorkspaceId";

export type ActiveScope = {
  workspaceId: string | null; // null = compte perso, uuid = workspace
  loading: boolean;
};

export function useActiveScope() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        setWorkspaceId(v);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const setScope = useCallback(async (id: string | null) => {
    setWorkspaceId(id);
    try {
      if (id) await AsyncStorage.setItem(STORAGE_KEY, id);
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { workspaceId, setScope, loading };
}
