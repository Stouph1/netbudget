import * as Crypto from "expo-crypto";
// Modal d'édition/création d'un objectif d'épargne S1.
// Design : sheet bas d'écran avec inputs simples. Validation minimale.

import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
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
import { confirmDialog } from "../../../src/utils/notify";
import type { SavingsGoal } from "../../../src/types/premium";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const MINT = "#10B981";
const GOLD = "#4ADE80";
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
  const { t } = useLang();
  const insets = useSafeAreaInsets();

  // Track keyboard height pour cap la hauteur du sheet dynamiquement.
  // KeyboardAvoidingView poussait le sheet au-dessus de la status bar quand
  // le clavier ouvrait — on gère à la main : sheet MAX = screen - safeArea - keyboard.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
      Alert.alert(
        t("goals.err.nameMissing.title"),
        t("goals.err.nameMissing.msg"),
      );
      return;
    }
    const targetNum = parseAmount(target);
    if (targetNum <= 0) {
      Alert.alert(t("goals.err.target.title"), t("goals.err.target.msg"));
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
            { maxHeight: maxSheetHeight, marginBottom: keyboardHeight },
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

            <Text style={styles.label}>{t("goals.field.target")}</Text>
            <TextInput
              style={styles.input}
              value={target}
              onChangeText={setTarget}
              placeholder="5000"
              placeholderTextColor={TEXT_3}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>{t("goals.field.current")}</Text>
            <TextInput
              style={styles.input}
              value={current}
              onChangeText={setCurrent}
              placeholder="0"
              placeholderTextColor={TEXT_3}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>{t("goals.field.monthly")}</Text>
            <TextInput
              style={styles.input}
              value={monthly}
              onChangeText={setMonthly}
              placeholder="200"
              placeholderTextColor={TEXT_3}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>{t("goals.field.priority")}</Text>
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

            <Text style={styles.label}>{t("goals.field.deadline")}</Text>
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
                <Text style={styles.label}>{t("goals.field.extraP")}</Text>
                <Text style={styles.helper}>{t("goals.extraP.hint")}</Text>
              </View>
              <Switch
                value={extraP}
                onValueChange={setExtraP}
                trackColor={{ false: BORDER, true: MINT }}
                thumbColor="#fff"
                ios_backgroundColor={BORDER}
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

const styles = StyleSheet.create({
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
