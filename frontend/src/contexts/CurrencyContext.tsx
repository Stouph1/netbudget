// Devise de l'app, partagée par TOUS les écrans.
//
// Même problème que la langue : la devise vivait dans l'état local de l'écran
// Budget. Les écrans Premium (Projets, objectifs…) affichaient donc « € » en
// dur, et changer la devise dans les Réglages ne les affectait pas.
//
// Persistée dans le même objet `netbudget:state` que le reste des réglages.

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
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatCurrency,
  type CurrencyCode,
} from "../utils/currency";

const STATE_KEY = "netbudget:state";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (next: CurrencyCode) => void;
  /** Formate un montant dans la devise active. */
  fmt: (value: number) => string;
  loading: boolean;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STATE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { currency?: string };
          if (parsed.currency && CURRENCIES.some((c) => c.code === parsed.currency)) {
            setCurrencyState(parsed.currency as CurrencyCode);
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    // Écriture non bloquante, fusionnée pour ne pas écraser les autres réglages.
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STATE_KEY);
        const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        await AsyncStorage.setItem(
          STATE_KEY,
          JSON.stringify({ ...parsed, currency: next }),
        );
      } catch {}
    })();
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      fmt: (v: number) => formatCurrency(v, currency),
      loading,
    }),
    [currency, setCurrency, loading],
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within <CurrencyProvider>");
  }
  return ctx;
}
