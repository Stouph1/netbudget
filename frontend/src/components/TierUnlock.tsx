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
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Reanimated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { BreathingHalo, Rays, Shimmer, Sparkles } from "./unlockFx";
import { useLang } from "../contexts/LangContext";
import { planFeatureKeys, planMembers } from "../lib/billing/plans";
import type { Tier } from "../lib/entitlements";

const MIDNIGHT = "#0B1220";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";

const CARD_W = 262;
const CARD_H = 188;
const CARD_R = 22;
/** Diamètre des rayons : nettement plus large que la carte, sinon on les
    prend pour un cadre au lieu d'une lueur. */
const RAY_SIZE = 360;

/**
 * Hauteur que la scène OCCUPE dans la mise en page, plus petite que sa taille
 * réelle.
 *
 * La scène mesure 360 de côté pour que les rayons débordent largement autour de
 * la carte, mais elle ne doit pas manger 360 points de hauteur : sur un petit
 * téléphone, le bouton passerait sous le bord de l'écran. On récupère la
 * différence en marges négatives — la boîte garde sa taille réelle, donc rien
 * n'est rogné (Android ne respecte pas `overflow: visible`), et la mise en page
 * n'en compte qu'une partie.
 */
const STAGE_H = 248;

/**
 * Instant où le logo est formé dans chaque animation, en millisecondes.
 *
 * C'est là que tombe l'éclair et que la carte tressaille — synchroniser ces
 * deux gestes sur l'image où le logo se referme est ce qui fait la différence
 * entre « une vidéo qui joue » et « quelque chose qui vient d'arriver ».
 */
const REVEAL_MS: Record<Exclude<Tier, "free">, number> = {
  solo: 2200,
  duo: 3200,
  family: 1400,
};

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

  // L'éclair du moment de révélation, et le sursaut de la carte.
  const flash = useSharedValue(0);
  const pop = useSharedValue(0);
  const enter = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      setFrozen(false);
      flash.value = 0;
      pop.value = 0;
      enter.value = 0;
      return;
    }

    // Entrée : la carte arrive de loin avec un léger dépassement. Un ressort
    // plutôt qu'une durée — c'est ce dépassement qui donne du poids à l'objet.
    enter.value = withSpring(1, { damping: 11, stiffness: 90, mass: 0.9 });

    const reveal = REVEAL_MS[tier];
    flash.value = withDelay(
      reveal,
      withSequence(
        withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 620, easing: Easing.in(Easing.quad) }),
      ),
    );
    pop.value = withDelay(
      reveal,
      withSequence(
        withTiming(1, { duration: 140, easing: Easing.out(Easing.back(2.4)) }),
        withSpring(0, { damping: 9, stiffness: 140 }),
      ),
    );
    // Une vibration de réussite, pas de simple contact : c'est le retour que
    // le système réserve à « ça a fonctionné ». Silencieusement ignorée sur
    // web et sur les appareils sans moteur haptique.
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    const id = setTimeout(() => setFrozen(true), PLAY_MS[tier]);
    return () => clearTimeout(id);
  }, [visible, tier, flash, pop, enter]);

  // Après le figeage, la carte respire très légèrement. C'est ce qui empêche
  // l'écran de mourir quand la vidéo s'arrête — le reproche exact qu'on
  // faisait à la première version.
  const breath = useSharedValue(0);
  useEffect(() => {
    if (!frozen) return;
    breath.value = withRepeat(
      withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [frozen, breath]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { scale: 0.72 + enter.value * 0.28 + pop.value * 0.07 + breath.value * 0.012 },
      { translateY: (1 - enter.value) * 26 },
    ],
  }));

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.5 }));

  const members = planMembers(tier);
  const features = planFeatureKeys(tier).filter((k) => k !== "plan.feature.noWedding");

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.stage}>
          {/* Tout ce qui suit tourne EN PERMANENCE, y compris après la fin de
              la vidéo. C'est ce mouvement de fond qui fait la sensation
              d'ouverture de coffre : aucun de ces gestes n'est spectaculaire
              seul, mais l'œil n'a jamais d'image fixe sous les yeux. */}
          <Rays size={RAY_SIZE} />
          <BreathingHalo size={286} />

          <Reanimated.View style={cardStyle}>
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
            <Shimmer width={CARD_W} height={CARD_H} radius={CARD_R} />
          </Reanimated.View>

          {/* Les éclats passent DEVANT la carte : derrière, ils seraient
              masqués par elle sur toute la partie centrale. */}
          <Sparkles radius={168} />
        </View>

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

        {/* L'éclair du moment de révélation. Posé en dernier pour passer
            au-dessus de tout, et non interactif. */}
        <Reanimated.View
          style={[StyleSheet.absoluteFill, s.flash, flashStyle]}
          pointerEvents="none"
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MIDNIGHT,
    alignItems: "center",
    justifyContent: "center",
    // Pas de rembourrage ici : la scène est plus large que la colonne de
    // texte, et un rembourrage à la racine la comprimerait sur un écran
    // étroit. Chaque bloc de texte porte sa propre largeur maximale.
    paddingHorizontal: 0,
  },
  stage: {
    alignItems: "center",
    justifyContent: "center",
    width: RAY_SIZE,
    height: RAY_SIZE,
    marginTop: -(RAY_SIZE - STAGE_H) / 2,
    marginBottom: -(RAY_SIZE - STAGE_H) / 2 + 6,
  },
  flash: { backgroundColor: "#FFFFFF" },
  anim: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: CARD_R,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  eyebrow: {
    color: GOLD,
    paddingHorizontal: 26,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: TEXT_1,
    paddingHorizontal: 26,
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
  features: { maxWidth: 330, width: "100%", paddingHorizontal: 26, gap: 10 },
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
  ctaWrap: { maxWidth: 330, width: "100%", paddingHorizontal: 26, marginTop: 26 },
  cta: { backgroundColor: GOLD, borderRadius: 15, paddingVertical: 16, alignItems: "center" },
  ctaText: { color: "#04140B", fontSize: 15.5, fontWeight: "900", letterSpacing: 0.2 },
});
