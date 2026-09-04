// Anniversaires suivis (enfants, animaux) : le jour J, la fête de cartes se
// déclenche pour eux aussi. Gestion : ajout / suppression.

import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { goBack } from "../../src/lib/nav";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLang } from "../../src/contexts/LangContext";
import { useSession } from "../../src/contexts/SessionContext";
import {
  loadCelebrations,
  saveCelebrations,
  type CelebrationPerson,
} from "../../src/lib/premiumStore";
import { dateToIso, isoToInput, parseBirthdate } from "../../src/utils/birthday";
import { notify } from "../../src/utils/notify";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

export default function Celebrations() {
  const { t } = useLang();
  const { user, loading: sessionLoading } = useSession();
  const [list, setList] = useState<CelebrationPerson[] | null>(null);
  const [kind, setKind] = useState<"child" | "pet">("child");
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat" | "other">("dog");

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let cancelled = false;
      loadCelebrations(user.id).then((l) => {
        if (!cancelled) setList(l);
      });
      return () => {
        cancelled = true;
      };
    }, [user?.id]),
  );

  async function add() {
    if (!user?.id) return;
    if (!name.trim()) {
      notify(t("celeb.name.required"), t("celeb.name.requiredHint"));
      return;
    }
    // minAge 0 : un bébé né hier ou un chaton de 3 mois sont valides
    const bd = parseBirthdate(birth, { minAge: 0, maxAge: kind === "pet" ? 40 : 110 });
    if (!bd) {
      notify(t("celeb.date.invalid"), t("celeb.date.invalidHint"));
      return;
    }
    const item: CelebrationPerson = {
      id: `${kind}-${Date.now()}`,
      kind,
      name: name.trim(),
      birthdate: dateToIso(bd),
      ...(kind === "pet" ? { species } : {}),
    };
    const next = [...(list ?? []), item];
    setList(next);
    setName("");
    setBirth("");
    await saveCelebrations(user.id, next);
  }

  async function remove(id: string) {
    if (!user?.id) return;
    const next = (list ?? []).filter((x) => x.id !== id);
    setList(next);
    await saveCelebrations(user.id, next);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("celeb.title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      {sessionLoading || list === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          <Text style={styles.intro}>{t("celeb.intro")}</Text>

          {/* Formulaire d'ajout */}
          <View style={styles.form}>
            <View style={styles.switchRow}>
              {(
                [
                  ["child", "celeb.kind.child"],
                  ["pet", "celeb.kind.pet"],
                ] as const
              ).map(([k, lblKey]) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setKind(k)}
                  style={[styles.switchBtn, kind === k && styles.switchBtnActive]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.switchText, kind === k && styles.switchTextActive]}>
                    {t(lblKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={
                kind === "child"
                  ? t("celeb.placeholder.childName")
                  : t("celeb.placeholder.petName")
              }
              placeholderTextColor={TEXT_3}
            />
            <TextInput
              style={styles.input}
              value={birth}
              onChangeText={setBirth}
              placeholder={t("celeb.placeholder.birthdate")}
              placeholderTextColor={TEXT_3}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            {kind === "pet" ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(
                  [
                    ["dog", "celeb.species.dog"],
                    ["cat", "celeb.species.cat"],
                    ["other", "celeb.species.other"],
                  ] as const
                ).map(([sp, lblKey]) => (
                  <TouchableOpacity
                    key={sp}
                    onPress={() => setSpecies(sp)}
                    style={[styles.chip, species === sp && styles.chipActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, species === sp && styles.chipTextActive]}>
                      {t(lblKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <TouchableOpacity style={styles.addBtn} onPress={add} activeOpacity={0.85}>
              <Feather name="plus" size={18} color="#000" />
              <Text style={styles.addBtnText}>{t("celeb.add")}</Text>
            </TouchableOpacity>
          </View>

          {/* Liste */}
          {list.length === 0 ? (
            <Text style={styles.empty}>{t("celeb.empty")}</Text>
          ) : (
            list.map((p) => (
              <View key={p.id} style={styles.row}>
                <Text style={{ fontSize: 22 }}>
                  {p.kind === "child" ? "👶" : p.species === "cat" ? "🐱" : p.species === "dog" ? "🐶" : "🐾"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{p.name}</Text>
                  <Text style={styles.rowMeta}>{isoToInput(p.birthdate)}</Text>
                </View>
                <TouchableOpacity onPress={() => remove(p.id)} hitSlop={10}>
                  <Feather name="trash-2" size={16} color={TEXT_3} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  intro: { color: TEXT_2, fontSize: 13, lineHeight: 20, marginBottom: 18 },
  form: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 10,
    marginBottom: 22,
  },
  switchRow: {
    flexDirection: "row",
    backgroundColor: MIDNIGHT,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 4,
  },
  switchBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  switchBtnActive: { backgroundColor: GOLD },
  switchText: { color: TEXT_2, fontSize: 13, fontWeight: "600" },
  switchTextActive: { color: "#000", fontWeight: "700" },
  input: {
    backgroundColor: MIDNIGHT,
    color: TEXT_1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: MIDNIGHT,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  chipActive: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: TEXT_2, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#000", fontWeight: "700" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
    borderRadius: 11,
    paddingVertical: 12,
  },
  addBtnText: { color: "#000", fontSize: 14, fontWeight: "700" },
  empty: { color: TEXT_3, fontSize: 13, textAlign: "center", marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },
  rowName: { color: TEXT_1, fontSize: 15, fontWeight: "600" },
  rowMeta: { color: TEXT_3, fontSize: 12, marginTop: 2 },
});
