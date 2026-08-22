import { CATALOGS, DEFAULT_LOCALE, LOCALES, type Locale } from "./ui";

export { LOCALES, DEFAULT_LOCALE };
export type { Locale };

// Extrait le code de langue depuis l'URL courante.
export function getLocaleFromUrl(url: URL): Locale {
  const seg = url.pathname.split("/").filter(Boolean)[0];
  if (seg && (LOCALES.map((l) => l.code) as string[]).includes(seg)) {
    return seg as Locale;
  }
  return DEFAULT_LOCALE;
}

// Fonction t() : récupère une clé dans le catalogue de la langue donnée,
// avec fallback EN puis FR puis la clé brute.
export function useTranslations(locale: Locale) {
  return function t(key: string): string {
    return CATALOGS[locale]?.[key] ?? CATALOGS.en[key] ?? CATALOGS[DEFAULT_LOCALE][key] ?? key;
  };
}

// Génère un chemin localisé. Pour la langue par défaut (fr) on retourne le chemin nu.
export function localizedPath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean === "/" ? "/" : clean;
  return clean === "/" ? `/${locale}/` : `/${locale}${clean}`;
}

export function isRtl(locale: Locale): boolean {
  return LOCALES.find((l) => l.code === locale)?.rtl ?? false;
}
