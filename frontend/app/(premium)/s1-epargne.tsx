// S1 — Épargne (Objectifs uniquement).
// Storage : encrypted_payloads via premiumStore (encryption stub Phase 3).

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DonutChart, { type DonutSegment } from "../../src/components/DonutChart";
import { useSession } from "../../src/contexts/SessionContext";
import { loadS1, saveS1 } from "../../src/lib/premiumStore";
import {
  EMPTY_S1_PAYLOAD,
  type S1Payload,
  type SavingsGoal,
} from "../../src/types/premium";
import GoalEditor from "./_components/GoalEditor";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#64748B";
const MINT = "#10B981";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";
const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

// Palette donut : 8 teintes séparées de ≥ 45° en hue, saturation forte
// pour lisibilité sur fond midnight. Pas de doublons proches (ex: 2 verts).
const SEGMENT_COLORS = [
  "#10B981", // mint
  "#3B82F6", // blue
  "#F59E0B", // amber
  "#EC4899", // pink
  "#8B5CF6", // violet
  "#06B6D4", // cyan
  "#F97316", // orange
  "#EF4444", // red
];

function formatEuro(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function progressPct(goal: SavingsGoal): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
}

export default function S1Epargne() {
  const { user, loading: sessionLoading } = useSession();
  const [payload, setPayload] = useState<S1Payload>(EMPTY_S1_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const loaded = await loadS1(user.id);
      setPayload(loaded);
      setLoading(false);
    })();
  }, [user?.id]);

  const totals = useMemo(() => {
    const active = payload.goals.filter((g) => !g.extraP);
    const target = active.reduce((s, g) => s + g.targetAmount, 0);
    const current = active.reduce((s, g) => s + g.currentAmount, 0);
    return {
      target,
      current,
      pct: target > 0 ? Math.min(100, (current / target) * 100) : 0,
      count: active.length,
    };
  }, [payload.goals]);

  const donutSegments: DonutSegment[] = useMemo(() => {
    return payload.goals
      .filter((g) => !g.extraP && g.currentAmount > 0)
      .map((g, i) => ({
        label: g.label,
        value: g.currentAmount,
        color: g.color ?? SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      }));
  }, [payload.goals]);

  const persist = useCallback(
    async (next: S1Payload) => {
      setPayload(next);
      if (!user?.id) return;
      const result = await saveS1(user.id, next);
      if (!result.ok) {
        Alert.alert(
          "Sync",
          `Sauvegardé en local. Sync cloud échoué : ${result.error ?? "erreur inconnue"}`,
        );
      }
    },
    [user?.id],
  );

  const upsertGoal = useCallback(
    (g: SavingsGoal) => {
      const next = { ...payload };
      const idx = payload.goals.findIndex((x) => x.id === g.id);
      next.goals =
        idx >= 0
          ? payload.goals.map((x) => (x.id === g.id ? g : x))
          : [...payload.goals, g];
      persist(next);
    },
    [payload, persist],
  );

  const deleteGoal = useCallback(
    (id: string) =>
      persist({ ...payload, goals: payload.goals.filter((g) => g.id !== id) }),
    [payload, persist],
  );

  if (sessionLoading || loading) {
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
          <Text style={styles.emptyBody}>
            L'écran Épargne est réservé aux abonnés Premium. Retourne dans
            Réglages → Test auth pour te connecter.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.emptyBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={styles.title}>S1 · Épargne</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {donutSegments.length > 0 ? (
          <View style={styles.donutCard}>
            <DonutChart
              segments={donutSegments}
              size={200}
              strokeWidth={24}
              centerLabel={`${totals.pct.toFixed(0)}%`}
              centerValue={formatEuro(totals.current)}
              centerValueColor={GOLD}
            />
            <Text style={styles.totalMeta}>
              sur {formatEuro(totals.target)} · {totals.count} objectif
              {totals.count > 1 ? "s" : ""}
            </Text>
          </View>
        ) : (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Progression globale</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalCurrent}>{formatEuro(totals.current)}</Text>
              <Text style={styles.totalTarget}>/ {formatEuro(totals.target)}</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressBarFill, { width: `${totals.pct}%` }]}
              />
            </View>
          </View>
        )}

        {payload.goals.length === 0 ? (
          <View style={styles.emptyList}>
            <Feather name="target" size={28} color={TEXT_3} />
            <Text style={styles.emptyTitle}>Aucun objectif</Text>
            <Text style={styles.emptyBody}>
              Crée ton premier objectif d'épargne (voyage, apport maison,
              retraite anticipée…). Suis ta progression mois après mois.
            </Text>
          </View>
        ) : (
          payload.goals.map((item, i) => {
            const color = item.color ?? SEGMENT_COLORS[i % SEGMENT_COLORS.length];
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.goalCard}
                onPress={() => {
                  setEditingGoal(item);
                  setEditorOpen(true);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.goalHeader}>
                  <View style={[styles.colorDot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalLabel}>{item.label}</Text>
                    {item.extraP ? (
                      <Text style={styles.extraPTag}>Extra-budgétaire</Text>
                    ) : null}
                  </View>
                  <Text style={styles.goalPct}>
                    {progressPct(item).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.goalRow}>
                  <Text style={styles.goalCurrent}>
                    {formatEuro(item.currentAmount)}
                  </Text>
                  <Text style={styles.goalTarget}>
                    / {formatEuro(item.targetAmount)}
                  </Text>
                </View>
                <View style={styles.progressBarSmall}>
                  <View
                    style={[
                      styles.progressBarFillSmall,
                      { width: `${progressPct(item)}%`, backgroundColor: color },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditingGoal(null);
          setEditorOpen(true);
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color="#000" />
      </TouchableOpacity>

      <GoalEditor
        visible={editorOpen}
        goal={editingGoal}
        onClose={() => {
          setEditorOpen(false);
          setEditingGoal(null);
        }}
        onSave={(g) => {
          upsertGoal(g);
          setEditorOpen(false);
          setEditingGoal(null);
        }}
        onDelete={
          editingGoal
            ? () => {
                deleteGoal(editingGoal.id);
                setEditorOpen(false);
                setEditingGoal(null);
              }
            : undefined
        }
      />
    </SafeAreaView>
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

  totalCard: {
    padding: 20,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },
  totalLabel: {
    color: TEXT_2,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 8 },
  totalCurrent: {
    color: TEXT_1,
    fontSize: 32,
    fontWeight: "700",
    fontFamily: MONO_FONT,
  },
  totalTarget: {
    color: TEXT_3,
    fontSize: 18,
    marginLeft: 8,
    marginBottom: 4,
    fontFamily: MONO_FONT,
  },
  totalMeta: { color: TEXT_2, fontSize: 13, marginTop: 12, textAlign: "center" },
  progressBar: {
    marginTop: 12,
    height: 6,
    backgroundColor: SURFACE_2,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: MINT },

  donutCard: {
    padding: 20,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    marginBottom: 20,
  },

  goalCard: {
    padding: 16,
    backgroundColor: SURFACE,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  goalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  goalLabel: { color: TEXT_1, fontSize: 15, fontWeight: "600" },
  goalPct: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: MONO_FONT,
  },
  extraPTag: {
    color: TEXT_3,
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  goalRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 8 },
  goalCurrent: {
    color: TEXT_1,
    fontSize: 17,
    fontWeight: "600",
    fontFamily: MONO_FONT,
  },
  goalTarget: {
    color: TEXT_3,
    fontSize: 13,
    marginLeft: 6,
    marginBottom: 2,
    fontFamily: MONO_FONT,
  },
  progressBarSmall: {
    height: 4,
    backgroundColor: SURFACE_2,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFillSmall: { height: "100%", backgroundColor: MINT },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  emptyList: { alignItems: "center", padding: 40 },
  emptyTitle: {
    color: TEXT_1,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptyBody: {
    color: TEXT_2,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
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
