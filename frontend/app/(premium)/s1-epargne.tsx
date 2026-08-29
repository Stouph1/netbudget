// S1 — Épargne (Objectifs uniquement).
// Storage : encrypted_payloads via premiumStore (encryption stub Phase 3).

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import DonutChart, { type DonutSegment } from "../../src/components/DonutChart";
import ScopeSwitcher from "../../src/components/ScopeSwitcher";
import { useLang } from "../../src/contexts/LangContext";
import { useCurrency } from "../../src/contexts/CurrencyContext";
import { useSession } from "../../src/contexts/SessionContext";
import { notify } from "../../src/utils/notify";
import type { Lang } from "../../src/i18n/translations";
import { useActiveScope } from "../../src/hooks/useActiveScope";
import { loadS1, saveS1 } from "../../src/lib/premiumStore";
import {
  EMPTY_S1_PAYLOAD,
  type S1Payload,
  type SavingsGoal,
} from "../../src/types/premium";
import GoalEditor from "./_components/GoalEditor";
import { PaywallSheet } from "../../src/components/PaywallSheet";
import { usePaywall } from "../../src/hooks/usePaywall";
import { remainingGoals } from "../../src/lib/entitlements";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
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

// Locale d'affichage des dates, dérivée de la langue de l'app.
const DATE_LOCALES: Record<Lang, string> = {
  fr: "fr-FR",
  en: "en-GB",
  es: "es-ES",
  pt: "pt-PT",
  de: "de-DE",
  it: "it-IT",
  ar: "ar",
  ja: "ja-JP",
};

function progressPct(goal: SavingsGoal): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
}

// Conseil temporel : combien verser par mois pour tenir l'échéance,
// et alerte si le versement prévu ne suffit pas / si l'échéance est dépassée.
function goalPlan(
  goal: SavingsGoal,
  lang: Lang,
  t: (key: string) => string,
  tp: (key: string, params: Record<string, string | number>) => string,
): { text: string; tone: "ok" | "late" } | null {
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return { text: t("goals.plan.done"), tone: "ok" };

  const monthLabel = (d: Date) =>
    d.toLocaleDateString(DATE_LOCALES[lang], {
      month: "long",
      year: "numeric",
    });
  const euro = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  if (goal.targetDate) {
    const monthsLeft =
      (new Date(goal.targetDate).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24 * 30.44);
    const dateStr = monthLabel(new Date(goal.targetDate));
    if (monthsLeft <= 0.25) {
      return {
        text: tp("goals.plan.late", { amount: euro(remaining) }),
        tone: "late",
      };
    }
    const required = remaining / monthsLeft;
    if (goal.monthlyContribution && goal.monthlyContribution > 0) {
      if (goal.monthlyContribution >= required) {
        return {
          text: tp("goals.plan.onTrack", {
            amount: euro(goal.monthlyContribution),
            date: dateStr,
          }),
          tone: "ok",
        };
      }
      return {
        text: tp("goals.plan.short", {
          required: euro(required),
          date: dateStr,
          planned: euro(goal.monthlyContribution),
        }),
        tone: "late",
      };
    }
    return {
      text: tp("goals.plan.needed", { amount: euro(required), date: dateStr }),
      tone: "ok",
    };
  }

  if (goal.monthlyContribution && goal.monthlyContribution > 0) {
    const months = remaining / goal.monthlyContribution;
    const eta = new Date(Date.now() + months * 30.44 * 24 * 60 * 60 * 1000);
    return {
      text: tp("goals.plan.eta", {
        amount: euro(goal.monthlyContribution),
        date: monthLabel(eta),
      }),
      tone: "ok",
    };
  }
  return null;
}

export default function S1Epargne() {
  const { lang, t, tp } = useLang();
  // Devise active (le « € » était codé en dur : changer de devise n'avait
  // aucun effet sur cet écran).
  const { fmt: formatEuro, currency } = useCurrency();
  const { user, loading: sessionLoading } = useSession();
  const paywall = usePaywall();
  const {
    workspaceId,
    scopeLabel,
    scopeLabelIsKey,
    loading: scopeLoading,
  } = useActiveScope();
  // Le scope perso renvoie une CLÉ i18n, un espace nommé renvoie son nom.
  const resolvedScopeLabel = scopeLabelIsKey ? t(scopeLabel) : scopeLabel;
  const [payload, setPayload] = useState<S1Payload>(EMPTY_S1_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  useEffect(() => {
    if (!user?.id || scopeLoading) {
      if (!user?.id) setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const loaded = await loadS1(user.id, workspaceId, currency);
      setPayload(loaded);
      setLoading(false);
    })();
  }, [user?.id, workspaceId, scopeLoading]);

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
      const result = await saveS1(user.id, next, workspaceId, currency);
      if (!result.ok) {
        notify(
          t("goals.sync.title"),
          tp("goals.sync.msg", {
            error: result.error ?? t("common.unknownError"),
          }),
        );
      }
    },
    [user?.id, workspaceId, t, tp],
  );

  // Objectifs ACTIFS uniquement : un objectif atteint puis archivé ne doit pas
  // continuer d'occuper une place, sinon la limite devient « nombre
  // d'objectifs que tu auras eus dans ta vie ».
  const activeGoalCount = payload.goals.filter((g) => !g.extraP).length;

  const goalsLeft = remainingGoals(paywall.tier, activeGoalCount);

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

  if (sessionLoading || scopeLoading || loading) {
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
          <Text style={styles.emptyTitle}>{t("common.premiumRequired")}</Text>
          <Text style={styles.emptyBody}>{t("goals.premiumBody")}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.emptyBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>{t("common.back")}</Text>
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
        <Text style={styles.title}>{t("goals.title")}</Text>
        <TouchableOpacity
          onPress={() =>
            router.navigate({
              pathname: "/",
              params: { tab: "premium" },
            } as never)
          }
          hitSlop={10}
        >
          <Feather name="home" size={20} color={TEXT_2} />
        </TouchableOpacity>
      </View>

      {/* Badge de scope — tape pour changer de workspace sans quitter S1 */}
      <TouchableOpacity
        style={styles.scopeBadge}
        onPress={() => setSwitcherOpen(true)}
        activeOpacity={0.8}
      >
        <Feather name={workspaceId ? "users" : "user"} size={13} color={GOLD} />
        <Text style={styles.scopeBadgeText}>{resolvedScopeLabel}</Text>
        <Feather name="chevron-down" size={13} color={TEXT_3} />
      </TouchableOpacity>

      <ScopeSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
      />

      {/* Ce qui reste, ANNONCÉ. Découvrir une limite au moment où on se la
          prend donne le sentiment d'un piège ; la voir avant est une
          information. On ne l'affiche que s'il y a une limite. */}
      {goalsLeft !== null ? (
        <TouchableOpacity
          style={styles.quotaRow}
          onPress={() => router.push("/plans" as never)}
          activeOpacity={goalsLeft === 0 ? 0.7 : 1}
          disabled={goalsLeft > 0}
        >
          <Feather
            name={goalsLeft === 0 ? "lock" : "target"}
            size={12}
            color={goalsLeft === 0 ? GOLD : TEXT_3}
          />
          <Text style={[styles.quotaText, goalsLeft === 0 && { color: GOLD }]}>
            {goalsLeft === 0
              ? t("goals.quota.full")
              : tp(goalsLeft > 1 ? "goals.quota.left" : "goals.quota.leftOne", {
                  n: goalsLeft,
                })}
          </Text>
        </TouchableOpacity>
      ) : null}

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
              {tp(
                totals.count > 1
                  ? "goals.donutMeta.many"
                  : "goals.donutMeta.one",
                { total: formatEuro(totals.target), count: totals.count },
              )}
            </Text>
          </View>
        ) : (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>{t("goals.totalLabel")}</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalCurrent}>
                {formatEuro(totals.current)}
              </Text>
              <Text style={styles.totalTarget}>
                / {formatEuro(totals.target)}
              </Text>
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
            <Text style={styles.emptyTitle}>{t("goals.empty.title")}</Text>
            <Text style={styles.emptyBody}>{t("goals.empty.body")}</Text>
          </View>
        ) : (
          // Urgents d'abord, optionnels en dernier — puis ordre d'origine
          [...payload.goals]
            .map((g, i) => ({ g, i }))
            .sort((a, b) => {
              const rank = { urgent: 0, normal: 1, optional: 2 } as const;
              const ra = rank[a.g.priority ?? "normal"];
              const rb = rank[b.g.priority ?? "normal"];
              return ra !== rb ? ra - rb : a.i - b.i;
            })
            .map(({ g: item, i }) => {
              const color =
                item.color ?? SEGMENT_COLORS[i % SEGMENT_COLORS.length];
              const plan = goalPlan(item, lang, t, tp);
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
                    <View
                      style={[styles.colorDot, { backgroundColor: color }]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalLabel}>{item.label}</Text>
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        {item.priority === "urgent" ? (
                          <Text
                            style={[styles.priorityTag, styles.priorityUrgent]}
                          >
                            {t("goals.tag.urgent")}
                          </Text>
                        ) : null}
                        {item.priority === "optional" ? (
                          <Text
                            style={[
                              styles.priorityTag,
                              styles.priorityOptional,
                            ]}
                          >
                            {t("goals.tag.optional")}
                          </Text>
                        ) : null}
                        {item.extraP ? (
                          <Text style={styles.extraPTag}>
                            {t("goals.tag.extraP")}
                          </Text>
                        ) : null}
                      </View>
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
                        {
                          width: `${progressPct(item)}%`,
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>
                  {plan ? (
                    <View style={styles.goalPlanRow}>
                      <Feather
                        name={
                          plan.tone === "late" ? "alert-circle" : "calendar"
                        }
                        size={13}
                        color={plan.tone === "late" ? "#F87171" : TEXT_3}
                      />
                      <Text
                        style={[
                          styles.goalPlanText,
                          plan.tone === "late" && { color: "#F87171" },
                        ]}
                      >
                        {plan.text}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          // On demande AVANT d'ouvrir l'éditeur. Laisser remplir un formulaire
          // pour refuser à l'enregistrement est la pire des séquences : le
          // travail est perdu et le refus paraît arbitraire.
          if (
            !paywall.require({ feature: "goal", currentCount: activeGoalCount })
          ) {
            return;
          }
          setEditingGoal(null);
          setEditorOpen(true);
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color="#000" />
      </TouchableOpacity>

      <PaywallSheet
        visible={paywall.visible}
        reason={paywall.reason}
        onClose={paywall.close}
      />

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
  quotaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    marginBottom: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  quotaText: { color: TEXT_3, fontSize: 11.5, fontWeight: "600" },
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "600" },

  scopeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
  },
  scopeBadgeText: { color: GOLD, fontSize: 12, fontWeight: "700" },

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
  totalMeta: {
    color: TEXT_2,
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
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
  priorityTag: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priorityUrgent: { color: "#F87171" },
  priorityOptional: { color: TEXT_3 },
  goalPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  goalPlanText: { color: TEXT_2, fontSize: 12, lineHeight: 17, flex: 1 },
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
