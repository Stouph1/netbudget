// Modal d'édition/création d'un bien patrimonial (foncier, objets, équipement, autres).

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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  PatrimoineCategory,
  PatrimoineItem,
} from "../../../src/types/premium";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#64748B";
const GOLD = "#4ADE80";
const DANGER = "#DC2626";
const BORDER = "rgba(255,255,255,0.08)";

type Props = {
  visible: boolean;
  item: PatrimoineItem | null;
  onClose: () => void;
  onSave: (i: PatrimoineItem) => void;
  onDelete?: () => void;
};

const CATEGORIES: { value: PatrimoineCategory; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "foncier", label: "Foncier", icon: "home" },
  { value: "objets", label: "Objets", icon: "gift" },
  { value: "equipement", label: "Équipement", icon: "tool" },
  { value: "autres", label: "Autres", icon: "more-horizontal" },
];

function genId(): string {
  return `p_${Math.floor(1000 + (globalThis.performance?.now?.() ?? 0) * 1000)}`;
}

function parseAmount(s: string): number {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export default function PatrimoineEditor({
  visible,
  item,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const maxSheetHeight =
    Dimensions.get("window").height - insets.top - 12 - keyboardHeight;

  const [category, setCategory] = useState<PatrimoineCategory>("foncier");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (visible) {
      setCategory(item?.category ?? "foncier");
      setLabel(item?.label ?? "");
      setValue(item?.estimatedValue ? String(item.estimatedValue) : "");
      setNotes(item?.notes ?? "");
    }
  }, [visible, item]);

  function submit() {
    if (!label.trim()) {
      Alert.alert("Nom manquant", "Donne un nom au bien (ex: Appartement Paris 15e).");
      return;
    }
    const valueNum = parseAmount(value);
    if (valueNum <= 0) {
      Alert.alert("Valeur", "La valeur estimée doit être supérieure à 0.");
      return;
    }
    const now = new Date().toISOString();
    const merged: PatrimoineItem = {
      id: item?.id ?? genId(),
      label: label.trim(),
      category,
      estimatedValue: valueNum,
      currency: item?.currency ?? "EUR",
      acquiredAt: item?.acquiredAt,
      notes: notes.trim() || undefined,
      createdAt: item?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(merged);
  }

  function confirmDelete() {
    if (!onDelete) return;
    Alert.alert("Supprimer ce bien", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: onDelete },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight: maxSheetHeight, marginBottom: keyboardHeight }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {item ? "Modifier le bien" : "Nouveau bien"}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Catégorie</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((c) => {
                const active = c.value === category;
                return (
                  <TouchableOpacity
                    key={c.value}
                    onPress={() => setCategory(c.value)}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    activeOpacity={0.85}
                  >
                    <Feather name={c.icon} size={16} color={active ? "#000" : TEXT_2} />
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Nom du bien</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Appartement Paris 15e, Voiture, ..."
              placeholderTextColor={TEXT_3}
              autoFocus={!item}
            />

            <Text style={styles.label}>Valeur estimée (€)</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              placeholder="250000"
              placeholderTextColor={TEXT_3}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Notes (optionnel)</Text>
            <TextInput
              style={[styles.input, { height: 72, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Détails, année d'acquisition..."
              placeholderTextColor={TEXT_3}
              multiline
            />

            <View style={styles.actions}>
              {onDelete ? (
                <TouchableOpacity onPress={confirmDelete} style={styles.btnDelete} activeOpacity={0.85}>
                  <Feather name="trash-2" size={18} color="#fff" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={submit} style={styles.btnSave} activeOpacity={0.85}>
                <Text style={styles.btnSaveText}>
                  {item ? "Enregistrer" : "Ajouter au patrimoine"}
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
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
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
  categoryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryChipActive: { backgroundColor: GOLD, borderColor: GOLD },
  categoryText: { color: TEXT_2, fontSize: 13, fontWeight: "500" },
  categoryTextActive: { color: "#000", fontWeight: "700" },
  actions: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24 },
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
