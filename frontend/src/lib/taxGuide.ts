// Guide de la déclaration de revenus — les étapes, chacune avec sa source.
//
// CE QUE CE MODULE EST. Un pas-à-pas instructif, pas un simulateur : on ne
// calcule aucun impôt et on ne dit à personne ce qu'il doit déclarer. On dit
// dans quel ordre s'y prendre, ce qu'il faut vérifier, et où c'est écrit.
//
// CHAQUE ÉTAPE PORTE SA FICHE ET SA DATE DE VÉRIFICATION. C'est la règle du
// projet — aucun chiffre sans source officielle — appliquée à un sujet où les
// montants changent chaque année. Le forfait de 10 %, ses bornes, les
// abattements micro, les taux de réduction des dons : tous lus sur
// service-public aux dates indiquées. Quand une fiche sera rééditée, c'est ici
// qu'on relit, et un test vérifie qu'aucune étape n'a perdu sa source.
//
// LE GUIDE SUIT LE PROFIL. Un indépendant, un salarié, quelqu'un qui donne
// chaque mois, un parent d'enfant en bas âge n'ont pas la même déclaration.
// Les étapes communes restent ; les autres n'apparaissent que si elles
// concernent la personne — et le guide dit pourquoi elles sont là.

export type TaxAudience = "self_employed" | "employee" | "giver" | "young_kids";

export type TaxStep = {
  id: string;
  /** Réservé à un profil. Absent = étape commune à tout le monde. */
  onlyFor?: TaxAudience;
  sourceUrl: string;
  /** « Vérifié le » de la fiche, tel que lu. */
  verified: string;
};

/** Ce que le guide sait de la personne. Tout est optionnel : inconnu = commun. */
export type TaxProfile = {
  occupation?: string;
  /** Réserve une part de ses revenus aux dons (réglage « Dons & cadeaux »). */
  gives?: boolean;
  /** Au moins un enfant de moins de 6 ans dans le foyer. */
  youngKids?: boolean;
};

export const F358 = "https://www.service-public.gouv.fr/particuliers/vosdroits/F358";
export const F1989 = "https://www.service-public.gouv.fr/particuliers/vosdroits/F1989";
export const F23267 = "https://entreprendre.service-public.gouv.fr/vosdroits/F23267";
export const F426 = "https://www.service-public.gouv.fr/particuliers/vosdroits/F426";
export const F8 = "https://www.service-public.gouv.fr/particuliers/vosdroits/F8";

/** Dans l'ordre où l'on s'y prend. Les textes vivent dans `impots.step.<id>.*`. */
export const TAX_STEPS: readonly TaxStep[] = [
  { id: "who", sourceUrl: F358, verified: "2026-06-05" },
  { id: "when", sourceUrl: F358, verified: "2026-06-05" },
  { id: "auto", sourceUrl: F358, verified: "2026-06-05" },
  { id: "check", sourceUrl: F358, verified: "2026-06-05" },
  { id: "fees", onlyFor: "employee", sourceUrl: F1989, verified: "2026-04-15" },
  { id: "micro", onlyFor: "self_employed", sourceUrl: F23267, verified: "2026-05-13" },
  { id: "donations", onlyFor: "giver", sourceUrl: F426, verified: "2026-04-15" },
  { id: "childcare", onlyFor: "young_kids", sourceUrl: F8, verified: "2026-04-15" },
  { id: "fix", sourceUrl: F358, verified: "2026-06-05" },
];

/** Les publics auxquels une personne appartient, d'après son profil. */
export function audiencesOf(p: TaxProfile): TaxAudience[] {
  const out: TaxAudience[] = [];
  if (p.occupation === "self_employed") out.push("self_employed");
  // « employee » couvre les salariés au sens large : salarié, fonctionnaire.
  // Situation inconnue : on montre la ligne du forfait, c'est le cas majoritaire.
  else if (
    p.occupation === "employee" ||
    p.occupation === "civil_servant" ||
    p.occupation === undefined
  )
    out.push("employee");
  if (p.gives) out.push("giver");
  if (p.youngKids) out.push("young_kids");
  return out;
}

/** Étapes visibles pour un profil donné. */
export function stepsFor(profile: TaxProfile | string | undefined): TaxStep[] {
  // Ancienne signature : la seule situation professionnelle.
  const p: TaxProfile =
    typeof profile === "string" || profile === undefined ? { occupation: profile } : profile;
  const audiences = audiencesOf(p);
  return TAX_STEPS.filter((s) => !s.onlyFor || audiences.includes(s.onlyFor));
}
