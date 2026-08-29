// Ce compte est-il un compte de test ?
//
// LA RÉPONSE VIENT DU SERVEUR, jamais d'un réglage local. Le panneau testeur
// permet de rejouer des fêtes et de forcer des états : laissé au client, il
// serait activable par n'importe qui avec un éditeur de fichiers.
//
// EN CAS DE DOUTE, NON. Réseau coupé, fonction absente, réponse illisible : on
// répond false. Un panneau de test qui apparaît chez un vrai client est plus
// grave qu'un panneau manquant chez un testeur, qui peut nous le dire.

import { useEffect, useState } from "react";
import { useSession } from "../contexts/SessionContext";
import { supabase } from "../lib/supabase";

export function useIsTester(): boolean {
  const { user } = useSession();
  const [isTester, setIsTester] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setIsTester(false);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("am_i_tester");
        if (alive) setIsTester(!error && data === true);
      } catch {
        // Hors ligne, ou fonction absente d'une base pas encore migrée.
        if (alive) setIsTester(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return isTester;
}
