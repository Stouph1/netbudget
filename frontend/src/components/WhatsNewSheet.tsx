// Ce qui a changé, à l'ouverture d'une version majeure.
//
// TROIS RÈGLES D'ÉCRITURE, parce qu'un écran de nouveautés mal écrit est pire
// que pas d'écran du tout :
//
// 1. On dit ce que ça CHANGE POUR L'UTILISATEUR, pas ce qu'on a construit.
//    « Retrouve ton budget sur ton autre téléphone » et non « synchronisation
//    chiffrée de bout en bout ».
//
// 2. Cinq lignes au maximum. Une liste de quinze points ne se lit pas, elle se
//    ferme.
//
// 3. On n'y vend rien. Le bouton dit « Continuer », pas « S'abonner ». Un
//    écran de nouveautés qui se révèle être une publicité apprend à
//    l'utilisateur à fermer les suivants sans les lire.

import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useLang } from "../contexts/LangContext";

const MIDNIGHT = "#0F172A";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const GOLD = "#4ADE80";

/**
 * Les entrées de la version majeure en cours.
 *
 * Volontairement en dur : ce contenu change une fois par an et doit être relu
 * mot à mot avant publication. Le charger depuis un serveur ferait dépendre le
 * premier écran d'une mise à jour d'une requête réseau qui peut échouer.
 */
const ENTRIES: { icon: keyof typeof Feather.glyphMap; key: string }[] = [
  { icon: "lock", key: "whatsnew.v2.crypto" },
  { icon: "users", key: "whatsnew.v2.shared" },
  { icon: "award", key: "whatsnew.v2.advice" },
  { icon: "trending-down", key: "whatsnew.v2.loans" },
  { icon: "bell", key: "whatsnew.v2.notifs" },
];

export function WhatsNewSheet({
  visible,
  version,
  onClose,
}: {
  visible: boolean;
  version: string;
  onClose: () => void;
}) {
  const { t, tp } = useLang();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.grabber} />

          <Text style={s.eyebrow}>{tp("whatsnew.version", { v: version })}</Text>
          <Text style={s.title}>{t("whatsnew.title")}</Text>

          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingVertical: 14, gap: 14 }}
            showsVerticalScrollIndicator
          >
            {ENTRIES.map((e, i) => (
              <Reanimated.View
                key={e.key}
                entering={FadeInDown.delay(90 + i * 70).duration(340)}
                style={s.row}
              >
                <View style={s.icon}>
                  <Feather name={e.icon} size={15} color={GOLD} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{t(`${e.key}.title`)}</Text>
                  <Text style={s.rowBody}>{t(`${e.key}.body`)}</Text>
                </View>
              </Reanimated.View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={s.cta}
            onPress={onClose}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={s.ctaText}>{t("whatsnew.cta")}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "82%",
    backgroundColor: MIDNIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
    marginBottom: 16,
  },
  eyebrow: {
    color: GOLD,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: { color: TEXT_1, fontSize: 22, fontWeight: "800", marginTop: 5 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(74,222,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { color: TEXT_1, fontSize: 14.5, fontWeight: "700", marginBottom: 2 },
  rowBody: { color: TEXT_2, fontSize: 12.5, lineHeight: 18 },
  cta: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { color: "#04140B", fontSize: 15, fontWeight: "800" },
});
