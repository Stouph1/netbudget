// Catalogue des formules : ce que chacune donne, et sous quel identifiant elle
// est vendue.
//
// AUCUN PRIX ICI, et c'est une décision, pas un oubli. Les prix affichés doivent
// venir de l'App Store ou du Play Store, jamais du code :
//
//   - ils sont localisés (devise, format, virgule ou point) par la boutique ;
//   - ils diffèrent par pays, taxes comprises, sans qu'on ait à le savoir ;
//   - une hausse de tarif décidée dans la console ne doit pas exiger une mise
//     à jour de l'app, sinon les anciennes versions mentent au client.
//
// Un prix codé en dur finit toujours par différer de ce qui est débité. C'est
// un litige garanti, et c'est aussi un motif de refus en revue App Store.
//
// LES CAPACITÉS, elles, ne sont pas décrites ici non plus : elles viennent de
// `entitlements.ts`, qui est déjà la source unique des limites. Recopier
// « 1 événement » dans un écran de vente, c'est se garantir qu'un jour la vente
// promettra autre chose que le produit.

import { limitsFor, type Tier } from "../entitlements";

/** Périodicité proposée. */
export type Period = "monthly" | "yearly";

/**
 * Identifiants des produits, tels qu'ils devront être créés dans App Store
 * Connect et la Play Console. Le format `tier.period` reste lisible dans les
 * rapports de vente, ce qui n'est pas le cas d'un identifiant opaque.
 */
export const PRODUCT_IDS: Record<Exclude<Tier, "free">, Record<Period, string>> = {
  solo: { monthly: "netbudget.solo.monthly", yearly: "netbudget.solo.yearly" },
  duo: { monthly: "netbudget.duo.monthly", yearly: "netbudget.duo.yearly" },
  family: { monthly: "netbudget.family.monthly", yearly: "netbudget.family.yearly" },
};

/** Formules vendues, dans l'ordre d'affichage. */
export const SELLABLE_TIERS: Exclude<Tier, "free">[] = ["solo", "duo", "family"];

/**
 * Points forts d'une formule, sous forme de clés i18n.
 *
 * Dérivés des limites réelles : une formule sans espace partagé ne peut pas
 * l'annoncer, et le nombre d'événements vient du même endroit que le contrôle
 * qui l'applique.
 */
export function planFeatureKeys(tier: Exclude<Tier, "free">): string[] {
  const limits = limitsFor(tier);
  const keys: string[] = ["plan.feature.sync", "plan.feature.advice"];

  if (limits.maxEvents === null) keys.push("plan.feature.eventsUnlimited");
  else if (limits.maxEvents === 1) keys.push("plan.feature.eventsOne");

  if (limits.blockedEventTypes.includes("wedding")) {
    keys.push("plan.feature.noWedding");
  } else {
    keys.push("plan.feature.wedding");
  }

  if (limits.maxWorkspaces > 0) keys.push("plan.feature.shared");

  return keys;
}

/**
 * Nombre de membres annoncé, ou null quand la notion ne s'applique pas.
 * Sert au libellé « jusqu'à N personnes ».
 */
export function planMembers(tier: Exclude<Tier, "free">): number | null {
  const max = limitsFor(tier).maxMembersPerWorkspace;
  return max > 0 ? max : null;
}

/** La formule la plus mise en avant. Une seule, sinon aucune ne ressort. */
export const HIGHLIGHTED_TIER: Exclude<Tier, "free"> = "duo";

/** Retrouve la formule correspondant à un identifiant de produit. */
export function tierFromProductId(productId: string): Exclude<Tier, "free"> | null {
  for (const tier of SELLABLE_TIERS) {
    for (const period of ["monthly", "yearly"] as Period[]) {
      if (PRODUCT_IDS[tier][period] === productId) return tier;
    }
  }
  return null;
}

/** Période correspondant à un identifiant de produit. */
export function periodFromProductId(productId: string): Period | null {
  for (const tier of SELLABLE_TIERS) {
    if (PRODUCT_IDS[tier].monthly === productId) return "monthly";
    if (PRODUCT_IDS[tier].yearly === productId) return "yearly";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Économie de la formule annuelle
//
// CALCULÉE, jamais écrite en dur. Trois raisons :
//
// 1. Les boutiques appliquent des grilles régionales : un « −33 % » figé dans
//    le code serait faux dans la moitié des pays.
// 2. Une remise annoncée doit correspondre à ce qui est réellement débité.
//    Afficher un avantage inventé est une pratique commerciale trompeuse, et
//    l'Europe la sanctionne — un prix de référence doit avoir été pratiqué.
// 3. Il n'y a rien à inventer : l'économie est déjà substantielle. La montrer
//    telle qu'elle est convainc mieux qu'un artifice, et ne se retourne pas
//    contre toi quand un client fait le calcul.
// ---------------------------------------------------------------------------

export type Saving = {
  /** Montant économisé sur douze mois, dans la devise de la boutique. */
  amount: number;
  /** Pourcentage arrondi, pour un badge court. */
  percent: number;
  currency: string;
};

/**
 * Économie réelle de l'annuel face à douze mensualités.
 *
 * Renvoie null quand il n'y a PAS d'économie — annuel plus cher, devises
 * différentes, ou prix manquant. Dans ce cas l'interface n'affiche rien plutôt
 * que « 0 % » ou, pire, un chiffre négatif présenté comme un avantage.
 */
export function annualSaving(
  monthly: { priceAmount: number; currency: string } | undefined,
  yearly: { priceAmount: number; currency: string } | undefined,
): Saving | null {
  if (!monthly || !yearly) return null;
  // Comparer deux devises différentes n'a aucun sens : cela arrive quand la
  // boutique n'a pas fini de répondre pour l'une des deux offres.
  if (monthly.currency !== yearly.currency) return null;
  if (!(monthly.priceAmount > 0) || !(yearly.priceAmount > 0)) return null;

  const twelveMonths = monthly.priceAmount * 12;
  const amount = twelveMonths - yearly.priceAmount;
  if (amount <= 0) return null;

  return {
    amount,
    percent: Math.round((amount / twelveMonths) * 100),
    currency: monthly.currency,
  };
}

/**
 * Équivalent mensuel d'un abonnement annuel.
 *
 * C'est le chiffre qui parle le plus : « 3,33 € par mois » se compare
 * directement au tarif mensuel affiché juste au-dessus.
 */
export function monthlyEquivalent(yearlyAmount: number): number {
  return yearlyAmount / 12;
}
