// Fête d'anniversaire in-app : ballons animés + 7-8 cartes à swiper
// ("Joyeux anniversaire Lucas, tu as 25 ans — voici ce qui change pour toi").
// S'affiche une fois par an, le jour J (voir index.tsx).

import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { BirthdayCard } from "../constants/ageFacts";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.10)";

const { width: W, height: H } = Dimensions.get("window");
const CARD_W = Math.min(W - 64, 360);

// Ballon : monte en boucle avec un léger balancement horizontal.
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
  const translateX = rise.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 14, -10, 12, 0],
  });
  const opacity = rise.interpolate({ inputRange: [0, 0.05, 0.9, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.Text
      style={{
        position: "absolute",
        left: x,
        fontSize: 34,
        transform: [{ translateY }, { translateX }],
        opacity,
      }}
    >
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

type Props = {
  visible: boolean;
  cards: BirthdayCard[];
  onClose: () => void;
};

export default function BirthdayCelebration({ visible, cards, onClose }: Props) {
  const [page, setPage] = useState(0);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Ballons en arrière-plan */}
        {BALLOONS.map((b, i) => (
          <Balloon key={i} emoji={b.emoji} x={b.x * W} delay={b.delay} duration={b.duration} />
        ))}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Feather name="x" size={22} color={TEXT_2} />
        </TouchableOpacity>

        <FlatList
          data={cards}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={W}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) =>
            setPage(Math.round(e.nativeEvent.contentOffset.x / W))
          }
          renderItem={({ item, index }) => (
            <View style={{ width: W, alignItems: "center", justifyContent: "center" }}>
              <View style={styles.card}>
                <Text style={styles.cardEmoji}>{item.emoji}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody}>{item.body}</Text>
                {index === cards.length - 1 ? (
                  <TouchableOpacity style={styles.cta} onPress={onClose} activeOpacity={0.85}>
                    <Text style={styles.ctaText}>C'est parti 🎉</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.swipeHint}>Swipe →</Text>
                )}
              </View>
            </View>
          )}
        />

        {/* Points de pagination */}
        <View style={styles.dots}>
          {cards.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8,12,24,0.96)",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 58,
    right: 22,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: CARD_W,
    minHeight: 340,
    backgroundColor: MIDNIGHT,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 16,
  },
  cardEmoji: { fontSize: 52, marginBottom: 16 },
  cardTitle: {
    color: TEXT_1,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  cardBody: { color: TEXT_2, fontSize: 15, lineHeight: 23, textAlign: "center" },
  swipeHint: { color: GOLD, fontSize: 13, fontWeight: "700", marginTop: 20 },
  cta: {
    marginTop: 22,
    backgroundColor: GOLD,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  ctaText: { color: "#000", fontSize: 15, fontWeight: "800" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    marginTop: 26,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  dotActive: { backgroundColor: GOLD, width: 18 },
});
