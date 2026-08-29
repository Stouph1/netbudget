// Ce que la visite guidée montre, et à qui. Module PUR.
//
// LE PROBLÈME QU'ON RÉSOUT. Un tutoriel qui déroule tout, une fois, à
// l'inscription, est oublié avant d'être utile : on le regarde avant d'avoir
// une raison de s'en servir. Pire, il montre des fonctionnalités auxquelles la
// personne n'a pas droit — donc il vend en se faisant passer pour de l'aide.
//
// LA RÈGLE ICI : chaque étape porte le palier À PARTIR DUQUEL elle a un sens,
// et on ne montre QUE ce qui est nouveau depuis la dernière visite. Quelqu'un
// qui passe de Gratuit à Duo ne revoit pas l'onglet Budget qu'il utilise depuis
// six mois : il voit les deux choses qu'il vient d'acheter.
//
// COURT, TOUJOURS. Trois étapes au premier lancement, une ou deux après une
// montée de formule. Au-delà, la visite est passée sans être lue, et on a
// dépensé le seul moment d'attention qu'on avait.

import type { Tier } from "./entitlements";

const RANK: Record<Tier, number> = { free: 0, solo: 1, duo: 2, family: 3 };

export type TourStep = {
  id: string;
  /** Identifiant de la cible à mettre en lumière, enregistrée par l'écran. */
  target: string;
  /**
   * Onglet à ouvrir avant de montrer l'étape.
   *
   * La visite CHANGE D'ÉCRAN toute seule. C'est ce qui la rend utile : montrer
   * une icône d'onglet en disant « ici tu trouveras tes revenus » n'apprend
   * rien — on n'a rien vu. Ouvrir l'onglet et désigner le vrai bouton
   * « Ajouter un revenu », si.
   */
  tab: string;
  titleKey: string;
  bodyKey: string;
  /** Palier à partir duquel l'étape a un sens. */
  from: Tier;
};

/**
 * Toutes les étapes, dans l'ordre d'apparition.
 *
 * L'ordre suit le PARCOURS, pas l'importance : on part de ce qu'on fait le
 * premier jour (son budget) pour aller vers ce qu'on découvre ensuite.
 */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "income",
    tab: "budget",
    target: "budget:addIncome",
    titleKey: "tour.income.title",
    bodyKey: "tour.income.body",
    from: "free",
  },
  {
    id: "remaining",
    tab: "budget",
    target: "budget:summary",
    titleKey: "tour.remaining.title",
    bodyKey: "tour.remaining.body",
    from: "free",
  },
  {
    id: "goals",
    tab: "premium",
    target: "home:goals",
    titleKey: "tour.goals.title",
    bodyKey: "tour.goals.body",
    from: "free",
  },
  {
    id: "advice",
    tab: "premium",
    target: "home:advice",
    titleKey: "tour.advice.title",
    bodyKey: "tour.advice.body",
    from: "free",
  },
  {
    id: "events",
    tab: "events",
    target: "events:create",
    titleKey: "tour.events.title",
    bodyKey: "tour.events.body",
    from: "solo",
  },
  {
    id: "shared",
    tab: "premium",
    target: "home:spaces",
    titleKey: "tour.shared.title",
    bodyKey: "tour.shared.body",
    from: "duo",
  },
];

/**
 * Étapes à montrer maintenant.
 *
 * `seen` est le palier auquel la visite a déjà été faite, ou null si jamais.
 * On renvoie ce qui est ouvert au palier actuel ET qui ne l'était pas au
 * palier déjà visité.
 */
export function stepsFor(tier: Tier, seen: Tier | null): TourStep[] {
  return TOUR_STEPS.filter((s) => {
    // Pas encore accessible à ce palier : rien à montrer.
    if (RANK[s.from] > RANK[tier]) return false;
    // Déjà couvert par la visite précédente.
    if (seen !== null && RANK[s.from] <= RANK[seen]) return false;
    return true;
  });
}

/**
 * La visite a-t-elle quelque chose à dire ?
 *
 * Sert à ne pas allumer tout le mécanisme — mesure des cibles, voile — pour
 * finalement n'afficher aucune bulle.
 */
export function hasTour(tier: Tier, seen: Tier | null): boolean {
  return stepsFor(tier, seen).length > 0;
}
