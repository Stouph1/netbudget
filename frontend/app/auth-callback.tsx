// Retour dans l'app depuis un lien reçu par e-mail (confirmation d'adresse,
// lien magique). La page du site www.netbudget.app/confirmation nous renvoie
// ici, avec le `code` que Supabase lui a donné.
//
// DEUX CAS, et rien à faire pour la personne dans les deux :
//  - un `code` est là et s'échange contre une session → connecté, direction
//    l'accueil ;
//  - pas de code, ou code périmé (lien ouvert sur un autre appareil, ou
//    deux fois) → l'adresse est confirmée de toute façon côté serveur, on
//    l'emmène se connecter avec son mot de passe.
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../src/lib/supabase";
import { notify } from "../src/utils/notify";
import { useLang } from "../src/contexts/LangContext";

export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; type?: string }>();
  const { t } = useLang();

  useEffect(() => {
    let alive = true;
    (async () => {
      const code = typeof params.code === "string" ? params.code : null;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!alive) return;
        if (!error) {
          notify(t("auth.callback.signedIn.title"), t("auth.callback.signedIn.body"));
          router.replace("/");
          return;
        }
      }
      if (!alive) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/");
        return;
      }
      notify(t("auth.callback.confirmed.title"), t("auth.callback.confirmed.body"));
      router.replace({ pathname: "/email-auth", params: { mode: "signin" } });
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0F172A" }}>
      <ActivityIndicator color="#10B981" />
    </View>
  );
}
