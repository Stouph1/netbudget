// Barre d'onglets "liquid glass" façon Apple.
//
// Elle flotte AU-DESSUS du contenu (absolute) → le contenu défile derrière et
// transparaît à travers le flou. Une bulle de sélection GLISSE entre les
// onglets et suit en temps réel les swipes d'écran (pilotée par `swipeX`) ;
// maintenir le doigt sur la barre puis glisser déplace la sélection (Pan après
// appui long, comme iOS).
//
// `swipeX` est la valeur partagée Reanimated de l'écran parent : elle arrive
// par props, la barre ne fait que la LIRE. Les valeurs propres à la bulle
// (dragProgress, tabFocus, lastSlideIdx) restent locales.
import React, { useMemo, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { useTourTarget } from "../../src/components/tour/TourContext";
import { Feather } from "@expo/vector-icons";
import { GOLD, TAB_ORDER, TEXT_3 } from "./constants";
import { styles } from "./styles";
import type { Tab, Translate } from "./types";

const TAB_ICONS: { key: Tab; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "settings", icon: "settings" },
  { key: "events", icon: "calendar" },
  { key: "budget", icon: "pie-chart" },
  { key: "converter", icon: "refresh-cw" },
  { key: "premium", icon: "user" },
];

export default function TabBar({
  tab,
  tabBadges,
  swipeX,
  screenW,
  bottomInset,
  t,
  onSelectTab,
  onSlideToIndex,
}: {
  tab: Tab;
  tabBadges: Partial<Record<Tab, boolean>>;
  /** Translation horizontale du pager (lecture seule ici). */
  swipeX: SharedValue<number>;
  screenW: number;
  bottomInset: number;
  t: Translate;
  onSelectTab: (next: Tab) => void;
  /** Appelé depuis le worklet via runOnJS pendant le glissement sur la barre. */
  onSlideToIndex: (idx: number) => void;
}) {
  // Cibles de la visite guidée. Un appel de hook par onglet, à un niveau
  // constant : les crocheter dans la boucle de rendu violerait les règles des
  // hooks dès qu'un onglet apparaîtrait ou disparaîtrait.
  const tourRefs: Record<Tab, (v: View | null) => void> = {
    settings: useTourTarget("tab:settings"),
    events: useTourTarget("tab:events"),
    budget: useTourTarget("tab:budget"),
    converter: useTourTarget("tab:converter"),
    premium: useTourTarget("tab:premium"),
  };

  // ----- Bulle de sélection façon Apple -----
  //
  // Deux régimes distincts, c'est ce qui fait la sensation :
  //  - au repos, la bulle suit swipeX → elle glisse avec les swipes d'écran ;
  //  - pendant un maintien, elle suit le DOIGT en direct (dragProgress), sans
  //    passer par l'animation d'écran de 220 ms qui donnait un rendu mou.
  // Au maintien, la bulle « prend le focus » : elle grossit et s'éclaircit.
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const dragProgress = useSharedValue(-1); // -1 = pas de drag en cours
  const tabFocus = useSharedValue(0); // 0 → 1 pendant le maintien

  const tabIndicatorStyle = useAnimatedStyle(() => {
    const tabW = tabBarWidth > 0 ? (tabBarWidth - 20) / TAB_ORDER.length : 0;
    // Position continue : le doigt prime sur l'animation d'écran.
    const progress =
      dragProgress.value >= 0 ? dragProgress.value : -swipeX.value / screenW;
    return {
      transform: [
        { translateX: 10 + progress * tabW },
        { scale: 1 + tabFocus.value * 0.1 },
      ],
      opacity: tabBarWidth > 0 ? 1 : 0,
      backgroundColor: `rgba(74,222,128,${0.14 + tabFocus.value * 0.16})`,
      shadowOpacity: tabFocus.value * 0.5,
    };
  }, [tabBarWidth, screenW]);

  // Maintenir le doigt sur la barre puis glisser = la sélection suit le doigt.
  const lastSlideIdx = useSharedValue(-1);
  const tabSlideGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(160)
        .onStart((e) => {
          "worklet";
          // Le maintien est reconnu : la bulle s'anime pour le signaler et
          // saute sous le doigt.
          tabFocus.value = withTiming(1, { duration: 140 });
          lastSlideIdx.value = -1;
          if (tabBarWidth > 0) {
            const tabW = (tabBarWidth - 20) / TAB_ORDER.length;
            dragProgress.value = Math.min(
              TAB_ORDER.length - 1,
              Math.max(0, (e.x - 10) / tabW - 0.5),
            );
          }
        })
        .onUpdate((e) => {
          "worklet";
          if (tabBarWidth <= 0) return;
          const tabW = (tabBarWidth - 20) / TAB_ORDER.length;
          // Position continue → la bulle colle au doigt, sans à-coups.
          dragProgress.value = Math.min(
            TAB_ORDER.length - 1,
            Math.max(0, (e.x - 10) / tabW - 0.5),
          );
          // Sélection réelle : dès que le doigt entre dans une nouvelle case.
          const idx = Math.min(
            TAB_ORDER.length - 1,
            Math.max(0, Math.floor((e.x - 10) / tabW)),
          );
          if (idx !== lastSlideIdx.value) {
            lastSlideIdx.value = idx;
            runOnJS(onSlideToIndex)(idx);
          }
        })
        .onFinalize(() => {
          "worklet";
          // Relâchement : la bulle se recale en douceur sur l'onglet actif et
          // rend la main à swipeX.
          tabFocus.value = withTiming(0, { duration: 180 });
          if (dragProgress.value >= 0) {
            dragProgress.value = withSpring(
              Math.round(dragProgress.value),
              { damping: 18, stiffness: 220 },
              (finished?: boolean) => {
                "worklet";
                if (finished) dragProgress.value = -1;
              },
            );
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabBarWidth, onSlideToIndex, lastSlideIdx],
  );

  return (
    <View
      style={[
        styles.tabBarWrap,
        { paddingBottom: Math.max(bottomInset, Platform.OS === "ios" ? 18 : 10) },
      ]}
      pointerEvents="box-none"
    >
      <GestureDetector gesture={tabSlideGesture}>
        <BlurView
          intensity={55}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={styles.tabBarPill}
          onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}
          accessibilityRole="tablist"
        >
          {/* Bulle de sélection animée (derrière les icônes) */}
          {tabBarWidth > 0 ? (
            <Animated.View
              style={[
                styles.tabIndicator,
                { width: (tabBarWidth - 20) / TAB_ORDER.length },
                tabIndicatorStyle,
              ]}
            />
          ) : null}
          {TAB_ICONS.map((it) => {
            const active = tab === it.key;
            return (
              <TouchableOpacity
                key={it.key}
                onPress={() => onSelectTab(it.key)}
                style={styles.tabBtn}
                testID={`tab-${it.key}`}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={
                  tabBadges[it.key]
                    ? `${t(`tab.${it.key}`)}, nouveautés à voir`
                    : t(`tab.${it.key}`)
                }
              >
                {/* `collapsable={false}` n'est pas décoratif : sur Android,
                    une vue sans style propre est supprimée de l'arbre natif à
                    l'optimisation. Elle existe encore en JavaScript, mais
                    `measureInWindow` ne renvoie plus rien — et le projecteur de
                    la visite guidée se poserait dans le coin de l'écran. */}
                <View ref={tourRefs[it.key]} collapsable={false}>
                  <Feather
                    name={it.icon}
                    size={21}
                    color={active ? GOLD : TEXT_3}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  {tabBadges[it.key] ? <View style={styles.tabBadge} /> : null}
                </View>
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {t(`tab.${it.key}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </BlurView>
      </GestureDetector>
    </View>
  );
}
