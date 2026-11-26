// Le petit lien au-dessus de la bannière : la pub a une sortie, et c'est
// l'abonnement. Séparé de la bannière pour rester visible à l'écran en web.
import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

export default function AdRemoveLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 4, left: 12, right: 12 }}
      style={{
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
        // Fond plein : le lien flotte au-dessus de la liste qui défile.
        backgroundColor: "rgba(15,23,42,0.94)",
        // L'écart avec la bannière évite tout clic involontaire sur la pub.
        marginBottom: 6,
      }}
      testID="ad-remove-link"
    >
      <Text style={{ color: "#A1A1AA", fontSize: 12, fontWeight: "600" }}>{label}</Text>
      <Feather name="chevron-right" size={12} color="#A1A1AA" />
    </TouchableOpacity>
  );
}
