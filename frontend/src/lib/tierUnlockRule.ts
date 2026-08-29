// Quand fêter un palier ? Module PUR : ni React, ni stockage, ni réseau.
//
// Séparé du hook parce que c'est la seule règle du sujet, et qu'elle décide de
// ce qu'un client voit dans la minute qui suit un paiement — le moment précis
// où un doute se transforme en demande de remboursement. Une règle pareille se
// teste, et un fichier qui importe AsyncStorage ne se teste pas.

import type { Tier } from "./entitlements";

const RANK: Record<Tier, number> = { free: 0, solo: 1, duo: 2, family: 3 };

/**
 * Faut-il montrer l'écran de déverrouillage ?
 *
 * `seen` est le plus haut palier déjà fêté sur cet appareil, pour ce compte.
 * On mémorise un PALIER et non un booléen : quelqu'un qui passe de Solo à
 * Famille doit revoir la fête, il vient de payer davantage.
 */
export function shouldCelebrate(seen: Tier | null, current: Tier): boolean {
  // Rien à fêter sans abonnement.
  if (current === "free") return false;
  // Déjà fêté ce palier, ou mieux. Un écran plein qui se rejoue à chaque
  // lancement cesse d'être une récompense et devient une porte.
  //
  // Ce test couvre aussi les DESCENTES — fin d'essai, passage à une formule
  // plus petite. Rien de tout ça n'est une bonne nouvelle à annoncer en plein
  // écran.
  if (seen && RANK[seen] >= RANK[current]) return false;
  return true;
}
