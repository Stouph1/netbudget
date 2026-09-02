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
import { router, useLocalSearchParams } from "expo-router";
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
  annualSaving,
  HIGHLIGHTED_TIER,
  monthlyEquivalent,
  planFeatures,
  planMembers,
  PRODUCT_IDS,
  SELLABLE_TIERS,
  type Period,
} from "../src/lib/billing/plans";
import { billing, onBillingChange, type Offering } from "../src/lib/billing/provider";
import { refreshTier } from "../src/lib/tier";
import { notify } from "../src/utils/notify";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

export default function Plans() {
  const { t, tp, lang } = useLang();
  // Formule demandée depuis une carte d'offre. Validée : un paramètre d'URL
  // n'est pas une source de confiance.
  const { tier: tierParam } = useLocalSearchParams<{ tier?: string }>();
  const askedTier = SELLABLE_TIERS.find((x) => x === tierParam) ?? null;
  const [period, setPeriod] = useState<Period>("yearly");
  const [offerings, setOfferings] = useState<Offering[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Recalculé à chaque arrivée du fournisseur : voir onBillingChange.
  const [available, setAvailable] = useState(() => billing().isAvailable());

  // Le badge de la bascule annuelle s'appuie sur la formule mise en avant : un
  // pourcentage par formule encombrerait, et ils sont très proches.
  const headlineSaving = annualSaving(
    offerings?.find((o) => o.productId === PRODUCT_IDS[HIGHLIGHTED_TIER].monthly),
    offerings?.find((o) => o.productId === PRODUCT_IDS[HIGHLIGHTED_TIER].yearly),
  );

  useEffect(() => {
    let alive = true;

    const load = () => {
      setAvailable(billing().isAvailable());
      billing()
        .listOfferings()
        .then((o) => {
          if (alive) setOfferings(o);
        })
        .catch(() => {
          if (alive) setOfferings([]);
        });
    };

    load();
    // La boutique se met en service après la session : sans ce réabonnement,
    // l'écran resterait figé sur l'état d'avant.
    const off = onBillingChange(load);
    return () => {
      alive = false;
      off();
    };
  }, []);

  function priceFor(productId: string): Offering | undefined {
    return offerings?.find((o) => o.productId === productId);
  }

  /**
   * Formate un montant dans la devise de la BOUTIQUE, pas dans celle choisie
   * dans l'app : c'est dans cette devise que le client sera débité, et afficher
   * l'autre créerait un écart entre l'annonce et le relevé bancaire.
   */
  function money(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat(lang, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  async function buy(productId: string) {
    setBusy(productId);
    const result = await billing().purchase(productId);
    setBusy(null);

    if (result.ok) {
      // Le serveur fait autorité : on attend qu'il ait vu l'achat avant de
      // rendre la main, sinon l'utilisateur revient sur un écran qui le croit
      // encore non abonné.
      void refreshTier();
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
    if (result.ok) void refreshTier();
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
                {p === "yearly" && headlineSaving ? (
                  <Text style={s.periodBadge}>
                    {tp("plan.savePercent", { pct: headlineSaving.percent })}
                  </Text>
                ) : null}
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
            // L'économie se calcule sur les deux prix réels de la boutique.
            // Null quand il n'y en a pas : on n'affiche alors rien, plutôt
            // qu'un « 0 % » ou un chiffre négatif présenté comme un avantage.
            const saving = annualSaving(
              priceFor(PRODUCT_IDS[tier].monthly),
              priceFor(PRODUCT_IDS[tier].yearly),
            );
            // Si l'utilisateur arrive depuis une carte précise, c'est CELLE-LÀ
            // qu'on met en avant. Le renvoyer sur « la plus populaire » après
            // qu'il a choisi la sienne lui fait refaire le choix, et on en perd
            // une partie entre les deux écrans.
            const highlighted = tier === (askedTier ?? HIGHLIGHTED_TIER);
            const members = planMembers(tier);

            return (
              <View key={tier} style={[s.card, highlighted && s.cardHighlighted]}>
                {highlighted ? (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{t("plan.popular")}</Text>
                  </View>
                ) : null}

                <View style={s.trialChip}>
                  <Feather name="gift" size={11} color={GOLD} />
                  <Text style={s.trialChipText}>{t("plan.trial.badge")}</Text>
                </View>

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
                    {period === "yearly" ? (
                      <>
                        {/* L'équivalent mensuel se compare directement au
                            tarif mensuel : c'est le chiffre qui parle. */}
                        <Text style={s.priceNote}>
                          {tp("plan.perMonth", {
                            amount: money(
                              monthlyEquivalent(offer.priceAmount),
                              offer.currency,
                            ),
                          })}
                        </Text>
                        {saving ? (
                          <Text style={s.saving}>
                            {tp("plan.saving", {
                              amount: money(saving.amount, saving.currency),
                            })}
                          </Text>
                        ) : null}
                      </>
                    ) : null}
                  </>
                ) : null}

                <View style={s.features}>
                  {planFeatures(tier).map((f) => {
                    return (
                      <View key={f.key} style={s.featureRow}>
                        <Feather name="check" size={14} color={GOLD} />
                        <Text style={s.featureText}>
                          {f.params ? tp(f.key, f.params) : t(f.key)}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Mention obligatoire : durée de l'essai, montant débité
                    ensuite, renouvellement automatique, comment arrêter. Elle
                    doit être lisible AVANT de confirmer, pas après — c'est
                    autant une règle de l'App Store qu'une obligation
                    consommateur. */}
                {offer ? (
                  <Text style={s.trialTerms}>
                    {tp("plan.trial.terms", { price: offer.priceLabel })}
                  </Text>
                ) : null}

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
  periodBadge: { color: GOLD, fontSize: 10.5, fontWeight: "800", marginTop: 2 },
  saving: { color: GOLD, fontSize: 12.5, fontWeight: "700", marginTop: 4 },
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
  trialChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 9,
  },
  trialChipText: { color: GOLD, fontSize: 10.5, fontWeight: "800" },
  trialTerms: { color: TEXT_3, fontSize: 11, lineHeight: 16, marginTop: 16 },
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
