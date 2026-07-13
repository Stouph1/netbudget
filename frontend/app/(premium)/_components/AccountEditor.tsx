// Modal d'édition/création d'un compte (Livret A, PEA, AV, etc.).

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
import type { Account, AccountKind } from "../../../src/types/premium";

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
  account: Account | null;
  onClose: () => void;
  onSave: (a: Account) => void;
  onDelete?: () => void;
};

const ACCOUNT_KINDS: { value: AccountKind; label: string; defaultRate?: number; defaultCeiling?: number }[] = [
  { value: "livret_a", label: "Livret A", defaultRate: 1.5, defaultCeiling: 22950 },
  { value: "ldds", label: "LDDS", defaultRate: 1.5, defaultCeiling: 12000 },
  { value: "lep", label: "LEP", defaultRate: 2.5, defaultCeiling: 10000 },
  { value: "pea", label: "PEA", defaultCeiling: 150000 },
  { value: "pea_pme", label: "PEA-PME" },
  { value: "cto", label: "Compte titres" },
  { value: "assurance_vie", label: "Assurance-vie" },
  { value: "per", label: "PER" },
  { value: "pel", label: "PEL" },
  { value: "cel", label: "CEL" },
  { value: "livret_bancaire", label: "Livret bancaire" },
  { value: "compte_courant", label: "Compte courant" },
  { value: "espèces", label: "Espèces" },
  { value: "crypto", label: "Crypto" },
  { value: "immobilier", label: "Immobilier" },
  { value: "autre", label: "Autre" },
];

function genId(): string {
  return `a_${Math.floor(1000 + (globalThis.performance?.now?.() ?? 0) * 1000)}`;
}

export default function AccountEditor({
  visible,
  account,
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

  const [kind, setKind] = useState<AccountKind>("livret_a");
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (visible) {
      setKind(account?.kind ?? "livret_a");
      setLabel(account?.label ?? "");
    }
  }, [visible, account]);

  function submit() {
    if (!label.trim()) {
      Alert.alert("Nom manquant", "Donne un nom à ton compte (ex: Livret A Boursorama).");
      return;
    }
    const meta = ACCOUNT_KINDS.find((k) => k.value === kind);
    const now = new Date().toISOString();
    const merged: Account = {
      id: account?.id ?? genId(),
      kind,
      label: label.trim(),
      currency: account?.currency ?? "EUR",
      interestRate: account?.interestRate ?? meta?.defaultRate,
      ceiling: account?.ceiling ?? meta?.defaultCeiling,
      createdAt: account?.createdAt ?? now,
    };
    onSave(merged);
  }

  function confirmDelete() {
    if (!onDelete) return;
    Alert.alert("Supprimer le compte", "Les objectifs liés perdront le lien.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: onDelete },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
              {account ? "Modifier le compte" : "Nouveau compte"}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Type de compte</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {ACCOUNT_KINDS.map((k) => {
                const active = k.value === kind;
                return (
                  <TouchableOpacity
                    key={k.value}
                    onPress={() => setKind(k.value)}
                    style={[styles.chip, active && styles.chipActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {k.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Nom du compte</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Livret A Crédit Agricole"
              placeholderTextColor={TEXT_3}
              autoFocus={!account}
            />

            <View style={styles.actions}>
              {onDelete ? (
                <TouchableOpacity onPress={confirmDelete} style={styles.btnDelete} activeOpacity={0.85}>
                  <Feather name="trash-2" size={18} color="#fff" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={submit} style={styles.btnSave} activeOpacity={0.85}>
                <Text style={styles.btnSaveText}>
                  {account ? "Enregistrer" : "Créer le compte"}
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
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 8,
  },
  chipActive: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: TEXT_2, fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: "#000", fontWeight: "700" },
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
