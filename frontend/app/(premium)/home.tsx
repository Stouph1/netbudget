// Route /(premium)/home — cible des icônes maison des écrans Premium.
// Le contenu vit dans PremiumHomePanel (partagé avec le 4e onglet de la
// tab bar dans index.tsx).

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { goBack } from "../../src/lib/nav";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PremiumHomePanel from "../../src/components/PremiumHomePanel";

const MIDNIGHT = "#0F172A";
const TEXT_1 = "#FFFFFF";

export default function PremiumHome() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={styles.title}>Profil</Text>
        <View style={{ width: 22 }} />
      </View>
      <PremiumHomePanel />
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
