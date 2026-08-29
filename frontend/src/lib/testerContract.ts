// Le contrat de test, tel qu'il est affiché dans l'application.
//
// SOURCE UNIQUE. Le texte vient de docs/testeurs/contrat.json, le même fichier
// que lit le générateur de PDF. Ce n'est pas de la coquetterie : un contrat
// approuvé à l'écran qui diffère du PDF remis au testeur ne vaut rien, et
// personne ne s'en apercevrait avant qu'il y ait un désaccord.
//
// LA VERSION VOYAGE AVEC L'APPROBATION. Elle est enregistrée telle quelle côté
// serveur. Si on édite une phrase, la version change, et les testeurs
// réapprouvent — au lieu de laisser croire qu'ils ont accepté un texte qu'ils
// n'ont jamais lu.

import contract from "../data/testerContract.json";
import type { Tier } from "./entitlements";

export type ContractSection = {
  id: string;
  title: string;
  /** Paragraphes, quand la section en a. */
  body?: string[];
  /** Puces, quand la section en a. */
  bullets?: string[];
};

export const CONTRACT_VERSION: string = contract.version;

/** Nom affichable de la formule, pour remplir le texte. */
const TIER_LABEL: Record<Tier, string> = {
  free: "Gratuit",
  solo: "Solo",
  duo: "Duo",
  family: "Famille",
};

/**
 * Les sections, avec `{formule}` remplacé.
 *
 * On remplit ici plutôt qu'à l'affichage : le texte enregistré comme approuvé
 * doit être celui qu'on peut reconstituer plus tard à l'identique.
 */
export function contractSections(tier: Tier): ContractSection[] {
  const label = TIER_LABEL[tier];
  return (contract.sections as ContractSection[]).map((s) => ({
    ...s,
    body: s.body?.map((p) => p.replaceAll("{formule}", label)),
    bullets: s.bullets?.map((p) => p.replaceAll("{formule}", label)),
  }));
}

export const APPROVAL = contract.approbation;
