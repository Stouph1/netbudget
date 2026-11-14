// Langue et devise du téléphone, au premier lancement.
//
// POURQUOI. L'app démarrait en français et en euros pour tout le monde. Les
// campagnes espagnole, portugaise et anglaise amenaient des gens sur une app
// dans une langue qu'ils ne lisent pas : ils repartaient sans rien saisir.
// Huit langues existent ; encore faut-il ouvrir la bonne.
//
// On ne lit le téléphone QUE si la personne n'a rien choisi : un choix fait
// dans les réglages l'emporte toujours.

import { CATALOGS, type Lang } from "./index";
import { CURRENCIES, type CurrencyCode } from "../utils/currency";

type DeviceLocale = { languageCode?: string | null; currencyCode?: string | null };

function firstLocale(): DeviceLocale | null {
  try {
    // require : absent dans les tests et sur une version native sans le module.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const loc = require("expo-localization") as { getLocales?: () => DeviceLocale[] };
    return loc.getLocales?.()[0] ?? null;
  } catch {
    return null;
  }
}

/** Langue du téléphone si l'app la parle, sinon null. */
export function deviceLang(): Lang | null {
  const code = firstLocale()?.languageCode?.toLowerCase();
  return code && code in CATALOGS ? (code as Lang) : null;
}

/** Devise de la région du téléphone si l'app la gère, sinon null. */
export function deviceCurrency(): CurrencyCode | null {
  const code = firstLocale()?.currencyCode?.toUpperCase();
  return code && CURRENCIES.some((c) => c.code === code) ? (code as CurrencyCode) : null;
}
