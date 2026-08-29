// L'écran de déverrouillage, à la première ouverture après un abonnement.
//
// POURQUOI CET ÉCRAN EXISTE. Le moment le plus fragile d'un abonnement, ce
// n'est pas l'achat — c'est la minute qui suit. La boutique a débité, l'app se
// rouvre, et si rien ne change à l'écran, le doute s'installe : « est-ce que
// ça a marché ? ». Ce doute produit des demandes de remboursement sur des
// achats parfaitement valides. Ici, la réponse est immédiate et sans
// ambiguïté : ton logo, ton palier, et la liste de ce qui vient de s'ouvrir.
//
// POURQUOI IL RESSEMBLE À UN JEU. Parce que le geste est le même : on vient de
// franchir un cap et on veut le voir. Le vocabulaire (un cap franchi, un titre,
// une liste de gains) fait ce travail sans un mot de marketing.
//
// L'ANIMATION SE JOUE UNE FOIS, PUIS SE FIGE. C'est un aboutissement, pas une
// attente : une boucle infinie derrière un bouton donnerait l'impression que
// l'app charge encore. Le figeage est piloté ici plutôt que confié au compteur
// de boucles du fichier — tous les lecteurs ne l'honorent pas de la même façon,
// et une boucle involontaire est très visible.

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Reanimated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useLang } from "../contexts/LangContext";
import { planFeatureKeys, planMembers } from "../lib/billing/plans";
import type { Tier } from "../lib/entitlements";

const MIDNIGHT = "#0B1220";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";

/** Durée réelle des fichiers, en millisecondes. Voir assets/celebration/. */
const PLAY_MS: Record<Exclude<Tier, "free">, number> = {
  solo: 4000,
  duo: 4600,
  family: 4000,
};

// `require` statique : Metro doit voir chaque chemin pour embarquer l'asset.
// Un chemin construit à l'exécution ne serait pas résolu, et l'image
// n'existerait tout simplement pas dans le build.
const ANIM = {
  solo: require("../../assets/celebration/solo.webp"),
  duo: require("../../assets/celebration/duo.webp"),
  family: require("../../assets/celebration/family.webp"),
};
const STILL = {
  solo: require("../../assets/celebration/solo-still.webp"),
  duo: require("../../assets/celebration/duo-still.webp"),
  family: require("../../assets/celebration/family-still.webp"),
};

export function TierUnlock({
  tier,
  visible,
  onClose,
}: {
  tier: Exclude<Tier, "free">;
  visible: boolean;
  onClose: () => void;
}) {
  const { t, tp } = useLang();
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setFrozen(false);
      return;
    }
    // Une vibration de réussite, pas de simple contact : c'est le retour que
    // le système réserve à « ça a fonctionné ». Silencieusement ignorée sur
    // web et sur les appareils sans moteur haptique.
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    const id = setTimeout(() => setFrozen(true), PLAY_MS[tier]);
    return () => clearTimeout(id);
  }, [visible, tier]);

  const members = planMembers(tier);
  const features = planFeatureKeys(tier).filter((k) => k !== "plan.feature.noWedding");

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={s.root}>
        <Reanimated.View entering={ZoomIn.duration(420)} style={s.stage}>
          {/* Halo : la lueur derrière la carte. Purement décoratif, donc hors
              de l'arbre d'accessibilité. */}
          <View style={s.halo} pointerEvents="none" />
          <Image
            source={frozen ? STILL[tier] : ANIM[tier]}
            style={s.anim}
            contentFit="cover"
            // Le WebP animé se lit sur iOS, Android et web sans module natif
            // supplémentaire — c'est ce qui a fait préférer ce format à une
            // vidéo, qui aurait coûté une dépendance native de plus.
            transition={frozen ? 220 : 0}
            accessibilityLabel={t(`unlock.${tier}.title`)}
          />
        </Reanimated.View>

        <Reanimated.Text entering={FadeInDown.delay(280).duration(420)} style={s.eyebrow}>
          {t("unlock.eyebrow")}
        </Reanimated.Text>

        <Reanimated.Text entering={FadeInDown.delay(380).duration(460)} style={s.title}>
          {t(`unlock.${tier}.title`)}
        </Reanimated.Text>

        <Reanimated.Text entering={FadeInDown.delay(480).duration(460)} style={s.subtitle}>
          {members ? tp(`unlock.${tier}.body`, { n: members }) : t(`unlock.${tier}.body`)}
        </Reanimated.Text>

        <View style={s.features}>
          {features.map((key, i) => (
            <Reanimated.View
              key={key}
              // Décalées une à une : la liste se REMPLIT sous les yeux au lieu
              // d'apparaître d'un bloc. C'est ce qui donne la sensation de
              // gagner quelque chose plutôt que de lire une facture.
              entering={FadeInDown.delay(620 + i * 110).duration(380)}
              style={s.featureRow}
            >
              <View style={s.check}>
                <Feather name="check" size={12} color={GOLD} />
              </View>
              <Text style={s.featureText}>{t(key)}</Text>
            </Reanimated.View>
          ))}
        </View>

        <Reanimated.View
          entering={FadeIn.delay(620 + features.length * 110 + 200).duration(420)}
          style={s.ctaWrap}
        >
          <TouchableOpacity
            style={s.cta}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              onClose();
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={s.ctaText}>{t("unlock.cta")}</Text>
          </TouchableOpacity>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

const styles_shadow = Platform.select({
  ios: { shadowColor: GOLD, shadowOpacity: 0.35, shadowRadius: 28, shadowOffset: { width: 0, height: 0 } },
  default: {},
});

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MIDNIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },
  stage: { alignItems: "center", justifyContent: "center", marginBottom: 22 },
  halo: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(74,222,128,0.10)",
    ...styles_shadow,
  },
  anim: {
    width: 260,
    height: 186,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  eyebrow: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: TEXT_1,
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    color: TEXT_2,
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 22,
    maxWidth: 330,
  },
  features: { alignSelf: "stretch", maxWidth: 330, width: "100%", gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(74,222,128,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1, color: TEXT_3, fontSize: 13.5, lineHeight: 19 },
  ctaWrap: { alignSelf: "stretch", maxWidth: 330, width: "100%", marginTop: 30 },
  cta: { backgroundColor: GOLD, borderRadius: 15, paddingVertical: 16, alignItems: "center" },
  ctaText: { color: "#04140B", fontSize: 15.5, fontWeight: "900", letterSpacing: 0.2 },
});
