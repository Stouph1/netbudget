// Types du moteur de conseils Premium (Advice Engine).
//
// Design principle : arbre de règles DÉTERMINISTE (pas d'IA runtime).
//  - Chaque conseil est un `AdviceCard` avec un prédicat `appliesWhen`
//    évalué contre un `UserProfile`.
//  - Le moteur retourne la liste des cards qui matchent, triées par
//    priorité (numérique) puis par fréquence d'affichage (rotation).
//
// Contenu 2026 : voir docs/advice-corpus-fr-v1.md pour le sourcing.

// ============================================================================
// User profile (les axes de personnalisation)
// ============================================================================

export type AgeBracket = "under_18" | "18-25" | "26-35" | "36-50" | "51-65" | "66+";

export type FamilyStatus =
  | "single"
  | "couple_no_kids"
  | "couple_with_kids"
  | "single_parent";

export type HousingStatus = "renter" | "owner" | "accessor" | "free_housing";

export type HousingType = "apartment" | "house"; // copropriété vs entretien intégral

export type Occupation =
  | "student"
  | "employee"
  | "self_employed"
  | "civil_servant"
  | "unemployed"
  | "retired";
// accessor = accédant (crédit en cours) · free_housing = hébergé gratuitement

// Cadre de vie — le train de vie littoral ≠ montagne ≠ grande ville.
export type Zone = "big_city" | "province" | "rural" | "coastal" | "mountain";

export type IncomeBracket = "low" | "medium" | "high" | "very_high"; // dérivable si non demandé

export type TaxBracket = "0" | "11" | "30" | "41" | "45"; // TMI FR 2026

export type Country =
  | "FR" | "BE" | "CH" | "LU" | "CA"
  | "DE" | "GB" | "US" | "ES" | "IT" | "PT"
  | "MA" | "DZ" | "TN" | "SN" | "CI" | "CM"
  | "OTHER";

// Tranches d'âge des enfants — les conseils diffèrent radicalement selon l'âge.
export type ChildAgeBracket = "0-6" | "7-11" | "12-15" | "16-18" | "19+";

// Capacité d'épargne mensuelle (dispo après charges fixes).
// À terme, dérivable automatiquement depuis le tab Budget du free tier.
export type SavingsCapacity =
  | "under_100"
  | "100_300"
  | "300_800"
  | "800_2000"
  | "2000_plus";

// Type du workspace actif — injecté automatiquement par l'app (pas demandé
// dans l'onboarding). Permet aux conseils "budget à plusieurs" de matcher
// selon le contexte : un workspace "couple" → conseils compte joint, etc.
export type WorkspaceKindForAdvice =
  | "couple"
  | "family"
  | "coloc"
  | "association"
  | "other";

// Animaux de compagnie — impacte le budget (nourriture, vétérinaire, assurance).
export type PetSpecies = "dog" | "cat" | "small_mammal" | "bird" | "fish" | "reptile";

export type Pet = {
  species: PetSpecies;
  count: number; // nombre d'animaux de cette espèce
};

export type UserProfile = {
  age?: AgeBracket;
  family?: FamilyStatus;
  housing?: HousingStatus;
  housingType?: HousingType;   // si propriétaire/accédant : appartement ou maison
  propertyCount?: number;      // nombre de biens possédés (1, 2, 3 = 3+)
  occupation?: Occupation;     // renseigné à l'inscription (CRM + conseils AE…)
  zone?: Zone;
  income?: IncomeBracket;
  tmi?: TaxBracket;
  country?: Country;
  region?: string; // région française (les aides locales varient) — voir constants/geo.ts
  hasEmergencyFund?: boolean;
  children?: ChildAgeBracket[];      // multi-select des tranches d'âge
  monthlySavingsCapacity?: SavingsCapacity;
  workspaceKind?: WorkspaceKindForAdvice | null; // null/undefined = compte perso
  hasPets?: boolean;
  pets?: Pet[];                      // rempli seulement si hasPets === true
  // Situation de handicap — DROITS, pas des faveurs. Un adulte concerné, un
  // enfant concerné et un aidant n'ont pas du tout les mêmes démarches.
  disabilitySelf?: boolean;          // l'utilisateur est concerné
  disabilityChild?: boolean;         // un enfant du foyer est concerné
  caregiver?: boolean;               // aide un proche (hors enfant du foyer)
};

// ============================================================================
// Helpers de dérivation (utilisés par les prédicats des cards)
// ============================================================================

export function hasChildrenIn(
  brackets: ChildAgeBracket[],
): (p: UserProfile) => boolean {
  return (p) => !!p.children?.some((b) => brackets.includes(b));
}

export function hasAnyKids(p: UserProfile): boolean {
  return !!p.children?.length;
}

// ============================================================================
// Advice card
// ============================================================================

export type AdviceCategory =
  | "emergency"       // → Budget & Épargne
  | "long_term"       // → Investissements
  | "retirement"      // → Investissements
  | "tax"             // → Impôts & Fiscalité
  | "real_estate"     // → Immobilier
  | "housing"         // → Immobilier
  | "kids"            // → Enfants
  | "inheritance"     // → Transmission
  | "insurance"       // → Prévoyance
  | "shared"          // → Budget à plusieurs (couple / famille / coloc)
  | "association"     // → Association (trésorerie, dons, subventions)
  | "pets"            // → Animaux de compagnie
  | "disability";     // → Handicap & autonomie (droits, compensation, aidants)

// Regroupement UI par thème visible pour l'user.
export type AdviceGroup = {
  key: string;
  /** Clé i18n du libellé affiché (`adv.group.<key>`). */
  labelKey: string;
  icon: string;
  categories: AdviceCategory[];
};

export const ADVICE_GROUPS: AdviceGroup[] = [
  {
    key: "shared",
    labelKey: "adv.group.shared",
    icon: "users",
    categories: ["shared"],
  },
  {
    key: "association",
    labelKey: "adv.group.association",
    icon: "award",
    categories: ["association"],
  },
  {
    key: "budget",
    labelKey: "adv.group.budget",
    icon: "shield",
    categories: ["emergency"],
  },
  {
    key: "invest",
    labelKey: "adv.group.invest",
    icon: "trending-up",
    categories: ["long_term", "retirement"],
  },
  {
    key: "tax",
    labelKey: "adv.group.tax",
    icon: "file-text",
    categories: ["tax"],
  },
  {
    key: "housing",
    labelKey: "adv.group.housing",
    icon: "home",
    categories: ["real_estate", "housing"],
  },
  {
    key: "kids",
    labelKey: "adv.group.kids",
    icon: "users",
    categories: ["kids"],
  },
  {
    key: "inheritance",
    labelKey: "adv.group.inheritance",
    icon: "gift",
    categories: ["inheritance"],
  },
  {
    key: "insurance",
    labelKey: "adv.group.insurance",
    icon: "umbrella",
    categories: ["insurance"],
  },
  {
    key: "pets",
    labelKey: "adv.group.pets",
    icon: "heart", // Feather n'a pas d'icône "patte" ; heart reste sobre et clair
    categories: ["pets"],
  },
  {
    key: "disability",
    labelKey: "adv.group.disability",
    icon: "shield",
    categories: ["disability"],
  },
];

export type AdviceAction = {
  // Verbe à l'infinitif : "Ouvrir un PEA", "Comparer 3 courtiers".
  // Peut porter une CLÉ i18n (`adv.…`) ou un texte brut (carte non migrée).
  // Optionnel : une carte migrée déclare plutôt `actionLabelKey` sur la card.
  label?: string;
  link?: string;      // Optionnel : URL de ressource externe (impots.gouv.fr, etc.)
};

// Prédicat : renvoie true si le conseil s'applique au profil donné.
export type AdvicePredicate = (profile: UserProfile) => boolean;

export type AdviceFigure = { label: string; value: string };

// ============================================================================
// INTERNATIONALISATION DU CATALOGUE (préfixe `adv.`)
// ----------------------------------------------------------------------------
// `src/lib/adviceEngine.ts` est un module de DONNÉES : pas de contexte React,
// donc pas de `t`. Les cartes migrées ne portent donc plus de texte affichable
// mais des CLÉS i18n, résolues au rendu par les écrans.
//
// Convention de nommage — une carte d'id `xxx` déclare :
//   titleKey        → "adv.xxx.title"
//   bodyKey         → "adv.xxx.body"
//   actionLabelKey  → "adv.xxx.action"
//   figures[n].label→ "adv.xxx.fig.<n>.label"  (clé posée EN LIGNE)
//   figures[n].value→ montant/pourcentage laissé TEL QUEL (jamais traduit) ;
//                     clé "adv.xxx.fig.<n>.value" seulement s'il contient du texte.
//
// Rétrocompatibilité : `title` / `body` / `action.label` restent acceptés en
// texte brut tant qu'une carte n'est pas migrée — les résolveurs ci-dessous
// affichent la valeur brute dès qu'elle ne commence pas par `adv.`, et
// retombent dessus si la clé manque au catalogue. Aucun écran cassé.
//
// Contenu DYNAMIQUE (dépendant du profil) : garder la forme fonction, qui
// reçoit un second argument `i18n` ({ t, tp }) pour composer depuis des clés.
// ============================================================================

/** Préfixe des clés i18n du catalogue de conseils. */
export const ADVICE_KEY_PREFIX = "adv.";

/** Traducteurs passés aux champs dynamiques (voir `useLang()`). */
export type AdviceI18n = {
  t: (key: string) => string;
  tp: (key: string, params: Record<string, string | number>) => string;
};

/**
 * Affiche un texte de conseil : traduit s'il s'agit d'une clé du catalogue,
 * rendu tel quel s'il s'agit d'un texte (carte non migrée, conseil déjà
 * enregistré en français dans le dépôt), ou repli sur `fallback` si la clé
 * est absente du catalogue — même contrat que `resolveEventLabel()`.
 */
export function resolveAdviceText(
  valueOrKey: string | undefined,
  t: (key: string) => string,
  fallback?: string,
): string {
  if (!valueOrKey) return fallback ?? "";
  if (!valueOrKey.startsWith(ADVICE_KEY_PREFIX)) return valueOrKey;
  const translated = t(valueOrKey);
  // `t()` renvoie la clé quand elle est absente des 8 catalogues.
  return translated === valueOrKey ? fallback ?? valueOrKey : translated;
}

// body / action / figures peuvent être STATIQUES (string / array) ou DYNAMIQUES
// (fonctions qui prennent le profil + les traducteurs et renvoient le contenu).
// Utile pour des conseils dont le contenu dépend du profil (ex: répartition
// budgétaire personnalisée).
export type AdviceCard = {
  id: string;
  category: AdviceCategory;
  // Pays où le conseil est valable. Absent = ["FR"] (catalogue historique).
  // "all" = universel (fonds d'urgence, répartition budgétaire…).
  countries?: Country[] | "all";
  /** Clé i18n du titre (`adv.<id>.title`) — prioritaire sur `title`. */
  titleKey?: string;
  /** Titre FR en dur — cartes pas encore migrées (sert aussi de repli). */
  title?: string;
  /** Clé i18n du corps (`adv.<id>.body`) — prioritaire sur `body`. */
  bodyKey?: string;
  body?: string | ((p: UserProfile, i18n: AdviceI18n) => string);
  /** Clé i18n du libellé d'action (`adv.<id>.action`) — prioritaire. */
  actionLabelKey?: string;
  action: AdviceAction | ((p: UserProfile, i18n: AdviceI18n) => AdviceAction);
  appliesWhen: AdvicePredicate;
  // Mois de pertinence (1-12) — conseils saisonniers (rentrée, chauffage,
  // déclaration…). Absent = toute l'année.
  months?: number[];
  priority: number;
  /**
   * Taux de rémunération annuel du placement conseillé, en pourcentage.
   *
   * Présent uniquement sur les cartes qui recommandent de PLACER de l'argent.
   * L'app s'en sert pour confronter le conseil à l'inflation du pays : un
   * livret à 1,5 % quand les prix montent de 2,7 % fait perdre du pouvoir
   * d'achat, et l'utilisateur doit le voir avant de suivre le conseil.
   *
   * Ce n'est PAS le taux d'un emprunt associé (le prêt d'un PEL, par exemple) :
   * le comparer à l'inflation n'aurait aucun sens pour un emprunteur.
   *
   * Le chiffre est déjà affiché en toutes lettres dans `figures` ; le tenir
   * aussi ici est une duplication, tenue par un test qui échoue si les deux
   * divergent (voir adviceEngine.test.ts).
   */
  nominalRatePct?: number;
  figures?: AdviceFigure[] | ((p: UserProfile, i18n: AdviceI18n) => AdviceFigure[]);
  sources: string[];
  lastVerified: string;
};

// Helpers pour l'UI : résoudre les champs dynamiques ET les clés i18n.
export function resolveTitle(card: AdviceCard, i18n: AdviceI18n): string {
  return resolveAdviceText(card.titleKey ?? card.title, i18n.t, card.title);
}

export function resolveBody(
  card: AdviceCard,
  p: UserProfile,
  i18n: AdviceI18n,
): string {
  const fallback = typeof card.body === "string" ? card.body : undefined;
  if (card.bodyKey) return resolveAdviceText(card.bodyKey, i18n.t, fallback);
  const raw = typeof card.body === "function" ? card.body(p, i18n) : card.body;
  return resolveAdviceText(raw, i18n.t);
}

export function resolveAction(
  card: AdviceCard,
  p: UserProfile,
  i18n: AdviceI18n,
): { label: string; link?: string } {
  const base = typeof card.action === "function" ? card.action(p, i18n) : card.action;
  return {
    label: resolveAdviceText(card.actionLabelKey ?? base.label, i18n.t, base.label),
    link: base.link,
  };
}

export function resolveFigures(
  card: AdviceCard,
  p: UserProfile,
  i18n: AdviceI18n,
): AdviceFigure[] {
  if (!card.figures) return [];
  const list =
    typeof card.figures === "function" ? card.figures(p, i18n) : card.figures;
  // label ET value peuvent porter une clé ; les montants (« 22 950 € ») ne
  // commencent pas par `adv.` et traversent donc intacts.
  return list.map((f) => ({
    label: resolveAdviceText(f.label, i18n.t),
    value: resolveAdviceText(f.value, i18n.t),
  }));
}
