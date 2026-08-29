// Décide si l'écran d'approbation doit s'afficher, et l'enregistre.
//
// ON COMPARE LA VERSION, PAS UN BOOLÉEN. Le serveur renvoie la version du texte
// approuvée ; on la compare à celle qu'embarque l'app. Si elles diffèrent, le
// contrat a changé depuis, et il doit être réapprouvé. Un simple « a déjà
// accepté » laisserait croire que huit personnes ont approuvé un texte qu'elles
// n'ont jamais lu.
//
// EN CAS DE DOUTE, ON NE BLOQUE PAS. Réseau coupé, base pas encore migrée : on
// n'affiche rien. Un écran d'approbation qui apparaît par erreur devant
// quelqu'un qui n'est pas testeur est plus grave qu'une approbation manquante,
// qui se rattrape au lancement suivant.

import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useSession } from "../contexts/SessionContext";
import { supabase } from "../lib/supabase";
import { CONTRACT_VERSION } from "../lib/testerContract";

export function useTesterConsent({ isTester }: { isTester: boolean }) {
  const { user } = useSession();
  const [needed, setNeeded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isTester || !user?.id) {
      setNeeded(false);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("my_tester_consent");
        if (!alive) return;
        setNeeded(!error && data !== CONTRACT_VERSION);
      } catch {
        if (alive) setNeeded(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isTester, user?.id]);

  const submit = useCallback(
    async (fullName: string, accepted: boolean) => {
      setBusy(true);
      try {
        const { error } = await supabase.rpc("record_tester_consent", {
          p_full_name: accepted ? fullName : "(refus)",
          p_accepted: accepted,
          p_contract_version: CONTRACT_VERSION,
          p_platform: Platform.OS,
          p_app_version: Constants.expoConfig?.version ?? null,
        });
        // On ne referme QUE si l'enregistrement a réussi. Fermer sur une
        // erreur réseau laisserait un testeur convaincu d'avoir approuvé,
        // sans trace côté serveur — le seul cas où ce dispositif ne sert plus
        // à rien.
        if (!error) setNeeded(false);
        return !error;
      } catch {
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return { needed, busy, submit };
}
