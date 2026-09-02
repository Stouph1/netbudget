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
import { allowTierOverride, loadTierOverride } from "../lib/tierOverride";

export function useIsTester(): boolean {
  const { user } = useSession();
  const [isTester, setIsTester] = useState(false);

  useEffect(() => {
    let alive = true;

    // Le réglage local se charge TOUJOURS, même sans session : il survit à un
    // redémarrage et on ne veut pas le reposer à chaque essai.
    void loadTierOverride();

    if (!user?.id) {
      setIsTester(false);
      // En développement, la porte reste ouverte sans compte : c'est le seul
      // moyen de vérifier les écrans de barrage avant d'être inscrit.
      allowTierOverride(__DEV__);
      return;
    }
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("am_i_tester");
        const ok = !error && data === true;
        if (!alive) return;
        setIsTester(ok);
        // La porte du palier forcé s'ouvre sur une réponse du serveur — ou en
        // développement.
        //
        // C'ÉTAIT LE DÉFAUT : le panneau de test s'affiche dès `__DEV__`, mais
        // la porte n'écoutait que le serveur. Les boutons étaient donc inertes
        // sur une machine de développement, sans le moindre message. Les deux
        // conditions doivent être les mêmes des deux côtés.
        allowTierOverride(ok || __DEV__);
      } catch {
        // Hors ligne, ou fonction absente d'une base pas encore migrée.
        if (!alive) return;
        setIsTester(false);
        allowTierOverride(__DEV__);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return isTester;
}
