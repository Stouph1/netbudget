// Bandeau d'échec de synchronisation. Discret, persistant, non bloquant.
//
// CE QU'IL REMPLACE, et pourquoi c'était grave. Les écrans qui enregistrent à
// chaque sélection affichaient une ALERTE MODALE à chaque échec. Sur un
// questionnaire de douze questions avec un coffre verrouillé, ça faisait douze
// fenêtres à fermer — l'app devenait inutilisable, et le message ne disait même
// pas quoi faire.
//
// TROIS RÈGLES :
//
// 1. JAMAIS DE MODALE. La donnée EST enregistrée sur l'appareil ; rien n'est
//    perdu, rien n'exige une décision immédiate. Interrompre pour annoncer que
//    tout va bien localement est le pire rapport bruit/information possible.
//
// 2. UNE SEULE FOIS, et ça reste affiché. Un bandeau qui persiste informe sans
//    répéter. Douze alertes identiques ne disent pas douze fois plus.
//
// 3. IL DIT QUOI FAIRE quand on peut agir. « Coffre verrouillé » ne veut rien
//    dire pour personne ; « tes données cloud sont chiffrées avec une clé que
//    cet appareil n'a plus » avec un bouton, si.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLang } from "../contexts/LangContext";

const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const AMBER = "#FBBF24";

/**
 * Raison d'échec renvoyée par la couche de stockage, telle quelle.
 *
 * `vault-locked` est la seule qui appelle une action de l'utilisateur ; les
 * autres (réseau, serveur) se résolvent d'elles-mêmes.
 */
export function SyncBanner({ error }: { error: string | null }) {
  const { t } = useLang();
  if (!error) return null;

  const locked = error === "vault-locked" || error === "workspace-key-missing";

  return (
    <View style={s.wrap}>
      <Feather name={locked ? "key" : "cloud-off"} size={15} color={AMBER} />
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{t(locked ? "sync.locked.title" : "sync.offline.title")}</Text>
        <Text style={s.body}>{t(locked ? "sync.locked.body" : "sync.offline.body")}</Text>
      </View>
      {locked ? (
        <TouchableOpacity
          onPress={() => router.push("/vault-unlock" as never)}
          style={s.cta}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={s.ctaText}>{t("sync.locked.cta")}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
    backgroundColor: "rgba(251,191,36,0.08)",
  },
  title: { color: TEXT_1, fontSize: 12.5, fontWeight: "700" },
  body: { color: TEXT_2, fontSize: 11.5, lineHeight: 16, marginTop: 1 },
  cta: {
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(251,191,36,0.16)",
  },
  ctaText: { color: AMBER, fontSize: 11.5, fontWeight: "800" },
});
