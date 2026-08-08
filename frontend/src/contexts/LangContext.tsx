// Langue de l'app, partagée par TOUS les écrans.
//
// Avant, la langue vivait dans l'état local de l'écran Budget : les écrans
// Premium (Coach, Espaces, Projets, inscription) n'y avaient pas accès et
// étaient donc écrits en français en dur. Un utilisateur anglophone basculait
// en français dès qu'il entrait dans le Premium, alors que les Réglages
// affichent 8 langues.
//
// La langue est persistée dans le même objet `netbudget:state` que le reste
// des réglages, pour rester compatible avec l'existant.

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
import {
  CATALOGS,
  DEFAULT_LANG,
  type Lang,
  t as translate,
} from "../i18n/translations";

const STATE_KEY = "netbudget:state";

type LangContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  /** Traduit une clé dans la langue courante. */
  t: (key: string) => string;
  /** Traduit puis remplace les {jetons} par leurs valeurs. */
  tp: (key: string, params: Record<string, string | number>) => string;
  loading: boolean;
};

const LangContext = createContext<LangContextValue | null>(null);

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STATE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { lang?: string };
          if (parsed.lang && parsed.lang in CATALOGS) {
            setLangState(parsed.lang as Lang);
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    // Écriture non bloquante : l'UI a déjà basculé. On fusionne dans l'objet
    // d'état existant pour ne pas écraser les autres réglages.
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STATE_KEY);
        const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        await AsyncStorage.setItem(
          STATE_KEY,
          JSON.stringify({ ...parsed, lang: next }),
        );
      } catch {}
    })();
  }, []);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string) => translate(key, lang),
      tp: (key: string, params: Record<string, string | number>) =>
        interpolate(translate(key, lang), params),
      loading,
    }),
    [lang, setLang, loading],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used within <LangProvider>");
  }
  return ctx;
}
