// État et logique du convertisseur de devises (onglet Convertisseur).
//
// Tranche autonome : rien d'autre dans l'app ne lit ces états. Le hook reste
// monté en permanence (comme l'était l'état dans app/index.tsx), donc la
// saisie et l'historique survivent aux changements d'onglet.
import { useEffect, useMemo, useState } from "react";
import { CurrencyCode } from "../../src/utils/currency";
import { convert, getRates, RatesPayload } from "../../src/utils/exchangeRates";
import { parseNumber } from "../../src/utils/finance";
import type { ConvHistoryItem, Tab } from "./types";

/**
 * @param tab onglet actif — l'enregistrement auto dans l'historique ne se
 *            déclenche que sur l'onglet Convertisseur.
 */
export function useConverter(tab: Tab) {
  const [convFrom, setConvFrom] = useState<CurrencyCode>("EUR");
  const [convTo, setConvTo] = useState<CurrencyCode>("USD");
  const [convAmount, setConvAmount] = useState<string>("100");
  const [rates, setRates] = useState<RatesPayload | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [convPickerFor, setConvPickerFor] = useState<"from" | "to" | null>(null);

  const [convHistory, setConvHistory] = useState<ConvHistoryItem[]>([]);

  function swapConv() {
    const f = convFrom;
    const tCode = convTo;
    setConvFrom(tCode);
    setConvTo(f);
  }

  function pushHistory(amount: number, result: number) {
    if (amount <= 0 || result <= 0) return;
    setConvHistory((prev) => {
      // Évite les doublons immédiats
      if (
        prev[0] &&
        prev[0].from === convFrom &&
        prev[0].to === convTo &&
        prev[0].amount === amount
      )
        return prev;
      return [
        {
          id: `${Date.now()}`,
          from: convFrom,
          to: convTo,
          amount,
          result,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 15);
    });
  }

  function restoreHistory(h: ConvHistoryItem) {
    setConvFrom(h.from);
    setConvTo(h.to);
    setConvAmount(String(h.amount));
  }

  async function refreshRates(force = false) {
    setRatesLoading(true);
    const r = await getRates(force);
    if (r) setRates(r);
    setRatesLoading(false);
  }

  useEffect(() => {
    refreshRates(false);
  }, []);

  // Enregistre automatiquement dans l'historique 1,5 s après que l'utilisateur ait fini de taper
  useEffect(() => {
    if (tab !== "converter") return;
    const amt = parseNumber(convAmount);
    const res = convert(amt, convFrom, convTo, rates);
    if (amt <= 0 || res <= 0) return;
    const timeoutId = setTimeout(() => pushHistory(amt, res), 1500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convAmount, convFrom, convTo, rates, tab]);

  const convResult = useMemo(
    () => convert(parseNumber(convAmount), convFrom, convTo, rates),
    [convAmount, convFrom, convTo, rates]
  );

  return {
    convFrom,
    setConvFrom,
    convTo,
    setConvTo,
    convAmount,
    setConvAmount,
    rates,
    ratesLoading,
    convPickerFor,
    setConvPickerFor,
    convHistory,
    setConvHistory,
    convResult,
    swapConv,
    restoreHistory,
    refreshRates,
  };
}
