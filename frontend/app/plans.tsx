// Les formules.
//
// TROIS RÈGLES QUI GOUVERNENT CET ÉCRAN :
//
// 1. LES PRIX VIENNENT DE LA BOUTIQUE, jamais du code. Tant qu'elle n'a pas
//    répondu, on n'affiche aucun montant — pas un « à partir de », pas un
//    placeholder. Un chiffre approximatif qui diffère du débit est un litige.
//
// 2. LES CAPACITÉS VIENNENT DE `entitlements.ts`, la même source que le
//    contrôle qui les applique. L'écran de vente ne peut donc pas promettre ce
//    que l'app refuse.
//
// 3. AUCUN BOUTON D'ACHAT INOPÉRANT. Quand la facturation n'est pas
//    disponible, on montre ce que contient chaque formule et on le dit. Un
//    bouton qui échoue coûte plus cher que son absence.
//
// La résiliation n'est pas un lien caché en bas : elle est annoncée sur l'écran
// d'achat lui-même. Cacher la sortie fait hésiter à entrer.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLang } from "../src/contexts/LangContext";
import {
  HIGHLIGHTED_TIER,
  planFeatureKeys,
  planMembers,
  PRODUCT_IDS,
  SELLABLE_TIERS,
  type Period,
} from "../src/lib/billing/plans";
import { billing, type Offering } from "../src/lib/billing/provider";
import { notify } from "../src/utils/notify";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

export default function Plans() {
  const { t, tp } = useLang();
  const [period, setPeriod] = useState<Period>("yearly");
  const [offerings, setOfferings] = useState<Offering[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const available = billing().isAvailable();

  useEffect(() => {
    let alive = true;
    billing()
      .listOfferings()
      .then((o) => {
        if (alive) setOfferings(o);
      })
      .catch(() => {
        if (alive) setOfferings([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  function priceFor(productId: string): Offering | undefined {
    return offerings?.find((o) => o.productId === productId);
  }

  async function buy(productId: string) {
    setBusy(productId);
    const result = await billing().purchase(productId);
    setBusy(null);

    if (result.ok) {
      notify(t("plan.bought.title"), t("plan.bought.body"), () => router.back());
      return;
    }
    if (result.reason === "cancelled") return; // l'utilisateur a renoncé, rien à dire
    notify(
      t("plan.failed.title"),
      t(
        result.reason === "alreadyOwned"
          ? "plan.failed.alreadyOwned"
          : result.reason === "unavailable"
            ? "plan.failed.unavailable"
            : "plan.failed.error",
      ),
    );
  }

  async function restore() {
    setBusy("restore");
    const result = await billing().restore();
    setBusy(null);
    notify(
      t(result.ok ? "plan.restore.done.title" : "plan.restore.none.title"),
      t(result.ok ? "plan.restore.done.body" : "plan.restore.none.body"),
    );
  }

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
        <Text style={s.title}>{t("plan.title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={s.intro}>{t("plan.intro")}</Text>

        {/* Bascule mensuel / annuel. Annuel par défaut : c'est le tarif le
            plus avantageux, et le mettre en second ferait choisir le mensuel
            par simple inertie. */}
        <View style={s.periodRow}>
          {(["yearly", "monthly"] as Period[]).map((p) => {
            const active = period === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={[s.periodBtn, active && s.periodBtnActive]}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Text style={[s.periodText, active && s.periodTextActive]}>
                  {t(p === "yearly" ? "plan.period.yearly" : "plan.period.monthly")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {offerings === null ? (
          <ActivityIndicator color={GOLD} style={{ marginTop: 30 }} />
        ) : (
          SELLABLE_TIERS.map((tier) => {
            const productId = PRODUCT_IDS[tier][period];
            const offer = priceFor(productId);
            const highlighted = tier === HIGHLIGHTED_TIER;
            const members = planMembers(tier);

            return (
              <View key={tier} style={[s.card, highlighted && s.cardHighlighted]}>
                {highlighted ? (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{t("plan.popular")}</Text>
                  </View>
                ) : null}

                <Text style={s.cardTitle}>{t(`plan.${tier}.name`)}</Text>
                <Text style={s.cardFor}>
                  {members
                    ? tp("plan.forMembers", { n: members })
                    : t("plan.forOne")}
                </Text>

                {/* Le prix n'apparaît que si la boutique l'a donné. */}
                {offer ? (
                  <>
                    <Text style={s.price}>{offer.priceLabel}</Text>
                    {offer.monthlyEquivalentLabel ? (
                      <Text style={s.priceNote}>
                        {tp("plan.perMonth", { amount: offer.monthlyEquivalentLabel })}
                      </Text>
                    ) : null}
                  </>
                ) : null}

                <View style={s.features}>
                  {planFeatureKeys(tier).map((key) => {
                    const excluded = key === "plan.feature.noWedding";
                    return (
                      <View key={key} style={s.featureRow}>
                        <Feather
                          name={excluded ? "minus" : "check"}
                          size={14}
                          color={excluded ? TEXT_3 : GOLD}
                        />
                        <Text style={[s.featureText, excluded && { color: TEXT_3 }]}>
                          {t(key)}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {available ? (
                  <TouchableOpacity
                    style={[s.buyBtn, busy === productId && { opacity: 0.6 }]}
                    onPress={() => buy(productId)}
                    disabled={busy !== null}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                  >
                    {busy === productId ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={s.buyText}>{t("plan.choose")}</Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )}

        {!available ? (
          <View style={s.soonBox}>
            <Feather name="clock" size={16} color={TEXT_3} />
            <Text style={s.soonText}>{t("plan.soon")}</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={restore}
            style={{ paddingVertical: 16 }}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={s.linkText}>{t("plan.restore.cta")}</Text>
          </TouchableOpacity>
        )}

        {/* La sortie est annoncée sur l'écran d'entrée : cacher la résiliation
            fait hésiter à s'abonner. */}
        <Text style={s.cancelNote}>{t("plan.cancelNote")}</Text>
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
  intro: { color: TEXT_2, fontSize: 14.5, lineHeight: 22, marginBottom: 20 },
  periodRow: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 4,
    marginBottom: 22,
  },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  periodBtnActive: { backgroundColor: "rgba(74,222,128,0.14)" },
  periodText: { color: TEXT_2, fontSize: 13.5, fontWeight: "600" },
  periodTextActive: { color: GOLD },
  card: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  cardHighlighted: { borderColor: "rgba(74,222,128,0.45)" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(74,222,128,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    color: GOLD,
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  cardTitle: { color: TEXT_1, fontSize: 19, fontWeight: "800" },
  cardFor: { color: TEXT_3, fontSize: 12.5, marginTop: 3 },
  price: { color: TEXT_1, fontSize: 26, fontWeight: "800", marginTop: 12 },
  priceNote: { color: TEXT_3, fontSize: 12, marginTop: 2 },
  features: { marginTop: 16, gap: 9 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  featureText: { flex: 1, color: TEXT_2, fontSize: 13.5, lineHeight: 19 },
  buyBtn: {
    backgroundColor: GOLD,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  buyText: { color: "#000", fontSize: 15, fontWeight: "800" },
  soonBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  soonText: { flex: 1, color: TEXT_2, fontSize: 12.5, lineHeight: 19 },
  linkText: { color: GOLD, fontSize: 13.5, fontWeight: "600", textAlign: "center" },
  cancelNote: {
    color: TEXT_3,
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 18,
  },
});
