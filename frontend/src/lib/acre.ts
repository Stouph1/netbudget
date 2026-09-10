// ACRE — la règle d'éligibilité, isolée de l'écran pour être testable.
//
// POURQUOI CE FICHIER EST SÉPARÉ DE L'ÉCRAN. L'écran importe des modules natifs
// que la suite de tests ne charge pas. Or c'est la RÈGLE qu'il faut verrouiller
// par un test, pas les boutons : elle recopie une fiche officielle, et une
// édition distraite qui ajouterait ou retirerait une situation changerait ce
// qu'on affirme à quelqu'un sur ses droits.
//
// LA SOURCE. Fiche F11677 de entreprendre.service-public.gouv.fr, « Vérifié le
// 01 juillet 2026 » au moment de l'écriture. Liste des situations, règle des
// trois ans : rien n'est de nous. Si la fiche change, c'est ici qu'on relit.

/** Fiche officielle, seule source. */
export const ACRE_SOURCE = "https://entreprendre.service-public.gouv.fr/vosdroits/F11677";
/** Date « Vérifié le » lue sur la fiche au moment de l'écriture. */
export const ACRE_VERIFIED = "2026-07-01";

/**
 * Situations ouvrant droit à l'ACRE, dans l'ordre de la fiche F11677.
 * Les clés i18n (`acre.cond.<id>`) portent le texte ; ici, l'identité seule.
 */
export const ACRE_CONDITIONS = [
  "are",        // bénéficiaire de l'ARE ou de l'ASP
  "de6mois",    // demandeur d'emploi non indemnisé, inscrit plus de 6 mois sur les 18 derniers
  "rsa",        // bénéficiaire du RSA ou de l'ASS
  "age",        // 18 à 25 ans (29 ans en cas de handicap)
  "moins30",    // moins de 30 ans sans droit à l'ARE (durée d'activité insuffisante)
  "reprise",    // salarié ou licencié d'une entreprise en procédure collective reprenant l'activité
  "cape",       // titulaire d'un contrat CAPE
  "qpv",        // création en quartier prioritaire de la politique de la ville
  "zfrr",       // création en ZFRR ou ZFRR+
  "prepare",    // bénéficiaire de la PreParE
] as const;

export type AcreCondition = (typeof ACRE_CONDITIONS)[number];

export type AcreVerdict = "eligible" | "blocked" | "none";

/**
 * Verdict, sans nuance intermédiaire : au moins une situation cochée ET pas
 * d'ACRE dans les trois dernières années. C'est exactement la règle de la fiche,
 * et on n'y ajoute aucune appréciation — ce n'est pas nous qui accordons.
 */
export function acreVerdict(checked: readonly AcreCondition[], hadAcreRecently: boolean): AcreVerdict {
  if (hadAcreRecently) return "blocked";
  return checked.length > 0 ? "eligible" : "none";
}
