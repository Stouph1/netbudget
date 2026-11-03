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

// Génère un chemin localisé. Pour la langue par défaut (fr) on retourne le
// chemin nu.
//
// SANS slash final : `vercel.json` déclare `trailingSlash: false`, donc chaque
// lien interne écrit `/faq/` provoquait une redirection 308 avant d'arriver sur
// `/faq`. C'est invisible à l'usage, mais ça gaspille du budget d'exploration
// et ça dilue les signaux entre deux adresses pour une seule page.
//
// La racine reste `/` : c'est la seule adresse où le slash est l'adresse.
export function localizedPath(locale: Locale, path: string): string {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  const clean = withSlash.replace(/\/+$/, "");
  if (locale === DEFAULT_LOCALE) return clean === "" ? "/" : clean;
  return `/${locale}${clean}`;
}

export function isRtl(locale: Locale): boolean {
  return LOCALES.find((l) => l.code === locale)?.rtl ?? false;
}

// Les pages dont l'adresse change avec la langue : le français a ses propres
// mots, toutes les autres langues reprennent l'adresse anglaise.
const PAGE_SLUGS = {
  whatsNew: { fr: "/nouveautes", other: "/whats-new" },
  thanks: { fr: "/merci", other: "/thank-you" },
  deletion: { fr: "/supprimer-mon-compte", other: "/delete-account" },
} as const;

export function pagePath(locale: Locale, page: keyof typeof PAGE_SLUGS): string {
  const slugs = PAGE_SLUGS[page];
  return localizedPath(locale, locale === DEFAULT_LOCALE ? slugs.fr : slugs.other);
}

// Captures de l'app : FR et EN ont toute la série, les six autres langues les
// six écrans des fiches des stores. Un écran absent retombe sur l'anglais
// plutôt que de montrer une image cassée.
const FULL_SCREEN_LOCALES: Locale[] = ["fr", "en"];
const LOCALIZED_SCREENS = ["budget", "coach", "depenses", "espaces", "projet", "reperes"];

export function screenPath(locale: Locale, name: string): string {
  const has = FULL_SCREEN_LOCALES.includes(locale) || LOCALIZED_SCREENS.includes(name);
  return `/screens/${has ? locale : "en"}/${name}-720`;
}

// Locale Open Graph (langue_PAYS) de chaque langue du site.
export const OG_LOCALES: Record<Locale, string> = {
  fr: "fr_FR",
  en: "en_GB",
  es: "es_ES",
  pt: "pt_PT",
  de: "de_DE",
  it: "it_IT",
  ar: "ar_AR",
  ja: "ja_JP",
};

// La même page dans une autre langue : retire le préfixe de langue, puis
// traduit l'adresse des pages qui en ont une par langue (/nouveautes ↔
// /whats-new). Sert aux hreflang, au sitemap et au sélecteur de langue.
export function translatePath(path: string, to: Locale): string {
  const clean = path.replace(/\/+$/, "") || "/";
  const seg = clean.split("/").filter(Boolean)[0];
  const isPrefixed = !!seg && seg !== DEFAULT_LOCALE && (LOCALES.map((l) => l.code) as string[]).includes(seg);
  const bare = (isPrefixed ? clean.slice(seg.length + 1) : clean) || "/";
  for (const [page, slugs] of Object.entries(PAGE_SLUGS)) {
    if (bare === slugs.fr || bare === slugs.other) {
      return pagePath(to, page as keyof typeof PAGE_SLUGS);
    }
  }
  return localizedPath(to, bare);
}
