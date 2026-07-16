// Accueil Premium — point de départ de la navigation Premium.
//
// Affiche :
//  - Profil (email connecté) + scope actif
//  - Overview simple : progression S1 du scope courant
//  - Tuiles de navigation : S1 Épargne / Conseils / Workspaces
//
// C'est le "home" vers lequel ramènent les icônes maison des écrans Premium.

import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../src/contexts/SessionContext";
import { useActiveScope } from "../../src/hooks/useActiveScope";
import { loadS1 } from "../../src/lib/premiumStore";
import type { S1Payload } from "../../src/types/premium";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#64748B";
const GOLD = "#4ADE80";
const MINT = "#10B981";
const BORDER = "rgba(255,255,255,0.08)";
const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

function formatEuro(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PremiumHome() {
  const { user, loading: sessionLoading } = useSession();
  const { workspaceId, scopeLabel, loading: scopeLoading } = useActiveScope();
  const [s1, setS1] = useState<S1Payload | null>(null);

  // Recharge à chaque focus (retour depuis S1 après édition, switch scope…)
  useFocusEffect(
    useCallback(() => {
      if (!user?.id || scopeLoading) return;
      let cancelled = false;
      (async () => {
        const payload = await loadS1(user.id, workspaceId);
        if (!cancelled) setS1(payload);
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.id, workspaceId, scopeLoading]),
  );

  if (sessionLoading || scopeLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Feather name="lock" size={32} color={TEXT_3} />
          <Text style={styles.emptyTitle}>Connexion Premium requise</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeGoals = s1?.goals.filter((g) => !g.extraP) ?? [];
  const target = activeGoals.reduce((s, g) => s + g.targetAmount, 0);
  const current = activeGoals.reduce((s, g) => s + g.currentAmount, 0);
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={styles.title}>Premium</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Profil + scope */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Feather name="user" size={22} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user.email ?? "email masqué"}
            </Text>
            <TouchableOpacity
              style={styles.scopeInline}
              onPress={() => router.push("/(premium)/workspaces" as never)}
              activeOpacity={0.8}
            >
              <Feather
                name={workspaceId ? "users" : "user"}
                size={12}
                color={GOLD}
              />
              <Text style={styles.scopeInlineText}>{scopeLabel}</Text>
              <Feather name="chevron-down" size={12} color={TEXT_3} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Overview S1 */}
        <TouchableOpacity
          style={styles.overviewCard}
          onPress={() => router.push("/(premium)/s1-epargne" as never)}
          activeOpacity={0.85}
        >
          <Text style={styles.overviewLabel}>Épargne · {scopeLabel}</Text>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewCurrent}>{formatEuro(current)}</Text>
            <Text style={styles.overviewTarget}>/ {formatEuro(target)}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.overviewMeta}>
            {activeGoals.length} objectif{activeGoals.length > 1 ? "s" : ""} ·{" "}
            {pct.toFixed(0)}%
          </Text>
        </TouchableOpacity>

        {/* Tuiles navigation */}
        <View style={styles.tilesRow}>
          <Tile
            icon="target"
            label="S1 · Épargne"
            onPress={() => router.push("/(premium)/s1-epargne" as never)}
          />
          <Tile
            icon="compass"
            label="Conseils"
            onPress={() => router.push("/(premium)/advice" as never)}
          />
        </View>
        <View style={styles.tilesRow}>
          <Tile
            icon="users"
            label="Workspaces"
            onPress={() => router.push("/(premium)/workspaces" as never)}
          />
          <Tile
            icon="pie-chart"
            label="Budget"
            onPress={() => router.back()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.85}>
      <Feather name={icon} size={22} color={GOLD} />
      <Text style={styles.tileLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "600" },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SURFACE_2,
    alignItems: "center",
    justifyContent: "center",
  },
  profileEmail: { color: TEXT_1, fontSize: 14, fontWeight: "600" },
  scopeInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  scopeInlineText: { color: GOLD, fontSize: 12, fontWeight: "700" },

  overviewCard: {
    padding: 20,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  overviewLabel: {
    color: TEXT_2,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overviewRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 8 },
  overviewCurrent: {
    color: TEXT_1,
    fontSize: 28,
    fontWeight: "700",
    fontFamily: MONO_FONT,
  },
  overviewTarget: {
    color: TEXT_3,
    fontSize: 16,
    marginLeft: 8,
    marginBottom: 3,
    fontFamily: MONO_FONT,
  },
  overviewMeta: { color: TEXT_2, fontSize: 12, marginTop: 8 },
  progressBar: {
    marginTop: 12,
    height: 6,
    backgroundColor: SURFACE_2,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: MINT },

  tilesRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  tile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 22,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tileLabel: { color: TEXT_1, fontSize: 13, fontWeight: "600" },

  emptyTitle: { color: TEXT_1, fontSize: 16, fontWeight: "600", marginTop: 16 },
  emptyBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyBtnText: { color: TEXT_1, fontSize: 14, fontWeight: "500" },
});
