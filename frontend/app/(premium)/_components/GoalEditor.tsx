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
import type { SavingsGoal } from "../../../src/types/premium";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#64748B";
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
  return `g_${Math.floor(1000 + (globalThis.performance?.now?.() ?? 0) * 1000)}`;
}

function parseAmount(s: string): number {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export default function GoalEditor({
  visible,
  goal,
  onClose,
  onSave,
  onDelete,
}: Props) {
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

  useEffect(() => {
    if (visible) {
      setLabel(goal?.label ?? "");
      setTarget(goal?.targetAmount ? String(goal.targetAmount) : "");
      setCurrent(goal?.currentAmount ? String(goal.currentAmount) : "");
      setMonthly(
        goal?.monthlyContribution ? String(goal.monthlyContribution) : "",
      );
      setExtraP(goal?.extraP ?? false);
    }
  }, [visible, goal]);

  function submit() {
    if (!label.trim()) {
      Alert.alert("Nom manquant", "Donne un nom à ton objectif.");
      return;
    }
    const targetNum = parseAmount(target);
    if (targetNum <= 0) {
      Alert.alert("Montant cible", "Le montant cible doit être supérieur à 0.");
      return;
    }
    const now = new Date().toISOString();
    const merged: SavingsGoal = {
      id: goal?.id ?? genId(),
      label: label.trim(),
      targetAmount: targetNum,
      currentAmount: Math.max(0, parseAmount(current)),
      monthlyContribution: monthly ? parseAmount(monthly) : undefined,
      extraP,
      accountId: goal?.accountId,
      targetDate: goal?.targetDate,
      color: goal?.color,
      createdAt: goal?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(merged);
  }

  function confirmDelete() {
    if (!onDelete) return;
    Alert.alert(
      "Supprimer l'objectif",
      "Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: onDelete },
      ],
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
                {goal ? "Modifier l'objectif" : "Nouvel objectif"}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Feather name="x" size={22} color={TEXT_2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Voyage Japon, Apport maison…"
              placeholderTextColor={TEXT_3}
              autoFocus={!goal}
            />

            <Text style={styles.label}>Montant cible (€)</Text>
            <TextInput
              style={styles.input}
              value={target}
              onChangeText={setTarget}
              placeholder="5000"
              placeholderTextColor={TEXT_3}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Déjà épargné (€)</Text>
            <TextInput
              style={styles.input}
              value={current}
              onChangeText={setCurrent}
              placeholder="0"
              placeholderTextColor={TEXT_3}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Versement mensuel prévu (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={monthly}
              onChangeText={setMonthly}
              placeholder="200"
              placeholderTextColor={TEXT_3}
              keyboardType="decimal-pad"
            />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Extra-budgétaire (ExtraP)</Text>
                <Text style={styles.helper}>
                  N'entre pas dans le total global (ex: cadeau exceptionnel).
                </Text>
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
                  {goal ? "Enregistrer" : "Créer l'objectif"}
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
