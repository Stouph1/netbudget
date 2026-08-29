// Le voile percé, et sa bulle.
//
// LE TROU EST FAIT DE QUATRE RECTANGLES, pas d'un masque. Un masque demanderait
// du SVG et un rendu hors écran ; quatre vues sombres qui laissent un vide au
// milieu donnent exactement le même résultat, sans coût et sans différence de
// rendu entre iOS, Android et web.
//
// LE BOUTON RÉEL RESTE CLIQUABLE. Le trou ne capte pas les gestes : on peut
// taper l'élément mis en lumière et voir ce qu'il fait. C'est toute la
// différence entre apprendre en faisant et regarder un diaporama.
//
// LA BULLE SE PLACE OÙ IL Y A LA PLACE. Au-dessus si la cible est dans la
// moitié basse — la barre d'onglets, donc la plupart du temps — en dessous
// sinon. Une bulle qui sort de l'écran est un tutoriel qui a l'air cassé.

import { Feather } from "@expo/vector-icons";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useLang } from "../../contexts/LangContext";
import { useTour } from "./TourContext";

const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const SCRIM = "rgba(8,12,24,0.86)";

/** Marge autour de la cible, pour qu'elle respire dans le trou. */
const PAD = 8;
const BUBBLE_MAX = 330;

export function TourOverlay() {
  const { t } = useLang();
  const { step, rect, index, total, next, skip } = useTour();
  if (!step || !rect) return null;

  const { width: W, height: H } = Dimensions.get("window");
  const hole = {
    x: Math.max(0, rect.x - PAD),
    y: Math.max(0, rect.y - PAD),
    w: rect.width + PAD * 2,
    h: rect.height + PAD * 2,
  };

  const below = hole.y + hole.h / 2 < H / 2;
  const last = index === total - 1;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Les quatre pans d'ombre. Ils captent les gestes — taper à côté fait
          avancer — mais le trou du milieu, lui, laisse passer. */}
      <Reanimated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(160)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={next}
          style={[s.shade, { top: 0, left: 0, right: 0, height: hole.y }]}
        />
        <TouchableOpacity
          activeOpacity={1}
          onPress={next}
          style={[s.shade, { top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }]}
        />
        <TouchableOpacity
          activeOpacity={1}
          onPress={next}
          style={[s.shade, { top: hole.y, left: 0, width: hole.x, height: hole.h }]}
        />
        <TouchableOpacity
          activeOpacity={1}
          onPress={next}
          style={[
            s.shade,
            { top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h },
          ]}
        />

        {/* Le cerclage du trou : sans lui, la zone claire se lit comme un
            défaut d'affichage plutôt que comme une désignation. */}
        <View
          style={[
            s.ring,
            { top: hole.y, left: hole.x, width: hole.w, height: hole.h },
          ]}
          pointerEvents="none"
        />
      </Reanimated.View>

      <Reanimated.View
        entering={FadeIn.delay(120).duration(260)}
        style={[
          s.bubbleWrap,
          below
            ? { top: hole.y + hole.h + 14 }
            : { bottom: H - hole.y + 14 },
          { left: Math.max(16, Math.min(W - BUBBLE_MAX - 16, hole.x + hole.w / 2 - BUBBLE_MAX / 2)) },
        ]}
      >
        <View style={s.bubble}>
          <Text style={s.title}>{t(step.titleKey)}</Text>
          <Text style={s.body}>{t(step.bodyKey)}</Text>

          <View style={s.foot}>
            {/* Le compteur n'est pas décoratif : savoir qu'il reste deux
                étapes change la décision de continuer ou de passer. */}
            <Text style={s.count}>
              {index + 1}/{total}
            </Text>
            <View style={{ flex: 1 }} />
            {!last ? (
              <TouchableOpacity onPress={skip} hitSlop={10} accessibilityRole="button">
                <Text style={s.skip}>{t("tour.skip")}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={s.cta}
              onPress={next}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={s.ctaText}>{last ? t("tour.done") : t("tour.next")}</Text>
              {!last ? <Feather name="arrow-right" size={14} color="#04140B" /> : null}
            </TouchableOpacity>
          </View>
        </View>
      </Reanimated.View>
    </View>
  );
}

const s = StyleSheet.create({
  shade: { position: "absolute", backgroundColor: SCRIM },
  ring: {
    position: "absolute",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(74,222,128,0.85)",
  },
  bubbleWrap: { position: "absolute", width: BUBBLE_MAX },
  bubble: {
    backgroundColor: "#1A2238",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.28)",
    borderRadius: 18,
    padding: 16,
  },
  title: { color: TEXT_1, fontSize: 16.5, fontWeight: "800", marginBottom: 6 },
  body: { color: TEXT_2, fontSize: 13.5, lineHeight: 19.5 },
  foot: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 14 },
  count: { color: TEXT_3, fontSize: 12, fontWeight: "700" },
  skip: { color: TEXT_3, fontSize: 13, fontWeight: "600" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GOLD,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
  ctaText: { color: "#04140B", fontSize: 13.5, fontWeight: "800" },
});
