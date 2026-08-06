// Fête d'anniversaire : ballons + deck de cartes façon TINDER.
//  - swipe DROITE → le conseil est GARDÉ dans le dépôt (Profil → Conseils gardés)
//  - swipe GAUCHE → poubelle
//  - tampons « GARDÉ » / « PASSÉ » qui apparaissent pendant le drag,
//    envol avec rotation, carte suivante qui surgit du fond (ressort),
//    halo doré pulsant sur les cartes décisives — l'esprit Clash Royale.
// Signes : vert = bonne nouvelle · doré brillant = décisif · rouge = à anticiper.

import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { BirthdayCard, BirthdayTone } from "../constants/ageFacts";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.10)";

const { width: W, height: H } = Dimensions.get("window");
const CARD_W = Math.min(W - 64, 360);
const SWIPE_THRESHOLD = W * 0.28;

const TONE_STYLE: Record<
  BirthdayTone,
  { border: string; badge: string; badgeBg: string; label: string }
> = {
  good: { border: "#4ADE80", badge: "#052E16", badgeBg: "#4ADE80", label: "BONNE NOUVELLE" },
  gold: { border: "#FCD34D", badge: "#451A03", badgeBg: "#FCD34D", label: "✦ DÉCISIF ✦" },
  bad: { border: "#F87171", badge: "#450A0A", badgeBg: "#F87171", label: "À ANTICIPER" },
  neutral: { border: "rgba(255,255,255,0.14)", badge: "#0F172A", badgeBg: "#94A3B8", label: "" },
};

// ---------------------------------------------------------------------------
// Ballons (fond) — montée en boucle avec balancement
// ---------------------------------------------------------------------------
function Balloon({ emoji, delay, x, duration }: { emoji: string; delay: number; x: number; duration: number }) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rise, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rise, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [rise, delay, duration]);
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [H + 60, -120] });
  const translateX = rise.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 14, -10, 12, 0] });
  const opacity = rise.interpolate({ inputRange: [0, 0.05, 0.9, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.Text style={{ position: "absolute", left: x, fontSize: 34, transform: [{ translateY }, { translateX }], opacity }}>
      {emoji}
    </Animated.Text>
  );
}

const BALLOONS = [
  { emoji: "🎈", x: 0.08, delay: 0, duration: 7000 },
  { emoji: "🎈", x: 0.28, delay: 1800, duration: 8500 },
  { emoji: "🎉", x: 0.48, delay: 900, duration: 7600 },
  { emoji: "🎈", x: 0.66, delay: 2600, duration: 9200 },
  { emoji: "🎊", x: 0.84, delay: 400, duration: 8000 },
];

// Halo pulsant (cartes dorées) — la brillance Clash Royale
function GoldGlow() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          borderRadius: 24,
          borderWidth: 3,
          borderColor: "#FCD34D",
          shadowColor: "#FCD34D",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 18,
          elevation: 14,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Carte du dessus, draggable
// ---------------------------------------------------------------------------
function TopCard({
  item,
  onDecide,
}: {
  item: BirthdayCard;
  onDecide: (kept: boolean) => void;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const enter = useSharedValue(0.86);

  useEffect(() => {
    // Surgissement façon Clash Royale : ressort avec léger overshoot
    enter.value = withSpring(1, { damping: 11, stiffness: 210 });
  }, [enter]);

  const flyOff = (dir: 1 | -1) => {
    "worklet";
    tx.value = withTiming(dir * W * 1.4, { duration: 260 });
    ty.value = withTiming(ty.value + 60, { duration: 260 });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      "worklet";
      tx.value = e.translationX;
      ty.value = e.translationY * 0.35;
    })
    .onEnd((e) => {
      "worklet";
      if (tx.value > SWIPE_THRESHOLD || e.velocityX > 900) {
        flyOff(1);
        runOnJS(onDecide)(true);
      } else if (tx.value < -SWIPE_THRESHOLD || e.velocityX < -900) {
        flyOff(-1);
        runOnJS(onDecide)(false);
      } else {
        tx.value = withSpring(0, { damping: 14 });
        ty.value = withSpring(0, { damping: 14 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${(tx.value / W) * 18}deg` },
      { scale: enter.value },
    ],
  }));
  const keepStamp = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, tx.value / 90)),
  }));
  const trashStamp = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -tx.value / 90)),
  }));

  const tone = TONE_STYLE[item.tone];

  return (
    <GestureDetector gesture={pan}>
      <Reanimated.View style={[styles.card, { borderColor: tone.border }, cardStyle]}>
        {item.tone === "gold" ? <GoldGlow /> : null}

        {tone.label ? (
          <View style={[styles.toneBadge, { backgroundColor: tone.badgeBg }]}>
            <Text style={[styles.toneBadgeText, { color: tone.badge }]}>{tone.label}</Text>
          </View>
        ) : null}

        <Text style={styles.cardEmoji}>{item.emoji}</Text>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardBody}>{item.body}</Text>

        {/* Tampons façon Tinder */}
        <Reanimated.View style={[styles.stamp, styles.stampKeep, keepStamp]}>
          <Text style={styles.stampKeepText}>GARDÉ ✓</Text>
        </Reanimated.View>
        <Reanimated.View style={[styles.stamp, styles.stampTrash, trashStamp]}>
          <Text style={styles.stampTrashText}>PASSÉ ✕</Text>
        </Reanimated.View>
      </Reanimated.View>
    </GestureDetector>
  );
}

// ---------------------------------------------------------------------------
// Le deck
// ---------------------------------------------------------------------------
type Props = {
  visible: boolean;
  cards: BirthdayCard[];
  onKeep?: (c: BirthdayCard) => void;
  onClose: () => void;
};

export default function BirthdayCelebration({ visible, cards, onKeep, onClose }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  const decide = (kept: boolean) => {
    const current = cards[index];
    if (kept && current && onKeep) onKeep(current);
    // Laisse l'envol se jouer avant de monter la carte suivante
    setTimeout(() => setIndex((i) => i + 1), 240);
  };

  const done = index >= cards.length;
  const next = cards[index + 1];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {BALLOONS.map((b, i) => (
          <Balloon key={i} emoji={b.emoji} x={b.x * W} delay={b.delay} duration={b.duration} />
        ))}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Feather name="x" size={22} color={TEXT_2} />
        </TouchableOpacity>

        {!done ? (
          <View style={styles.deckArea}>
            {/* Carte suivante, en retrait derrière */}
            {next ? (
              <View
                style={[
                  styles.card,
                  styles.cardBehind,
                  { borderColor: TONE_STYLE[next.tone].border },
                ]}
              >
                <Text style={styles.cardEmoji}>{next.emoji}</Text>
                <Text style={styles.cardTitle}>{next.title}</Text>
              </View>
            ) : null}
            {/* key={index} force le remontage → animation d'entrée à chaque carte */}
            <TopCard key={index} item={cards[index]} onDecide={decide} />
          </View>
        ) : (
          <View style={styles.deckArea}>
            <View style={[styles.card, { borderColor: GOLD }]}>
              <Text style={styles.cardEmoji}>🎉</Text>
              <Text style={styles.cardTitle}>C'est noté !</Text>
              <Text style={styles.cardBody}>
                Tes conseils gardés t'attendent dans ton Profil, section
                « Conseils gardés ». Très belle année à toi !
              </Text>
              <TouchableOpacity style={styles.cta} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.ctaText}>Merci ! 🎂</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!done ? (
          <>
            {/* Boutons d'action (accessibilité, en plus du swipe) */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: "#F87171" }]}
                onPress={() => decide(false)}
                activeOpacity={0.8}
              >
                <Feather name="x" size={26} color="#F87171" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: GOLD }]}
                onPress={() => decide(true)}
                activeOpacity={0.8}
              >
                <Feather name="bookmark" size={24} color={GOLD} />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              ← passer · garder dans mes conseils →
            </Text>
            <View style={styles.dots}>
              {cards.map((_, i) => (
                <View key={i} style={[styles.dot, i === index && styles.dotActive, i < index && styles.dotDone]} />
              ))}
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(8,12,24,0.96)", justifyContent: "center" },
  closeBtn: {
    position: "absolute", top: 58, right: 22, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  deckArea: { height: 430, alignItems: "center", justifyContent: "center" },
  card: {
    width: CARD_W, minHeight: 360,
    backgroundColor: MIDNIGHT, borderRadius: 24, borderWidth: 2,
    padding: 28, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5, shadowRadius: 30, elevation: 16,
  },
  cardBehind: {
    position: "absolute",
    transform: [{ scale: 0.92 }, { translateY: 18 }],
    opacity: 0.55,
  },
  toneBadge: {
    position: "absolute", top: 16, alignSelf: "center",
    paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999,
  },
  toneBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  cardEmoji: { fontSize: 52, marginBottom: 16 },
  cardTitle: { color: TEXT_1, fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  cardBody: { color: TEXT_2, fontSize: 15, lineHeight: 23, textAlign: "center" },
  stamp: {
    position: "absolute", top: 22,
    paddingVertical: 6, paddingHorizontal: 14,
    borderWidth: 3, borderRadius: 10,
  },
  stampKeep: { left: 16, borderColor: GOLD, transform: [{ rotate: "-14deg" }] },
  stampKeepText: { color: GOLD, fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  stampTrash: { right: 16, borderColor: "#F87171", transform: [{ rotate: "14deg" }] },
  stampTrashText: { color: "#F87171", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  actionsRow: { flexDirection: "row", justifyContent: "center", gap: 26, marginTop: 18 },
  actionBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: SURFACE, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  hint: { color: TEXT_2, fontSize: 12, textAlign: "center", marginTop: 12 },
  cta: { marginTop: 22, backgroundColor: GOLD, paddingVertical: 13, paddingHorizontal: 28, borderRadius: 12 },
  ctaText: { color: "#000", fontSize: 15, fontWeight: "800" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7, marginTop: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.22)" },
  dotActive: { backgroundColor: GOLD, width: 18 },
  dotDone: { backgroundColor: "rgba(74,222,128,0.45)" },
});
