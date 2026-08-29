// Fenêtre des formules, affichée quand une action demande un abonnement.
//
// POURQUOI UNE FENÊTRE ET NON UN SIMPLE MESSAGE. Un refus texte — « cette
// fonctionnalité demande un abonnement » — est une impasse : il faut ensuite
// trouver soi-même où s'abonner, et presque personne ne le fait. La fenêtre
// montre ce qu'on obtient et permet d'agir sans quitter ce qu'on faisait.
//
// TROIS PARTIS PRIS :
//
// 1. ELLE DIT CE QUI MANQUE, précisément. « Le budget mariage est dans les
//    formules Duo et Famille » vaut mieux que « passe à la version payante » :
//    l'utilisateur sait quoi acheter et pourquoi.
//
// 2. ELLE NE MENT PAS SUR LES PRIX. Tant que la boutique n'a pas répondu,
//    aucun montant n'est affiché — pas de « à partir de ».
//
// 3. ON PEUT LA FERMER SANS RIEN FAIRE, d'un geste ou du bouton. Une fenêtre
//    dont on ne sort qu'en achetant se fait refuser en revue, et à raison.

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLang } from "../contexts/LangContext";
import {
  HIGHLIGHTED_TIER,
  planFeatureKeys,
  planMembers,
  SELLABLE_TIERS,
} from "../lib/billing/plans";
import type { Tier } from "../lib/entitlements";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

export type PaywallReason =
  /** Aucun abonnement : la fonctionnalité entière est fermée. */
  | { kind: "needsSubscription"; featureKey: string }
  /** Quota atteint sur la formule actuelle. */
  | { kind: "quota"; featureKey: string }
  /** Ce TYPE de contenu appartient à une formule supérieure. */
  | { kind: "locked"; featureKey: string; requires: Tier };

export function PaywallSheet({
  visible,
  reason,
  onClose,
}: {
  visible: boolean;
  reason: PaywallReason | null;
  onClose: () => void;
}) {
  const { t, tp } = useLang();
  if (!reason) return null;

  const headline =
    reason.kind === "quota"
      ? t("paywall.quota.title")
      : reason.kind === "locked"
        ? tp("paywall.locked.title", { tier: t(`plan.${reason.requires}.name`) })
        : t("paywall.needs.title");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      // Le bouton retour d'Android ferme la fenêtre : sans ça, elle
      // emprisonnerait l'utilisateur.
    >
      <Pressable style={s.backdrop} onPress={onClose} accessibilityRole="button">
        {/* Toucher hors de la carte referme. On stoppe la propagation à
            l'intérieur pour ne pas fermer au premier contact avec le contenu. */}
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.grabber} />

          <View style={s.head}>
            <Text style={s.title}>{headline}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("btn.cancel")}
            >
              <Feather name="x" size={20} color={TEXT_3} />
            </TouchableOpacity>
          </View>

          <Text style={s.sub}>{t(reason.featureKey)}</Text>

          {/* La liste occupe la place restante ; l'essai et le bouton
              restent toujours visibles dessous. Une hauteur figée coupait la
              troisième formule en plein titre — ça ne se lit pas comme « fais
              défiler », ça se lit comme « c'est cassé ». */}
          <View style={s.listWrap}>
            <ScrollView showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 18 }}>
            {SELLABLE_TIERS.map((tier) => {
              const members = planMembers(tier);
              const best = tier === HIGHLIGHTED_TIER;
              return (
                <View key={tier} style={[s.card, best && s.cardBest]}>
                  <View style={s.cardHead}>
                    <Text style={s.cardTitle}>{t(`plan.${tier}.name`)}</Text>
                    {best ? (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{t("plan.popular")}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={s.cardFor}>
                    {members ? tp("plan.forMembers", { n: members }) : t("plan.forOne")}
                  </Text>
                  {planFeatureKeys(tier)
                    .filter((k) => k !== "plan.feature.noWedding")
                    .slice(0, 3)
                    .map((k) => (
                      <View key={k} style={s.featureRow}>
                        <Feather name="check" size={13} color={GOLD} />
                        <Text style={s.featureText}>{t(k)}</Text>
                      </View>
                    ))}
                </View>
              );
            })}
            </ScrollView>

            {/* Dégradé sur le bord bas : une carte à demi masquée par un
                fondu se lit comme « il y en a encore », pas comme un défaut. */}
            <LinearGradient
              colors={["rgba(15,23,42,0)", MIDNIGHT]}
              style={s.fade}
              pointerEvents="none"
            />
          </View>

          {/* L'essai est annoncé ici aussi : c'est le moment où la question se
              pose, pas deux écrans plus loin. */}
          <Text style={s.trial}>{t("paywall.trialOnce")}</Text>

          <TouchableOpacity
            style={s.cta}
            onPress={() => {
              onClose();
              router.push("/plans" as never);
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={s.ctaText}>{t("plan.choose.cta")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={{ paddingVertical: 13 }}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={s.later}>{t("paywall.later")}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    // Bornée en hauteur : sans ça, une feuille plus haute que l'écran pousse
    // le bouton d'action hors de vue.
    maxHeight: "86%",
    backgroundColor: MIDNIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 26,
    paddingTop: 10,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
    marginBottom: 14,
  },
  listWrap: { flexShrink: 1, position: "relative" },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 34 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: { flex: 1, color: TEXT_1, fontSize: 19, fontWeight: "800", lineHeight: 25 },
  sub: { color: TEXT_2, fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 16 },
  card: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardBest: { borderColor: "rgba(74,222,128,0.45)" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { color: TEXT_1, fontSize: 16, fontWeight: "800" },
  badge: {
    backgroundColor: "rgba(74,222,128,0.14)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: GOLD,
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardFor: { color: TEXT_3, fontSize: 12, marginTop: 2, marginBottom: 9 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 5 },
  featureText: { flex: 1, color: TEXT_2, fontSize: 12.5, lineHeight: 17 },
  trial: { color: TEXT_3, fontSize: 11.5, lineHeight: 16, marginTop: 6, marginBottom: 12 },
  cta: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { color: "#000", fontSize: 15, fontWeight: "800" },
  later: { color: TEXT_3, fontSize: 13, fontWeight: "600", textAlign: "center" },
});
