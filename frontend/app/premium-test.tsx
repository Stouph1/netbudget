// Écran TEMPORAIRE pour valider le flow d'auth Phase 0.
// À retirer (ou évoluer en vrai login screen Premium) une fois la paywall faite.

import { Feather } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../src/contexts/SessionContext";
import { signInWithApple, signOut } from "../src/lib/auth";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const BORDER = "rgba(255,255,255,0.08)";

export default function PremiumTest() {
  const { session, user, loading } = useSession();
  const [busy, setBusy] = useState(false);

  async function handleApple() {
    setBusy(true);
    const result = await signInWithApple();
    setBusy(false);
    if (!result.ok && result.reason !== "cancelled") {
      Alert.alert("Apple Sign In", result.message ?? result.reason);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    setBusy(false);
  }

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={TEXT_1} />
          </TouchableOpacity>
          <Text style={styles.title}>Premium · Auth Test</Text>
          <View style={{ width: 22 }} />
        </View>

        {loading ? (
          <Text style={styles.muted}>Chargement de la session…</Text>
        ) : session ? (
          <View style={styles.card}>
            <Text style={styles.label}>Connecté</Text>
            <Text style={styles.email}>
              {user?.email ?? "(email non partagé)"}
            </Text>
            <Text style={styles.mutedMono}>User ID: {user?.id}</Text>
            <View style={{ height: 20 }} />
            <TouchableOpacity
              onPress={handleSignOut}
              disabled={busy}
              style={styles.btnSecondary}
              activeOpacity={0.85}
            >
              <Feather name="log-out" size={18} color={TEXT_1} />
              <Text style={styles.btnText}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Pas de session active</Text>
            {Platform.OS === "ios" ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                }
                cornerRadius={12}
                style={{ width: "100%", height: 52, marginTop: 16 }}
                onPress={handleApple}
              />
            ) : (
              <Text style={styles.muted}>
                Apple Sign In = iOS uniquement. Lance sur iPhone ou simulator
                iOS.
              </Text>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
        <Text style={styles.disclaimer}>
          Écran temporaire pour valider la chaîne d'auth Phase 0 (Premium). Sera
          remplacé par un vrai login screen avant launch.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  scroll: { padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "600" },
  card: {
    backgroundColor: SURFACE,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  label: {
    color: TEXT_2,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  email: { color: TEXT_1, fontSize: 18, fontWeight: "600", marginTop: 4 },
  muted: { color: TEXT_2, fontSize: 13, marginTop: 8 },
  mutedMono: {
    color: TEXT_2,
    fontSize: 11,
    marginTop: 8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  btnText: { color: TEXT_1, fontSize: 15, fontWeight: "500" },
  disclaimer: { color: TEXT_2, fontSize: 12, lineHeight: 18 },
});
