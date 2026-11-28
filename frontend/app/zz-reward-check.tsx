// TEMP-FAKE : contrôle visuel du voile avec vidéo récompensée. À supprimer.
import { useState } from "react";
import { Text, View } from "react-native";
import { LockedOverlay } from "../src/components/LockedOverlay";

export default function Check() {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: "#0F172A", paddingTop: 60 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Text key={i} style={{ color: "#fff", padding: 16 }}>Conseil numéro {i + 1} : contenu réservé</Text>
      ))}
      {open ? (
        <Text testID="opened" style={{ color: "#4ADE80", padding: 16 }}>OUVERT PAR LA VIDEO</Text>
      ) : (
        <LockedOverlay
          titleKey="coach.paywall.title"
          bodyKey="coach.paywall.body"
          icon="award"
          cards
          reward={{ labelKey: "coach.reward.cta", onEarned: () => setOpen(true), testID: "coach-reward" }}
        />
      )}
    </View>
  );
}
