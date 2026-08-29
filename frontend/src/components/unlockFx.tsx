// Les effets de l'écran de déverrouillage : rayons, éclats, balayage, halo.
//
// POURQUOI TOUT EST FAIT MAISON. Trois raisons, dans cet ordre :
//   1. Reanimated et react-native-svg sont déjà là. Ajouter Lottie coûterait un
//      module natif de plus — et on a déjà payé cette facture avec libsodium.
//   2. Les couleurs suivent celles de l'app. Un fichier d'animation exporté
//      d'ailleurs se désynchronise à la première retouche de palette.
//   3. Ça pèse zéro octet d'asset.
//
// LE PRINCIPE D'UN PACK OPENING. Ce qui donne la sensation, ce n'est pas
// l'objet révélé : c'est que L'ÉCRAN NE S'ARRÊTE JAMAIS DE BOUGER. Les rayons
// tournent lentement, les éclats scintillent en décalé, le halo respire. Aucun
// de ces mouvements n'est spectaculaire pris seul ; ensemble, ils font que
// l'œil n'a jamais l'impression d'une image fixe.
//
// LENT PLUTÔT QUE VIF. Rotation en trente secondes, respiration en trois. Une
// animation rapide fatigue en deux secondes et donne envie de fermer ; une
// animation lente se regarde. C'est aussi ce qui la rend « chill » au lieu de
// clignotante.

import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";

const MINT = "#10B981";
const VIOLET = "#A855F7";
const AMBER = "#F59E0B";

/**
 * Hasard REPRODUCTIBLE, tiré de l'index.
 *
 * Un vrai `Math.random()` donnerait une disposition différente à chaque
 * ouverture — donc impossible à régler, et impossible à comparer entre deux
 * essais. Ici la scène est toujours la même, et elle a quand même l'air
 * organique.
 */
function noise(i: number, salt = 0): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// Rayons : deux couronnes qui tournent en sens inverse
// ---------------------------------------------------------------------------

/**
 * Une couronne de rayons triangulaires partant du centre.
 *
 * `gradientId` est OBLIGATOIRE et doit être unique. Sur web, tous les SVG
 * partagent le même document : deux <Defs> nommés pareil se remplacent, et les
 * deux couronnes finissent de la même couleur. Le défaut n'apparaît que sur
 * web, ce qui en fait exactement le genre de bug qu'on découvre après coup.
 */
function RayFan({ size, count, color, opacity, gradientId }: {
  size: number;
  count: number;
  color: string;
  opacity: number;
  gradientId: string;
}) {
  const c = size / 2;
  const paths: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    // Largeur angulaire du rayon : assez fin pour qu'on voie le fond entre eux.
    const w = (Math.PI * 2) / count / 5;
    const x1 = c + Math.cos(a - w) * c;
    const y1 = c + Math.sin(a - w) * c;
    const x2 = c + Math.cos(a + w) * c;
    const y2 = c + Math.sin(a + w) * c;
    paths.push(`M${c} ${c} L${x1} ${y1} L${x2} ${y2} Z`);
  }
  return (
    <Svg width={size} height={size} style={{ opacity }}>
      <Defs>
        {/* Le dégradé éteint les rayons vers l'extérieur : sans lui, on voit
            un disque à bord net au lieu d'une lueur. */}
        <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <Stop offset="55%" stopColor={color} stopOpacity="0.35" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {paths.map((d, i) => (
        <Path key={i} d={d} fill={`url(#${gradientId})`} />
      ))}
    </Svg>
  );
}

/** Les rayons, en rotation continue et lente. */
export function Rays({ size }: { size: number }) {
  const a = useSharedValue(0);
  const b = useSharedValue(0);

  useEffect(() => {
    // `Easing.linear` : une rotation qui accélère et ralentit se remarque, et
    // ce qui se remarque devient agaçant au bout de dix secondes.
    a.value = withRepeat(withTiming(1, { duration: 30000, easing: Easing.linear }), -1);
    b.value = withRepeat(withTiming(1, { duration: 46000, easing: Easing.linear }), -1);
  }, [a, b]);

  const styleA = useAnimatedStyle(() => ({
    transform: [{ rotate: `${a.value * 360}deg` }],
  }));
  // Sens inverse : deux couronnes qui tournent dans le même sens se confondent
  // en un seul mouvement ; opposées, elles créent de la profondeur.
  const styleB = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-b.value * 360}deg` }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, s.center]} pointerEvents="none">
      <Reanimated.View style={[s.abs, styleB]}>
        <RayFan size={size} count={9} color={VIOLET} opacity={0.16} gradientId="nb-ray-violet" />
      </Reanimated.View>
      <Reanimated.View style={[s.abs, styleA]}>
        <RayFan size={size} count={14} color={MINT} opacity={0.22} gradientId="nb-ray-mint" />
      </Reanimated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Éclats : de petites étoiles à quatre branches qui scintillent en décalé
// ---------------------------------------------------------------------------

/** Étoile à quatre branches, dessinée avec des courbes pour éviter l'effet croix. */
function Star({ size, color }: { size: number; color: string }) {
  const c = size / 2;
  const d = `M${c} 0 Q${c} ${c} ${size} ${c} Q${c} ${c} ${c} ${size} Q${c} ${c} 0 ${c} Q${c} ${c} ${c} 0 Z`;
  return (
    <Svg width={size} height={size}>
      <Path d={d} fill={color} />
    </Svg>
  );
}

function Sparkle({ index, radius }: { index: number; radius: number }) {
  const life = useSharedValue(0);

  // Position sur un anneau, avec assez de désordre pour que ça ne fasse pas
  // « cadran d'horloge ».
  const angle = (index / 18) * Math.PI * 2 + noise(index, 1) * 0.7;
  const r = radius * (0.62 + noise(index, 2) * 0.55);
  const x = Math.cos(angle) * r;
  const y = Math.sin(angle) * r * 0.78;
  const size = 7 + noise(index, 3) * 11;
  const color = [MINT, VIOLET, AMBER, "#FFFFFF"][index % 4];
  const period = 2200 + noise(index, 4) * 1800;

  useEffect(() => {
    life.value = withDelay(
      // Décalage à l'allumage : sans lui, les dix-huit éclats scintillent à
      // l'unisson et on voit un clignotant, pas des paillettes.
      noise(index, 5) * 2600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: period * 0.35, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: period * 0.65, easing: Easing.in(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [life, index, period]);

  const style = useAnimatedStyle(() => ({
    opacity: life.value,
    transform: [
      // Dérive vers l'extérieur pendant l'allumage : les paillettes s'éloignent
      // du logo au lieu de rester collées en place.
      { translateX: x * (1 + life.value * 0.14) },
      { translateY: y * (1 + life.value * 0.14) },
      { scale: 0.35 + life.value * 0.9 },
      { rotate: `${life.value * 55}deg` },
    ],
  }));

  return (
    <Reanimated.View style={[s.abs, style]} pointerEvents="none">
      <Star size={size} color={color} />
    </Reanimated.View>
  );
}

export function Sparkles({ radius, count = 18 }: { radius: number; count?: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, s.center]} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <Sparkle key={i} index={i} radius={radius} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Halo qui respire
// ---------------------------------------------------------------------------

export function BreathingHalo({ size }: { size: number }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      // `true` : aller-retour. Sans lui, le halo reviendrait sèchement à sa
      // taille de départ à chaque cycle — un à-coup toutes les trois secondes.
      true,
    );
  }, [p]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.1 + p.value * 0.14,
    transform: [{ scale: 0.92 + p.value * 0.16 }],
  }));

  return (
    <Reanimated.View
      style={[
        s.abs,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: MINT,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

// ---------------------------------------------------------------------------
// Balayage lumineux sur la carte
// ---------------------------------------------------------------------------

/**
 * Le reflet qui traverse la carte, comme sur une carte à collectionner.
 *
 * Il passe RAREMENT — toutes les cinq secondes. Un balayage continu
 * ressemblerait à un chargement.
 */
export function Shimmer({ width, height, radius }: {
  width: number;
  height: number;
  radius: number;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withDelay(4200, withTiming(1, { duration: 0 })),
        withTiming(0, { duration: 0 }),
      ),
      -1,
    );
  }, [p]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: -width + p.value * width * 2 },
      { rotate: "18deg" },
    ],
    opacity: p.value > 0 && p.value < 1 ? 0.5 : 0,
  }));

  return (
    <View
      style={{ position: "absolute", width, height, borderRadius: radius, overflow: "hidden" }}
      pointerEvents="none"
    >
      <Reanimated.View style={[{ width: width * 0.5, height: height * 2, top: -height / 2 }, style]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="nb-glint" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#nb-glint)" />
        </Svg>
      </Reanimated.View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  abs: { position: "absolute" },
});
