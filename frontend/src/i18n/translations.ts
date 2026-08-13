// Ce module ne contient plus que des ré-exports.
//
// Les 8 catalogues (2 539 clés chacun) vivaient ici, dans un seul fichier de
// 20 000 lignes. Ils sont désormais un fichier par langue dans `locales/`, et
// l'API publique (Lang, Catalog, CATALOGS, LANGUAGES, DEFAULT_LANG, t) est
// assemblée par `index.ts`.
//
// Ce fichier reste comme point d'entrée historique : plusieurs écrans importent
// encore `"../i18n/translations"`, et le chemin est stable depuis la v1.0.
// Les nouveaux imports devraient viser `"../i18n"` directement.

export * from "./index";
