// S1 — Épargne & Placements.
// 3 sections : Objectifs (donut + liste) | Comptes | Patrimoine.
// Storage : encrypted_payloads via premiumStore (encryption stub Phase 3).

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  type Account,
  type PatrimoineCategory,
  type PatrimoineItem,
  type S1Payload,
  type SavingsGoal,
} from "../../src/types/premium";
import AccountEditor from "./_components/AccountEditor";
import GoalEditor from "./_components/GoalEditor";
import PatrimoineEditor from "./_components/PatrimoineEditor";

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

// Palette pour les segments donut — mint, gold, teal, purple, orange, pink, blue, red…
const SEGMENT_COLORS = [
  "#10B981", "#4ADE80", "#06B6D4", "#8B5CF6",
  "#F59E0B", "#EC4899", "#3B82F6", "#EF4444",
  "#84CC16", "#14B8A6", "#F97316", "#A855F7",
];

const CATEGORY_LABELS: Record<PatrimoineCategory, string> = {
  foncier: "Foncier",
  objets: "Objets",
  equipement: "Équipement",
  autres: "Autres",
};

type Tab = "goals" | "accounts" | "patrimoine";

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
  const [tab, setTab] = useState<Tab>("goals");

  const [goalEditorOpen, setGoalEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [accountEditorOpen, setAccountEditorOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [patrimoineEditorOpen, setPatrimoineEditorOpen] = useState(false);
  const [editingPatrimoine, setEditingPatrimoine] = useState<PatrimoineItem | null>(null);

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

  const goalsTotals = useMemo(() => {
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

  const patrimoineTotal = useMemo(
    () => payload.patrimoine.reduce((s, p) => s + p.estimatedValue, 0),
    [payload.patrimoine],
  );

  const patrimoineByCategory = useMemo(() => {
    const groups: Record<PatrimoineCategory, PatrimoineItem[]> = {
      foncier: [],
      objets: [],
      equipement: [],
      autres: [],
    };
    for (const item of payload.patrimoine) {
      groups[item.category].push(item);
    }
    return groups;
  }, [payload.patrimoine]);

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

  // === Goal handlers ===
  const upsertGoal = useCallback(
    (g: SavingsGoal) => {
      const next = { ...payload };
      const idx = payload.goals.findIndex((x) => x.id === g.id);
      next.goals = idx >= 0
        ? payload.goals.map((x) => (x.id === g.id ? g : x))
        : [...payload.goals, g];
      persist(next);
    },
    [payload, persist],
  );
  const deleteGoal = useCallback(
    (id: string) => persist({ ...payload, goals: payload.goals.filter((g) => g.id !== id) }),
    [payload, persist],
  );

  // === Account handlers ===
  const upsertAccount = useCallback(
    (a: Account) => {
      const next = { ...payload };
      const idx = payload.accounts.findIndex((x) => x.id === a.id);
      next.accounts = idx >= 0
        ? payload.accounts.map((x) => (x.id === a.id ? a : x))
        : [...payload.accounts, a];
      persist(next);
    },
    [payload, persist],
  );
  const deleteAccount = useCallback(
    (id: string) =>
      persist({
        ...payload,
        accounts: payload.accounts.filter((a) => a.id !== id),
        // Retire aussi le lien accountId sur les objectifs orphelins
        goals: payload.goals.map((g) =>
          g.accountId === id ? { ...g, accountId: undefined } : g,
        ),
      }),
    [payload, persist],
  );

  // === Patrimoine handlers ===
  const upsertPatrimoine = useCallback(
    (p: PatrimoineItem) => {
      const next = { ...payload };
      const idx = payload.patrimoine.findIndex((x) => x.id === p.id);
      next.patrimoine = idx >= 0
        ? payload.patrimoine.map((x) => (x.id === p.id ? p : x))
        : [...payload.patrimoine, p];
      persist(next);
    },
    [payload, persist],
  );
  const deletePatrimoine = useCallback(
    (id: string) =>
      persist({ ...payload, patrimoine: payload.patrimoine.filter((p) => p.id !== id) }),
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

      {/* Segmented control */}
      <View style={styles.tabs}>
        {(["goals", "accounts", "patrimoine"] as Tab[]).map((t) => {
          const active = tab === t;
          const label = t === "goals" ? "Objectifs" : t === "accounts" ? "Comptes" : "Patrimoine";
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* === Objectifs === */}
      {tab === "goals" && (
        <>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
            {donutSegments.length > 0 ? (
              <View style={styles.donutCard}>
                <DonutChart
                  segments={donutSegments}
                  size={180}
                  strokeWidth={22}
                  centerLabel={`${goalsTotals.pct.toFixed(0)}%`}
                  centerValue={formatEuro(goalsTotals.current)}
                  centerValueColor={GOLD}
                />
                <View style={{ marginTop: 12, alignItems: "center" }}>
                  <Text style={styles.totalMeta}>
                    sur {formatEuro(goalsTotals.target)} · {goalsTotals.count} objectif
                    {goalsTotals.count > 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Progression globale</Text>
                <View style={styles.totalRow}>
                  <Text style={styles.totalCurrent}>{formatEuro(goalsTotals.current)}</Text>
                  <Text style={styles.totalTarget}>/ {formatEuro(goalsTotals.target)}</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressBarFill, { width: `${goalsTotals.pct}%` }]} />
                </View>
              </View>
            )}

            {payload.goals.length === 0 ? (
              <View style={styles.emptyList}>
                <Feather name="target" size={28} color={TEXT_3} />
                <Text style={styles.emptyTitle}>Aucun objectif</Text>
                <Text style={styles.emptyBody}>
                  Crée ton premier objectif d'épargne (voyage, apport maison,
                  retraite anticipée…).
                </Text>
              </View>
            ) : (
              payload.goals.map((item, i) => {
                const account = payload.accounts.find((a) => a.id === item.accountId);
                const color =
                  item.color ?? SEGMENT_COLORS[i % SEGMENT_COLORS.length];
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.goalCard}
                    onPress={() => {
                      setEditingGoal(item);
                      setGoalEditorOpen(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.goalHeader}>
                      <View style={[styles.colorDot, { backgroundColor: color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalLabel}>{item.label}</Text>
                        {account ? (
                          <Text style={styles.goalMeta}>{account.label}</Text>
                        ) : item.extraP ? (
                          <Text style={styles.extraPTag}>Extra-budgétaire</Text>
                        ) : null}
                      </View>
                      <Text style={styles.goalPct}>{progressPct(item).toFixed(0)}%</Text>
                    </View>
                    <View style={styles.goalRow}>
                      <Text style={styles.goalCurrent}>{formatEuro(item.currentAmount)}</Text>
                      <Text style={styles.goalTarget}>/ {formatEuro(item.targetAmount)}</Text>
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
              setGoalEditorOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={24} color="#000" />
          </TouchableOpacity>
        </>
      )}

      {/* === Comptes === */}
      {tab === "accounts" && (
        <>
          <FlatList
            data={payload.accounts}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Feather name="credit-card" size={28} color={TEXT_3} />
                <Text style={styles.emptyTitle}>Aucun compte</Text>
                <Text style={styles.emptyBody}>
                  Ajoute tes comptes (Livret A, PEA, Assurance-vie…) pour rattacher
                  tes objectifs et suivre les plafonds.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const linkedGoals = payload.goals.filter((g) => g.accountId === item.id);
              return (
                <TouchableOpacity
                  style={styles.goalCard}
                  onPress={() => {
                    setEditingAccount(item);
                    setAccountEditorOpen(true);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.goalHeader}>
                    <Feather name="credit-card" size={18} color={GOLD} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalLabel}>{item.label}</Text>
                      <Text style={styles.goalMeta}>
                        {item.kind.replace(/_/g, " ")}
                        {item.interestRate ? ` · ${item.interestRate}%` : ""}
                        {item.ceiling ? ` · plafond ${formatEuro(item.ceiling)}` : ""}
                      </Text>
                    </View>
                    {linkedGoals.length > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{linkedGoals.length}</Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              setEditingAccount(null);
              setAccountEditorOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={24} color="#000" />
          </TouchableOpacity>
        </>
      )}

      {/* === Patrimoine === */}
      {tab === "patrimoine" && (
        <>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Patrimoine total</Text>
              <Text style={[styles.totalCurrent, { marginTop: 6 }]}>
                {formatEuro(patrimoineTotal)}
              </Text>
              <Text style={styles.totalMeta}>
                {payload.patrimoine.length} bien{payload.patrimoine.length > 1 ? "s" : ""}
              </Text>
            </View>

            {payload.patrimoine.length === 0 ? (
              <View style={styles.emptyList}>
                <Feather name="briefcase" size={28} color={TEXT_3} />
                <Text style={styles.emptyTitle}>Aucun bien</Text>
                <Text style={styles.emptyBody}>
                  Ajoute tes biens patrimoniaux (immobilier, véhicule, objets de
                  valeur) pour valoriser ton patrimoine net.
                </Text>
              </View>
            ) : (
              (Object.keys(patrimoineByCategory) as PatrimoineCategory[]).map((cat) => {
                const items = patrimoineByCategory[cat];
                if (items.length === 0) return null;
                const catTotal = items.reduce((s, i) => s + i.estimatedValue, 0);
                return (
                  <View key={cat} style={{ marginTop: 20 }}>
                    <View style={styles.groupHeader}>
                      <Text style={styles.groupTitle}>{CATEGORY_LABELS[cat]}</Text>
                      <Text style={styles.groupTotal}>{formatEuro(catTotal)}</Text>
                    </View>
                    {items.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.goalCard}
                        onPress={() => {
                          setEditingPatrimoine(item);
                          setPatrimoineEditorOpen(true);
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={styles.goalHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.goalLabel}>{item.label}</Text>
                            {item.notes ? (
                              <Text style={styles.goalMeta}>{item.notes}</Text>
                            ) : null}
                          </View>
                          <Text style={styles.goalCurrent}>
                            {formatEuro(item.estimatedValue)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })
            )}
          </ScrollView>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              setEditingPatrimoine(null);
              setPatrimoineEditorOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={24} color="#000" />
          </TouchableOpacity>
        </>
      )}

      {/* === Modals === */}
      <GoalEditor
        visible={goalEditorOpen}
        goal={editingGoal}
        onClose={() => {
          setGoalEditorOpen(false);
          setEditingGoal(null);
        }}
        onSave={(g) => {
          upsertGoal(g);
          setGoalEditorOpen(false);
          setEditingGoal(null);
        }}
        onDelete={
          editingGoal
            ? () => {
                deleteGoal(editingGoal.id);
                setGoalEditorOpen(false);
                setEditingGoal(null);
              }
            : undefined
        }
      />
      <AccountEditor
        visible={accountEditorOpen}
        account={editingAccount}
        onClose={() => {
          setAccountEditorOpen(false);
          setEditingAccount(null);
        }}
        onSave={(a) => {
          upsertAccount(a);
          setAccountEditorOpen(false);
          setEditingAccount(null);
        }}
        onDelete={
          editingAccount
            ? () => {
                deleteAccount(editingAccount.id);
                setAccountEditorOpen(false);
                setEditingAccount(null);
              }
            : undefined
        }
      />
      <PatrimoineEditor
        visible={patrimoineEditorOpen}
        item={editingPatrimoine}
        onClose={() => {
          setPatrimoineEditorOpen(false);
          setEditingPatrimoine(null);
        }}
        onSave={(i) => {
          upsertPatrimoine(i);
          setPatrimoineEditorOpen(false);
          setEditingPatrimoine(null);
        }}
        onDelete={
          editingPatrimoine
            ? () => {
                deletePatrimoine(editingPatrimoine.id);
                setPatrimoineEditorOpen(false);
                setEditingPatrimoine(null);
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

  tabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: SURFACE_2,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: SURFACE },
  tabText: { color: TEXT_2, fontSize: 13, fontWeight: "500" },
  tabTextActive: { color: TEXT_1, fontWeight: "700" },

  totalCard: {
    padding: 20,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
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
  totalMeta: { color: TEXT_2, fontSize: 12, marginTop: 8 },
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
  },

  listContent: { padding: 20, paddingBottom: 100 },
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
  goalMeta: { color: TEXT_3, fontSize: 12, marginTop: 2 },
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

  badge: {
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: { color: TEXT_2, fontSize: 12, fontWeight: "600" },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  groupTitle: {
    color: TEXT_2,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  groupTotal: {
    color: TEXT_1,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: MONO_FONT,
  },

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
