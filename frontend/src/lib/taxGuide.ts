// Guide de la déclaration de revenus — les étapes, chacune avec sa source.
//
// CE QUE CE MODULE EST. Un pas-à-pas instructif, pas un simulateur : on ne
// calcule aucun impôt et on ne dit à personne ce qu'il doit déclarer. On dit
// dans quel ordre s'y prendre, ce qu'il faut vérifier, et où c'est écrit.
//
// CHAQUE ÉTAPE PORTE SA FICHE ET SA DATE DE VÉRIFICATION. C'est la règle du
// projet — aucun chiffre sans source officielle — appliquée à un sujet où les
// montants changent chaque année. Le forfait de 10 %, ses bornes, les
// abattements micro : tous lus sur service-public aux dates indiquées. Quand
// une fiche sera rééditée, c'est ici qu'on relit, et un test vérifie qu'aucune
// étape n'a perdu sa source.

export type TaxStep = {
  id: string;
  /** Réservé à un profil : « self_employed » pour la ligne micro-entrepreneur. */
  onlyFor?: "self_employed" | "employee";
  sourceUrl: string;
  /** « Vérifié le » de la fiche, tel que lu. */
  verified: string;
};

export const F358 = "https://www.service-public.gouv.fr/particuliers/vosdroits/F358";
export const F1989 = "https://www.service-public.gouv.fr/particuliers/vosdroits/F1989";
export const F23267 = "https://entreprendre.service-public.gouv.fr/vosdroits/F23267";

/** Dans l'ordre où l'on s'y prend. Les textes vivent dans `impots.step.<id>.*`. */
export const TAX_STEPS: readonly TaxStep[] = [
  { id: "who", sourceUrl: F358, verified: "2026-06-05" },
  { id: "when", sourceUrl: F358, verified: "2026-06-05" },
  { id: "auto", sourceUrl: F358, verified: "2026-06-05" },
  { id: "check", sourceUrl: F358, verified: "2026-06-05" },
  { id: "fees", onlyFor: "employee", sourceUrl: F1989, verified: "2026-04-15" },
  { id: "micro", onlyFor: "self_employed", sourceUrl: F23267, verified: "2026-05-13" },
  { id: "fix", sourceUrl: F358, verified: "2026-06-05" },
];

/** Étapes visibles pour une situation professionnelle donnée. */
export function stepsFor(occupation: string | undefined): TaxStep[] {
  return TAX_STEPS.filter((s) => {
    if (!s.onlyFor) return true;
    if (s.onlyFor === "self_employed") return occupation === "self_employed";
    // « employee » couvre les salariés au sens large : salarié, fonctionnaire.
    return occupation === "employee" || occupation === "civil_servant" || occupation === undefined;
  });
}
