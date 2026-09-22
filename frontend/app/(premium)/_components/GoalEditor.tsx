import { useAccent } from "../../../src/contexts/ThemeContext";
import * as Crypto from "expo-crypto";
// Modal d'édition/création d'un objectif d'épargne S1.
// Design : sheet bas d'écran avec inputs simples. Validation minimale.

import { Feather } from "@expo/vector-icons";
import { useEffect, useState, useMemo } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "../../../src/contexts/LangContext";
import { InfoTip } from "../../../src/components/InfoTip";
import { confirmDialog, notify } from "../../../src/utils/notify";
import type { SavingsGoal } from "../../../src/types/premium";
import { useKeyboardLift, useSheetBottom } from "../../../src/hooks/useSheetBottom";
import { switchStyle } from "../../../src/theme/controls";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const MINT = "#10B981";
const DANGER = "#DC2626";
const BORDER = "rgba(255,255,255,0.08)";

type Props = {
  visible: boolean;
  goal: SavingsGoal | null;
  onClose: () => void;
  onSave: (g: SavingsGoal) => void;
  onDelete?: () => void;
};

function genId(): string {
  // UUID : deux membres d'un même workspace créant un objectif en même temps
  // généraient le même id dérivé de performance.now() → écrasement silencieux.
  return `g_${Crypto.randomUUID()}`;
}

function parseAmount(s: string): number {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export default function GoalEditor({
  visible,
  goal,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const GOLD = useAccent().main;
  const styles = useMemo(() => makeStyles(GOLD), [GOLD]);
  const { t } = useLang();
  const sheetBottom = useSheetBottom(36);
  const insets = useSafeAreaInsets();

  // Hauteur du clavier, mesurée par la position de son bord haut : voir
  // useKeyboardLift. Le sheet flotte au-dessus et se borne à ce qui reste.
  const keyboardHeight = useKeyboardLift();

  const screenH = Dimensions.get("window").height;
  const maxSheetHeight = screenH - insets.top - 12 - keyboardHeight;

  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [monthly, setMonthly] = useState("");
  const [extraP, setExtraP] = useState(false);
  const [priority, setPriority] = useState<SavingsGoal["priority"]>("normal");
  // Échéance en mois (undefined = pas d'échéance) → convertie en targetDate
  const [horizon, setHorizon] = useState<number | undefined>(undefined);

  // Retrouve le chip d'échéance le plus proche depuis une targetDate existante
  function horizonFromDate(iso?: string): number | undefined {
    if (!iso) return undefined;
    const months =
      (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
    if (months <= 0) return 3;
    const options = [3, 6, 12, 24, 36];
    return options.reduce((best, o) =>
      Math.abs(o - months) < Math.abs(best - months) ? o : best,
    );
  }

  useEffect(() => {
    if (visible) {
      setLabel(goal?.label ?? "");
      setTarget(goal?.targetAmount ? String(goal.targetAmount) : "");
      setCurrent(goal?.currentAmount ? String(goal.currentAmount) : "");
      setMonthly(
        goal?.monthlyContribution ? String(goal.monthlyContribution) : "",
      );
      setExtraP(goal?.extraP ?? false);
      setPriority(goal?.priority ?? "normal");
      setHorizon(horizonFromDate(goal?.targetDate));
    }
  }, [visible, goal]);

  function submit() {
    if (!label.trim()) {
      notify(
        t("goals.err.nameMissing.title"),
        t("goals.err.nameMissing.msg"),
      );
      return;
    }
    const targetNum = parseAmount(target);
    if (targetNum <= 0) {
      notify(t("goals.err.target.title"), t("goals.err.target.msg"));
      return;
    }
    const now = new Date().toISOString();
    // Échéance choisie en mois → date butoir ISO
    const targetDate = horizon
      ? new Date(Date.now() + horizon * 30.44 * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    const merged: SavingsGoal = {
      id: goal?.id ?? genId(),
      label: label.trim(),
      targetAmount: targetNum,
      currentAmount: Math.max(0, parseAmount(current)),
      monthlyContribution: monthly ? parseAmount(monthly) : undefined,
      extraP,
      targetDate,
      priority,
      color: goal?.color,
      createdAt: goal?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(merged);
  }

  function confirmDelete() {
    if (!onDelete) return;
    // confirmDialog : Alert.alert à boutons est muet sur le web.
    confirmDialog(
      t("goals.delete.title"),
      t("goals.delete.msg"),
      t("btn.delete"),
      onDelete,
      { cancelLabel: t("btn.cancel"), destructive: true },
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { maxHeight: maxSheetHeight, marginBottom: keyboardHeight, paddingBottom: sheetBottom },
          ]}
        >
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>
                {goal ? t("goals.editor.edit") : t("goals.editor.new")}
              </Text>
              <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common.close")} onPress={onClose} hitSlop={10}>
                <Feather name="x" size={22} color={TEXT_2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.label}>{t("goals.field.name")}</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder={t("goals.name.placeholder")}
              placeholderTextColor={TEXT_3}
              autoFocus={!goal}
            />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.label}>{t("goals.field.target")}</Text>
              <InfoTip title={t("help.goalTarget.title")} body={t("help.goalTarget.body")} />
            </View>
            <TextInput
              style={styles.input}
              value={target}
              onChangeText={setTarget}
              placeholder="5000"
              placeholderTextColor={TEXT_3}
              keyboardType="decimal-pad"
            />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.label}>{t("goals.field.current")}</Text>
              <InfoTip title={t("help.goalCurrent.title")} body={t("help.goalCurrent.body")} />
            </View>
            <TextInput
              style={styles.input}
              value={current}
              onChangeText={setCurrent}
              placeholder="0"
              placeholderTextColor={TEXT_3}
              keyboardType="decimal-pad"
            />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.label}>{t("goals.field.monthly")}</Text>
              <InfoTip title={t("help.goalMonthly.title")} body={t("help.goalMonthly.body")} />
            </View>
            <TextInput
              style={styles.input}
              value={monthly}
              onChangeText={setMonthly}
              placeholder="200"
              placeholderTextColor={TEXT_3}
              keyboardType="decimal-pad"
            />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.label}>{t("goals.field.priority")}</Text>
              <InfoTip title={t("help.goalPriority.title")} body={t("help.goalPriority.body")} />
            </View>
            <View style={styles.chipsRow}>
              {(
                [
                  ["urgent", t("goals.tag.urgent"), "#F87171"],
                  ["normal", t("goals.tag.normal"), GOLD],
                  ["optional", t("goals.tag.optional"), "#94A3B8"],
                ] as const
              ).map(([value, lbl, color]) => {
                const active = priority === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setPriority(value)}
                    style={[
                      styles.chip,
                      active && { backgroundColor: color, borderColor: color },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.label}>{t("goals.field.deadline")}</Text>
              <InfoTip title={t("help.goalDeadline.title")} body={t("help.goalDeadline.body")} />
            </View>
            <Text style={styles.helper}>{t("goals.deadline.hint")}</Text>
            <View style={styles.chipsRow}>
              {(
                [
                  [undefined, t("goals.deadline.none")],
                  [3, t("goals.deadline.m3")],
                  [6, t("goals.deadline.m6")],
                  [12, t("goals.deadline.y1")],
                  [24, t("goals.deadline.y2")],
                  [36, t("goals.deadline.y3")],
                ] as const
              ).map(([value, lbl]) => {
                const active = horizon === value;
                return (
                  <TouchableOpacity
                    key={String(value)}
                    onPress={() => setHorizon(value)}
                    style={[styles.chip, active && styles.chipActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.label}>{t("goals.field.extraP")}</Text>
                  <InfoTip title={t("help.goalExtraP.title")} body={t("help.goalExtraP.body")} />
                </View>
                <Text style={styles.helper}>{t("goals.extraP.hint")}</Text>
              </View>
              <Switch
                value={extraP}
                onValueChange={setExtraP}
                trackColor={{ false: BORDER, true: MINT }}
                thumbColor="#fff"
                ios_backgroundColor={BORDER}
                style={switchStyle}
              />
            </View>

            <View style={styles.actions}>
              {onDelete ? (
                <TouchableOpacity
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t("btn.delete")}
                  onPress={confirmDelete}
                  style={styles.btnDelete}
                  activeOpacity={0.85}
                >
                  <Feather name="trash-2" size={18} color="#fff" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={submit}
                style={styles.btnSave}
                activeOpacity={0.85}
              >
                <Text style={styles.btnSaveText}>
                  {goal ? t("btn.save") : t("goals.create")}
                </Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (GOLD: string) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: MIDNIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: BORDER,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: BORDER,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "600" },
  label: {
    color: TEXT_2,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: SURFACE,
    color: TEXT_1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  helper: { color: TEXT_3, fontSize: 12, marginTop: 4 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: TEXT_2, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#000", fontWeight: "700" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
  btnSave: {
    flex: 1,
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnSaveText: { color: "#000", fontSize: 15, fontWeight: "600" },
  btnDelete: {
    width: 52,
    height: 52,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: DANGER,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  });
