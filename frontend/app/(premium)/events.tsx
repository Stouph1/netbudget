// Écran Événements autonome (accès depuis la tuile Profil) — le contenu vit
// dans EventsPanel, aussi embarqué dans l'onglet de la tab bar.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EventsPanel from "../../src/components/EventsPanel";

const MIDNIGHT = "#0F172A";
const TEXT_1 = "#FFFFFF";

export default function Events() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={styles.title}>Événements</Text>
        <View style={{ width: 22 }} />
      </View>
      <EventsPanel standalone />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "600" },
});
