// Implémentation réelle de la facturation, par RevenueCat.
//
// CE QUI EST VRAI ET CE QUI NE L'EST PAS. Ce fichier sait afficher des prix et
// déclencher un achat. Il ne décide RIEN sur ce que l'utilisateur a le droit de
// faire : ça, c'est `my_tier()` côté serveur, écrit par le webhook après
// vérification du reçu. Le client peut mentir, le serveur non — voir tier.ts.
//
// L'IDENTIFIANT UTILISATEUR EST LE POINT CRITIQUE. On configure RevenueCat avec
// l'`id` Supabase comme `appUserID`. Sans ça, RevenueCat crée un identifiant
// anonyme par appareil : le webhook reçoit un achat qu'il ne sait rattacher à
// aucun compte, et le client paie sans rien débloquer. C'est la panne la plus
// coûteuse possible, et elle est silencieuse.
//
// TROIS ENVIRONNEMENTS OÙ ON NE VEND PAS, volontairement :
//   - le web : la boutique n'existe pas ;
//   - Expo Go : le module natif est absent ;
//   - sans clé d'API : rien n'est configuré.
// Dans ces trois cas `isAvailable()` renvoie false et l'écran des formules
// montre ce que contient l'abonnement, sans bouton d'achat. Un bouton qui
// échoue coûte plus cher que pas de bouton.

import { NativeModules, Platform } from "react-native";
import type { Tier } from "../entitlements";
import {
  PLAY_BASE_PLANS,
  PLAY_SUBSCRIPTION_IDS,
  PRODUCT_IDS,
  type Period,
} from "./plans";
import { loadPurchases, type PurchasesModule } from "./purchases";
// Import de TYPE uniquement : effacé à la compilation, donc rien n'entre dans
// le bundle web où le SDK natif n'existe pas.
import type { StoreProductChangeInfo } from "react-native-purchases";
import type { BillingProvider, Offering, PurchaseResult } from "./provider";

/**
 * Identifiants des droits, tels qu'ils doivent être créés dans RevenueCat
 * (Entitlements). Un droit par formule : c'est ce que le SDK renvoie, et c'est
 * plus stable qu'une liste de produits — changer un produit de prix ou de
 * durée ne change pas le droit qu'il ouvre.
 */
const ENTITLEMENTS: Record<Exclude<Tier, "free">, string> = {
  solo: "solo",
  duo: "duo",
  family: "family",
};

/** Du plus petit au plus grand : sert à trancher si plusieurs droits sont actifs. */
const RANK: Record<Tier, number> = { free: 0, solo: 1, duo: 2, family: 3 };

/**
 * Clé publique du SDK, par plateforme.
 *
 * Publique au sens de RevenueCat : elle est faite pour vivre dans l'app. Elle
 * ne permet pas d'accorder un droit — seulement d'en demander l'état. La clé
 * secrète, elle, ne quitte jamais le serveur.
 */
function apiKey(): string | null {
  const key =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
        : undefined;
  return key && key.length > 0 ? key : null;
}

/**
 * Le module natif est-il là ?
 *
 * On lit `NativeModules` sans passer par `getEnforcing` : la version qui lève
 * une exception le fait à travers le pont natif, où le JS ne peut pas la
 * rattraper. C'est exactement l'écran rouge qu'on a eu sur Google Sign-In.
 */
function hasNativeModule(): boolean {
  return Platform.OS !== "web" && Boolean(NativeModules.RNPurchases);
}

/**
 * Durée de l'essai gratuit d'un produit, en jours. `null` s'il n'y en a pas.
 *
 * On n'accepte que les offres à prix ZÉRO : `introPrice` porte aussi les
 * tarifs de lancement payants — « 1 € le premier mois » — qui ne sont pas des
 * essais. Les annoncer comme tels ferait croire à la gratuité.
 */
function trialDaysOf(
  intro: { price: number; periodUnit: string; periodNumberOfUnits: number } | null | undefined,
): number | null {
  if (!intro || intro.price !== 0) return null;
  const n = intro.periodNumberOfUnits;
  switch (intro.periodUnit?.toUpperCase()) {
    case "DAY":
      return n;
    case "WEEK":
      return n * 7;
    case "MONTH":
      return n * 30;
    case "YEAR":
      return n * 365;
    default:
      return null;
  }
}

const TIERS = Object.keys(PRODUCT_IDS) as Exclude<Tier, "free">[];
const PERIODS: Period[] = ["monthly", "yearly"];

/**
 * Retrouve formule et périodicité depuis l'identifiant que renvoie la boutique.
 *
 * DEUX FORMES, parce que les deux boutiques ne nomment pas pareil :
 *   Apple  : « netbudget.solo.monthly »  — un produit par formule et durée
 *   Google : « netbudget.solo:monthly »  — abonnement, puis base plan
 *
 * On accepte les deux ici plutôt que d'aiguiller sur `Platform.OS` : le jour
 * où un identifiant arrive de l'autre boutique — restauration croisée, compte
 * migré, test sur simulateur — il est reconnu au lieu d'être jeté.
 */
function describeProduct(
  productId: string,
): { tier: Exclude<Tier, "free">; period: Period } | null {
  // Forme Google. Un base plan assorti d'une offre s'écrit « base:offre » :
  // on ne garde que le premier segment, l'offre ne change pas la durée.
  const colon = productId.indexOf(":");
  if (colon > 0) {
    const subId = productId.slice(0, colon);
    const basePlan = productId.slice(colon + 1).split(":")[0];
    const tier = TIERS.find((x) => PLAY_SUBSCRIPTION_IDS[x] === subId);
    const period = PERIODS.find((x) => PLAY_BASE_PLANS[x] === basePlan);
    return tier && period ? { tier, period } : null;
  }

  // Forme Apple.
  for (const tier of TIERS) {
    for (const period of PERIODS) {
      if (PRODUCT_IDS[tier][period] === productId) return { tier, period };
    }
  }
  return null;
}

/**
 * Identifiants à demander à la boutique.
 *
 * Chez Google on interroge les TROIS abonnements : la boutique renvoie ensuite
 * un produit par base plan. Demander « netbudget.solo.monthly » n'y renverrait
 * rien, cet identifiant n'existe pas côté Play.
 */
function storeProductIds(): string[] {
  if (Platform.OS === "android") return Object.values(PLAY_SUBSCRIPTION_IDS);
  return Object.values(PRODUCT_IDS).flatMap((byPeriod) => Object.values(byPeriod));
}

/**
 * Identifiant canonique interne : celui d'Apple, quelle que soit la boutique.
 *
 * Le reste de l'app n'en connaît qu'un seul jeu. Sans ça, l'écran des formules
 * devrait porter un `Platform.OS` — et la première divergence entre les deux
 * boutiques passerait inaperçue jusqu'à la production Android.
 */
function canonicalId(tier: Exclude<Tier, "free">, period: Period): string {
  return PRODUCT_IDS[tier][period];
}

/** Le plus haut droit actif. « free » si aucun. */
function tierFromCustomerInfo(info: unknown): Tier {
  const active = (info as { entitlements?: { active?: Record<string, unknown> } })
    ?.entitlements?.active;
  if (!active) return "free";

  let best: Tier = "free";
  for (const [tier, id] of Object.entries(ENTITLEMENTS) as [
    Exclude<Tier, "free">,
    string,
  ][]) {
    if (active[id] && RANK[tier] > RANK[best]) best = tier;
  }
  return best;
}

/**
 * Ordre combiné formule + durée, pour trancher montée ou descente en gamme.
 *
 * La formule prime, la durée départage : à formule égale, passer au mensuel
 * est un recul, passer à l'annuel un engagement plus large.
 */
function offerRank(tier: Exclude<Tier, "free">, period: Period): number {
  return RANK[tier] * 2 + (period === "yearly" ? 1 : 0);
}

/**
 * Abonnement à REMPLACER, sur Google uniquement.
 *
 * POURQUOI CE N'EST PAS OPTIONNEL. Chez Apple, les six produits vivent dans un
 * même groupe : la boutique sait qu'un achat en remplace un autre, et le fait
 * toute seule. Chez Google, `netbudget.solo` et `netbudget.duo` sont deux
 * produits SANS aucun lien. Sans cette information, un abonné Solo qui prend
 * Duo ne change pas de formule : il se retrouve avec DEUX abonnements actifs,
 * et il paie les deux. Personne ne s'en aperçoit avant le relevé bancaire.
 *
 * LE MODE DE REMPLACEMENT REPRODUIT LE COMPORTEMENT D'APPLE, pour que les deux
 * plateformes racontent la même chose à l'utilisateur — et que le texte affiché
 * après l'achat reste vrai :
 *   montée en gamme -> immédiate, le temps restant est crédité ;
 *   descente        -> différée à la fin de la période déjà payée.
 */
async function androidChangeInfo(
  Purchases: PurchasesModule,
  target: { tier: Exclude<Tier, "free">; period: Period },
): Promise<StoreProductChangeInfo | null> {
  if (Platform.OS !== "android") return null;

  let active: string[] = [];
  try {
    active = (await Purchases.getCustomerInfo()).activeSubscriptions ?? [];
  } catch {
    // Sans information fiable, ne rien déclarer vaut mieux que déclarer faux :
    // un `oldProductIdentifier` erroné fait échouer l'achat entier.
    return null;
  }

  for (const id of active) {
    const current = describeProduct(id);
    if (!current) continue;
    // Déjà exactement ce produit : il n'y a rien à remplacer.
    if (current.tier === target.tier && current.period === target.period) return null;

    return {
      oldProductIdentifier: id,
      replacementMode:
        offerRank(target.tier, target.period) > offerRank(current.tier, current.period)
          ? ("WITH_TIME_PRORATION" as StoreProductChangeInfo["replacementMode"])
          : ("DEFERRED" as StoreProductChangeInfo["replacementMode"]),
    };
  }
  return null;
}

/**
 * Traduit une erreur du SDK en une raison utilisable par l'interface.
 *
 * L'annulation N'EST PAS une erreur : c'est un choix. L'afficher comme un échec
 * donne l'impression que quelque chose a cassé alors que l'utilisateur a
 * simplement dit non.
 */
function reasonFromError(e: unknown): PurchaseResult {
  const err = e as { userCancelled?: boolean; code?: string; message?: string };
  if (err?.userCancelled) return { ok: false, reason: "cancelled" };
  if (err?.code === "ProductAlreadyPurchasedError") {
    return { ok: false, reason: "alreadyOwned" };
  }
  return { ok: false, reason: "error", message: err?.message };
}

/** Chargé une seule fois, et seulement quand le natif est là. */
let Purchases: PurchasesModule | null = null;
let configuredFor: string | null = null;

/**
 * Prépare le SDK pour un utilisateur donné.
 *
 * À rappeler à CHAQUE changement de compte : `logIn` réattribue les achats au
 * bon identifiant. Sans ça, deux comptes sur un même téléphone se partageraient
 * un abonnement.
 */
export async function setUpRevenueCat(userId: string | null): Promise<boolean> {
  const key = apiKey();
  if (!key || !hasNativeModule()) return false;

  try {
    if (!Purchases) {
      // Sur web, `loadPurchases` renvoie null : le SDK n'est pas dans le
      // bundle du tout. Voir purchases.ts.
      Purchases = loadPurchases();
    }
    if (!Purchases) return false;

    if (configuredFor === null) {
      Purchases.configure({ apiKey: key, appUserID: userId ?? undefined });
      configuredFor = userId ?? "";
    } else if (configuredFor !== (userId ?? "")) {
      if (userId) await Purchases.logIn(userId);
      else await Purchases.logOut();
      configuredFor = userId ?? "";
    }
    return true;
  } catch {
    // Une facturation indisponible ne doit jamais empêcher l'app de démarrer.
    Purchases = null;
    configuredFor = null;
    return false;
  }
}

export const revenueCatBilling: BillingProvider = {
  isAvailable(): boolean {
    return Boolean(apiKey()) && hasNativeModule() && configuredFor !== null;
  },

  async listOfferings(): Promise<Offering[]> {
    if (!Purchases) return [];
    try {
      const products = await Purchases.getProducts(storeProductIds());
      const out: Offering[] = [];
      for (const p of products) {
        const what = describeProduct(p.identifier);
        // Un produit que la boutique renvoie mais que le code ne connaît pas
        // est ignoré : mieux vaut une offre manquante qu'une offre qu'on ne
        // sait pas honorer.
        if (!what) continue;
        out.push({
          productId: canonicalId(what.tier, what.period),
          tier: what.tier,
          period: what.period,
          priceLabel: p.priceString,
          priceAmount: p.price,
          currency: p.currencyCode,
          trialDays: trialDaysOf(p.introPrice),
        });
      }
      return out;
    } catch {
      return [];
    }
  },

  async purchase(productId: string): Promise<PurchaseResult> {
    if (!Purchases) return { ok: false, reason: "unavailable" };
    const what = describeProduct(productId);
    if (!what) return { ok: false, reason: "unavailable" };

    try {
      // On redemande le catalogue plutôt que d'interroger `productId` tel quel :
      // sur Google, cet identifiant n'existe pas côté boutique.
      const products = await Purchases.getProducts(storeProductIds());
      const product = products.find((p) => {
        const d = describeProduct(p.identifier);
        return d && d.tier === what.tier && d.period === what.period;
      });
      if (!product) return { ok: false, reason: "unavailable" };

      // Sur Google, dire QUEL abonnement est remplacé. Sans ça, l'ancien reste
      // actif à côté du nouveau et le client paie deux fois.
      const change = await androidChangeInfo(Purchases, what);
      const result = await Purchases.purchaseStoreProduct(product, change);
      const granted = tierFromCustomerInfo(result.customerInfo);

      // La boutique a encaissé mais le droit n'est pas encore visible : ça
      // arrive le temps que RevenueCat traite le reçu. On rend quand même la
      // main en succès — le serveur tranchera au prochain `loadTier()`, et
      // c'est lui qui fait autorité.
      return { ok: true, tier: granted === "free" ? what.tier : (granted as Exclude<Tier, "free">) };
    } catch (e) {
      return reasonFromError(e);
    }
  },

  async restore(): Promise<{ ok: boolean; tier: Tier }> {
    if (!Purchases) return { ok: false, tier: "free" };
    try {
      const info = await Purchases.restorePurchases();
      return { ok: true, tier: tierFromCustomerInfo(info) };
    } catch {
      return { ok: false, tier: "free" };
    }
  },

  async activeTier(): Promise<Tier> {
    if (!Purchases) return "free";
    try {
      return tierFromCustomerInfo(await Purchases.getCustomerInfo());
    } catch {
      return "free";
    }
  },
};

/** Exporté pour les tests : remet le module dans son état de départ. */
export function __resetRevenueCatForTests(): void {
  Purchases = null;
  configuredFor = null;
}

export const __testing = {
  describeProduct,
  offerRank,
  trialDaysOf,
  tierFromCustomerInfo,
  reasonFromError,
  storeProductIds,
  canonicalId,
  ENTITLEMENTS,
};
