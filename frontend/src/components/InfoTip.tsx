// La bulle « i » — une explication courte, là où l'on en a besoin.
//
// L'app veut apprendre en faisant : un champ « taux de charges » ou « in fine »
// ne se comprend pas tout seul. Plutôt qu'un guide à part que personne ne lit,
// chaque champ qui le mérite porte un « i » : un tap, deux phrases, on referme.
// Le bouton fait 28 px avec une zone tactile étendue à 44 px, et il annonce
// « À propos de … » au lecteur d'écran.

import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLang } from "../contexts/LangContext";
import { useAccent } from "../contexts/ThemeContext";
import { alpha } from "../theme/accents";

const SURFACE = "#141A2A";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#A8B3C7";
const BORDER = "rgba(255,255,255,0.10)";

export type InfoContent = { title: string; body: string };

export function InfoTip({ title, body, testID }: InfoContent & { testID?: string }) {
  const GOLD = useAccent().main;
  const styles = useMemo(() => makeStyles(GOLD), [GOLD]);
  const { t, tp } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={tp("help.a11y.about", { what: title })}
        style={styles.btn}
        activeOpacity={0.7}
        testID={testID}
      >
        <Feather name="info" size={13} color={GOLD} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.head}>
              <View style={styles.headIcon}>
                <Feather name="info" size={16} color={GOLD} />
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>
            <Text style={styles.body}>{body}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.close} accessibilityRole="button" activeOpacity={0.85}>
              <Text style={styles.closeText}>{t("help.gotIt")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (GOLD: string) =>
  StyleSheet.create({
    btn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: alpha(GOLD, 0.12),
    },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
    sheet: { backgroundColor: SURFACE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 20 },
    head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    headIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: alpha(GOLD, 0.14),
    },
    title: { flex: 1, color: TEXT_1, fontSize: 16, fontWeight: "800" },
    body: { color: TEXT_2, fontSize: 14, lineHeight: 21 },
    close: { marginTop: 16, alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: GOLD },
    closeText: { color: "#000", fontSize: 13, fontWeight: "800" },
  });
