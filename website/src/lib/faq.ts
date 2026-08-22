// Identifiants des questions de la FAQ.
//
// Dans un module à part, et pas dans le composant, pour deux raisons :
// la page a besoin de la même liste pour produire le balisage FAQPage, et un
// composant Astro n'est pas un endroit fiable pour exporter des données.
//
// L'ORDRE COMPTE : c'est celui de l'hésitation réelle avant un téléchargement.
// « C'est payant ? » et « faut-il un compte ? » d'abord, parce que ce sont les
// deux questions qui font fermer l'onglet.
export const FAQ_IDS = [
  "free",
  "account",
  "data",
  "offline",
  "countries",
  "bank",
  "shared",
  "advice",
  "android",
  "cancel",
] as const;

export type FaqId = (typeof FAQ_IDS)[number];

/** Sous-ensemble affiché sur l'accueil : une page d'accueil n'est pas une doc. */
export const FAQ_HOME_COUNT = 5;
