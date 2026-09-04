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

/**
 * Comptes qui ont TOUJOURS le panneau de test, sans passer par la base.
 *
 * POURQUOI CETTE LISTE EXISTE. Le drapeau serveur est la bonne mécanique pour
 * désigner un testeur extérieur, mais il impose un aller-retour dans l'éditeur
 * SQL — et sur le compte du développeur, qui a besoin du panneau à chaque
 * essai, c'est une friction quotidienne pour rien.
 *
 * CE N'EST PAS UNE PORTE DÉROBÉE : il faut être authentifié comme ce compte
 * précis auprès de Supabase. Connaître l'adresse ne suffit pas — il faut le
 * mot de passe ou le compte Google associé. Et le panneau ne donne accès à
 * aucune donnée : il rejoue des écrans.
 */
const OWNER_EMAILS = ["stephane.pizeuil@gmail.com"];

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

    // Compte propriétaire : panneau ouvert immédiatement, sans interroger le
    // serveur. Évite de dépendre d'une commande SQL pour travailler.
    const email = user.email?.toLowerCase() ?? "";
    if (OWNER_EMAILS.includes(email)) {
      setIsTester(true);
      allowTierOverride(true);
      void loadTierOverride();
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
  }, [user?.id, user?.email]);

  return isTester;
}
