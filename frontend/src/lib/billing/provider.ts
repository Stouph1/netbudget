// Frontière avec la facturation.
//
// POURQUOI UNE ABSTRACTION plutôt que d'appeler directement un fournisseur :
//
// 1. Le SDK de facturation est un MODULE NATIF. L'installer casse Expo Go et
//    impose un build signé pour la moindre modification. Tant que le compte
//    Apple société n'est pas stabilisé, créer les produits dans App Store
//    Connect serait du travail à refaire — l'entité légale change.
//
// 2. La leçon de Google Sign-In et de libsodium : une dépendance qui ne
//    fonctionne que dans un environnement se paie plus tard. Ici, tout ce qui
//    est au-dessus de cette frontière fonctionne sur web, dans Expo Go et en
//    build. Seule l'implémentation change.
//
// 3. Les prix ne sont JAMAIS dans le code : ils arrivent d'ici, localisés par
//    la boutique. Voir plans.ts.
//
// L'implémentation par défaut ne vend rien et l'annonce. C'est volontaire : une
// app qui affiche un bouton d'achat inopérant perd la confiance du client au
// moment le plus coûteux.

import type { Tier } from "../entitlements";
import type { Period } from "./plans";

/** Une offre telle que la boutique la décrit. Le prix est déjà formaté. */
export type Offering = {
  productId: string;
  tier: Exclude<Tier, "free">;
  period: Period;
  /** Prix prêt à afficher, dans la devise et le format du pays. */
  priceLabel: string;
  /**
   * Montant numérique et devise, tels que la boutique les donne.
   *
   * Nécessaires pour CALCULER l'économie annuelle au lieu de l'écrire en dur.
   * Un pourcentage figé dans le code deviendrait faux à la première grille
   * tarifaire régionale — et afficher une remise qui n'est pas celle débitée
   * est une pratique commerciale trompeuse, sanctionnée en Europe.
   */
  priceAmount: number;
  currency: string;
};

export type PurchaseResult =
  | { ok: true; tier: Exclude<Tier, "free"> }
  | { ok: false; reason: "cancelled" | "unavailable" | "alreadyOwned" | "error"; message?: string };

export type BillingProvider = {
  /** La facturation est-elle réellement disponible sur cet appareil ? */
  isAvailable(): boolean;
  /** Offres proposées, prix inclus. Vide quand la boutique ne répond pas. */
  listOfferings(): Promise<Offering[]>;
  /** Lance l'achat. */
  purchase(productId: string): Promise<PurchaseResult>;
  /**
   * Restaure les achats.
   *
   * Obligatoire pour la revue App Store : un client qui change de téléphone
   * doit pouvoir retrouver son abonnement sans repayer, et sans nous écrire.
   */
  restore(): Promise<{ ok: boolean; tier: Tier }>;
  /** Palier actif selon la boutique. C'est la seule autorité en la matière. */
  activeTier(): Promise<Tier>;
};

/**
 * Implémentation d'attente : ne vend rien, ne prétend pas le contraire.
 *
 * `isAvailable` renvoie false, donc l'écran des formules affiche les
 * fonctionnalités sans bouton d'achat. Un bouton qui échoue est pire que pas de
 * bouton.
 */
export const unavailableBilling: BillingProvider = {
  isAvailable: () => false,
  listOfferings: async () => [],
  purchase: async () => ({ ok: false, reason: "unavailable" }),
  restore: async () => ({ ok: false, tier: "free" }),
  // Tant que la facturation n'est pas branchée, le palier vient de tier.ts
  // (« family » pour tout le monde, le temps du développement).
  activeTier: async () => "free",
};

let provider: BillingProvider = unavailableBilling;

/**
 * Remplace l'implémentation. Un seul appel au démarrage suffira, le jour où le
 * SDK est installé — rien d'autre dans l'app ne bougera.
 */
export function setBillingProvider(next: BillingProvider): void {
  provider = next;
}

export function billing(): BillingProvider {
  return provider;
}
