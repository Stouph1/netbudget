// Contexte de la couleur d'accent, par espace.
//
// Il vit SOUS le ScopeProvider : l'accent affiché est celui de l'espace actif,
// et changer d'espace change la couleur sans autre geste. Voir
// src/theme/accents.ts pour les règles ; ici, seulement le stockage et la
// diffusion.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  accentById,
  parseAccentMap,
  resolveAccent,
  scopeKey,
  type Accent,
  type AccentId,
  type AccentMap,
} from "../theme/accents";
import { useActiveScope } from "./ScopeContext";

const STORAGE_KEY = "netbudget:theme:v1";

type ThemeContextValue = {
  /** Accent de l'espace actif. */
  accent: Accent;
  accentId: AccentId;
  /** Choisit l'accent de l'espace actif. */
  setAccent: (id: AccentId) => Promise<void>;
  /** Accent d'un espace donné — pour le montrer dans une liste d'espaces. */
  accentFor: (workspaceId: string | null) => Accent;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { workspaceId } = useActiveScope();
  const [map, setMap] = useState<AccentMap>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setMap(parseAccentMap(raw)))
      .catch(() => {});
  }, []);

  const setAccent = useCallback(
    async (id: AccentId) => {
      const next = { ...map, [scopeKey(workspaceId)]: id };
      setMap(next);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
    },
    [map, workspaceId],
  );

  const value = useMemo<ThemeContextValue>(() => {
    const accent = resolveAccent(map, workspaceId);
    return {
      accent,
      accentId: accent.id,
      setAccent,
      accentFor: (id: string | null) => resolveAccent(map, id),
    };
  }, [map, workspaceId, setAccent]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * L'accent courant. Hors provider (tests, aperçus), on rend la menthe : un
 * composant ne doit jamais planter pour une couleur.
 */
export function useAccent(): Accent {
  return useContext(ThemeContext)?.accent ?? accentById(undefined);
}

/** Accent d'un espace, menthe hors provider. */
export function useAccentFor(): (workspaceId: string | null) => Accent {
  const ctx = useContext(ThemeContext);
  return ctx ? ctx.accentFor : () => accentById(undefined);
}

export function useThemeSettings(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeSettings must be used within <ThemeProvider>");
  return ctx;
}
