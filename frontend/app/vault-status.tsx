// Coffre actif : ce qu'on peut encore faire.
//
// Cet écran existe pour une raison précise : une fois le chiffrement activé,
// l'utilisateur n'a plus rien à régler, mais il a besoin de deux garanties.
// Savoir que c'est bien en service — et pouvoir le VÉRIFIER lui-même par
// l'empreinte, plutôt que de nous croire. Et savoir quoi faire s'il change de
// téléphone.
//
// Ce qu'on ne propose PAS : désactiver le chiffrement. Ce serait déchiffrer
// toutes les données et les réécrire en clair, c'est-à-dire annuler la
// promesse sur un simple appui. Qui veut revenir en arrière supprime son
// compte — c'est plus brutal, et beaucoup plus clair.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLang } from "../src/contexts/LangContext";
import { useSession } from "../src/contexts/SessionContext";
import { keyPersistsOnThisDevice } from "../src/lib/crypto/keystore";
import { remoteFingerprint } from "../src/lib/crypto/vault";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

export default function VaultStatus() {
  const { t } = useLang();
  const { user } = useSession();
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    remoteFingerprint(user.id)
      .then((f) => {
        if (alive) setFingerprint(f);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={s.title}>{t("vault.title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={s.okBox}>
          <Feather name="shield" size={22} color={GOLD} />
          <View style={{ flex: 1 }}>
            <Text style={s.okTitle}>{t("vault.status.on")}</Text>
            <Text style={s.okBody}>{t("vault.status.body")}</Text>
          </View>
        </View>

        {/* L'empreinte permet de VÉRIFIER, pas seulement de nous croire :
            deux appareils qui affichent la même sont bien sur la même clé. */}
        <Text style={s.label}>{t("vault.status.fingerprint")}</Text>
        <View style={s.fpBox}>
          <Text style={s.fpText} selectable>
            {fingerprint ?? "······"}
          </Text>
        </View>
        <Text style={s.note}>{t("vault.status.fingerprintNote")}</Text>

        <Text style={s.label}>{t("vault.status.newDevice")}</Text>
        <Text style={s.body}>{t("vault.status.newDeviceBody")}</Text>

        {!keyPersistsOnThisDevice ? (
          <Text style={s.note}>{t("vault.unlock.webNote")}</Text>
        ) : null}

        <View style={s.warnBox}>
          <Feather name="alert-triangle" size={16} color={TEXT_3} />
          <Text style={s.warnText}>{t("vault.status.noDisable")}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { color: TEXT_1, fontSize: 17, fontWeight: "700" },
  okBox: {
    flexDirection: "row",
    gap: 13,
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.25)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 26,
  },
  okTitle: { color: GOLD, fontSize: 15.5, fontWeight: "800", marginBottom: 5 },
  okBody: { color: TEXT_2, fontSize: 13.5, lineHeight: 20 },
  label: {
    color: TEXT_3,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 9,
  },
  fpBox: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  fpText: {
    color: TEXT_1,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 5,
    fontVariant: ["tabular-nums"],
  },
  note: { color: TEXT_3, fontSize: 12, lineHeight: 17, marginTop: 9, marginBottom: 24 },
  body: { color: TEXT_2, fontSize: 14, lineHeight: 21, marginBottom: 20 },
  warnBox: {
    flexDirection: "row",
    gap: 11,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  warnText: { flex: 1, color: TEXT_2, fontSize: 12.5, lineHeight: 19 },
});
