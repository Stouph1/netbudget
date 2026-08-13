// Types partagés par l'index et les catalogues de `locales/`.
// Ils vivent à part pour que `locales/fr.ts` puisse s'annoter sans importer
// l'index qui l'importe lui-même.

export type Lang =
  | "fr"
  | "en"
  | "es"
  | "pt"
  | "de"
  | "it"
  | "ar"
  | "ja";

export type Catalog = Record<string, string>;
