// Mise en service de la facturation, au démarrage et à chaque changement de
// compte.
//
// UN SEUL POINT D'ENTRÉE. Le reste de l'app ne connaît que `billing()` et ne
// sait pas qui l'implémente. Ici on décide, une fois, si c'est RevenueCat ou
// l'implémentation d'attente qui ne vend rien.
//
// ORDRE IMPORTANT : on rattache d'abord l'achat au compte (`setUpRevenueCat`),
// et seulement ensuite on déclare le fournisseur. L'inverse ouvrirait une
// fenêtre où un achat pourrait partir sur un identifiant anonyme — c'est-à-dire
// un client qui paie sans rien débloquer.

import { setBillingProvider, unavailableBilling } from "./provider";
import { revenueCatBilling, setUpRevenueCat } from "./revenuecat";

/**
 * Branche ou débranche la facturation selon l'utilisateur connecté.
 *
 * Renvoie true si la boutique est réellement joignable. Ne lève jamais : une
 * facturation en panne rend l'app non vendeuse, pas cassée.
 */
export async function syncBilling(userId: string | null): Promise<boolean> {
  try {
    const ready = await setUpRevenueCat(userId);
    setBillingProvider(ready ? revenueCatBilling : unavailableBilling);
    return ready;
  } catch {
    setBillingProvider(unavailableBilling);
    return false;
  }
}
