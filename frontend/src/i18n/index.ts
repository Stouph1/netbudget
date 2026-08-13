// Catalogues de traductions. Chaque clé est un point d'ancrage stable utilisé via `t(key, lang)`.
// Pour modifier une traduction, ouvre le fichier de la langue correspondante dans `locales/`.

import { ar } from "./locales/ar";
import { de } from "./locales/de";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { it } from "./locales/it";
import { ja } from "./locales/ja";
import { pt } from "./locales/pt";
import type { Catalog, Lang } from "./types";

export type { Catalog, Lang } from "./types";

export const CATALOGS: Record<Lang, Catalog> = { fr, en, es, pt, de, it, ar, ja };

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
];

export const DEFAULT_LANG: Lang = "fr";

export function t(key: string, lang: Lang = DEFAULT_LANG): string {
  return CATALOGS[lang]?.[key] ?? CATALOGS[DEFAULT_LANG][key] ?? key;
}
