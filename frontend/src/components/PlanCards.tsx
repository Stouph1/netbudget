// Les trois formules, en cartes.
//
// UN SEUL COMPOSANT POUR TOUS LES ENDROITS où on propose l'abonnement. Avant,
// la feuille des offres et l'écran de barrage dessinaient chacun leur version
// des mêmes trois formules : deux mises en page à tenir à jour, et la garantie
// qu'un jour l'une promettrait autre chose que l'autre.
//
// L'IMAGE FAIT LE TRAVAIL. Un anneau, deux anneaux, un groupe : on comprend
// « seul / à deux / à plusieurs » sans lire une ligne. Ce sont les mêmes
// visuels que l'écran de déverrouillage, donc ce qu'on voit en achetant est
// exactement ce qu'on revoit une fois abonné — la promesse et la récompense se
// répondent.
//
// LES PRIX NE SONT PAS ICI. Ils viennent de la boutique, localisés, et n'ont
// leur place que sur l'écran d'achat. Une carte qui affiche un prix approché
// puis un autre au paiement est un litige garanti — voir plans.ts.

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLang } from "../contexts/LangContext";
import { HIGHLIGHTED_TIER, planFeatureKeys, planMembers, SELLABLE_TIERS } from "../lib/billing/plans";
import type { Tier } from "../lib/entitlements";

const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

// Les mêmes visuels que la fête de déverrouillage. `require` statique : Metro
// doit voir chaque chemin pour embarquer l'asset.
const COVER: Record<Exclude<Tier, "free">, number> = {
  solo: require("../../assets/celebration/solo-still.webp"),
  duo: require("../../assets/celebration/duo-still.webp"),
  family: require("../../assets/celebration/family-still.webp"),
};

export function PlanCards({
  onPick,
  /** Formule à mettre en avant si l'une débloque précisément ce qui manque. */
  suggested,
  featuresPerCard = 2,
}: {
  onPick: (tier: Exclude<Tier, "free">) => void;
  suggested?: Tier | null;
  featuresPerCard?: number;
}) {
  const { t, tp } = useLang();

  return (
    <View style={{ gap: 10 }}>
      {SELLABLE_TIERS.map((tier) => {
        const members = planMembers(tier);
        // La formule mise en avant est celle qui lève le blocage rencontré,
        // à défaut la plus choisie. Proposer « la plus populaire » à quelqu'un
        // qui vient de buter sur le mariage serait à côté de la question.
        const highlight = suggested ? tier === suggested : tier === HIGHLIGHTED_TIER;

        return (
          <TouchableOpacity
            key={tier}
            style={[s.card, highlight && s.cardBest]}
            onPress={() => onPick(tier)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t(`plan.${tier}.name`)}
            testID={`plan-card-${tier}`}
          >
            <Image source={COVER[tier]} style={s.cover} contentFit="cover" />

            <View style={{ flex: 1 }}>
              <View style={s.head}>
                <Text style={s.name}>{t(`plan.${tier}.name`)}</Text>
                {highlight ? (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{t("plan.popular")}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={s.members}>
                {members ? tp("plan.forMembers", { n: members }) : t("plan.forOne")}
              </Text>

              {planFeatureKeys(tier)
                // « Pas de mariage » est une absence : une carte de vente
                // n'énumère pas ce qu'on n'a pas.
                .filter((k) => k !== "plan.feature.noWedding")
                .slice(0, featuresPerCard)
                .map((k) => (
                  <View key={k} style={s.featureRow}>
                    <Feather name="check" size={11} color={GOLD} />
                    <Text style={s.featureText} numberOfLines={2}>
                      {t(k)}
                    </Text>
                  </View>
                ))}
            </View>

            <Feather name="chevron-right" size={18} color={highlight ? GOLD : TEXT_3} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
  },
  cardBest: { borderColor: "rgba(74,222,128,0.5)", backgroundColor: "#1C2742" },
  cover: {
    width: 58,
    height: 58,
    borderRadius: 13,
    backgroundColor: "#0F172A",
  },
  head: { flexDirection: "row", alignItems: "center", gap: 7 },
  name: { color: TEXT_1, fontSize: 16, fontWeight: "800" },
  badge: {
    backgroundColor: "rgba(74,222,128,0.14)",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: GOLD,
    fontSize: 8.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  members: { color: TEXT_3, fontSize: 11.5, marginTop: 1, marginBottom: 6 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 3 },
  featureText: { flex: 1, color: TEXT_2, fontSize: 11.5, lineHeight: 15 },
});
