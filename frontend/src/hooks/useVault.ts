// Résout l'état du coffre et le publie pour la couche de stockage.
//
// POINT CRITIQUE : `premiumStore` lit cet état de façon SYNCHRONE pour décider
// s'il chiffre, s'il écrit en clair, ou s'il refuse d'écrire. Si personne ne
// publie l'état, la valeur par défaut est « aucun compte » — donc aucune
// écriture cloud n'est chiffrée. Ce hook doit donc être monté aussi longtemps
// que l'app vit, et republier à chaque changement de compte.
//
// Il est monté dans app/_layout.tsx, à côté des notifications, pour cette
// raison exacte.

import { useCallback, useEffect, useState } from "react";
import { useSession } from "../contexts/SessionContext";
import { currentKey } from "../lib/crypto/vault";
import { readVaultState } from "../lib/crypto/vault";
import { publishVaultSession } from "../lib/crypto/vaultSession";
import type { VaultState } from "../lib/crypto/vaultState";

export type VaultInfo = {
  state: VaultState;
  /** Recalcule après une activation ou un déverrouillage. */
  refresh: () => Promise<void>;
};

export function useVault(): VaultInfo {
  const { user } = useSession();
  const [state, setState] = useState<VaultState>({ status: "noAccount" });

  const refresh = useCallback(async () => {
    const userId = user?.id ?? null;
    const next = await readVaultState(userId);
    const key = next.status === "unlocked" ? await currentKey(userId) : null;
    // On publie AVANT de mettre à jour le rendu : un écran qui réagit au
    // changement d'état pourrait déclencher une écriture, et celle-ci doit
    // déjà voir le bon état.
    publishVaultSession(userId, next, key);
    setState(next);
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { state, refresh };
}
