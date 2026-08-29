// Pastille de formule, à côté du pseudo.
//
// À QUOI ELLE SERT VRAIMENT. Pas à décorer : à répondre en un coup d'œil à
// « qu'est-ce que j'ai, déjà ? ». Un utilisateur qui l'ignore finit par
// attribuer une limite à un bug, écrit au support, et repart déçu d'un produit
// qui fonctionnait correctement.
//
// POURQUOI DU SVG ET NON DES IMAGES. Une pastille se pose à 14 px à côté d'un
// pseudo et à 40 px sur un écran de vente. En image il faudrait trois fichiers
// par formule et par densité, et ils seraient flous quelque part. En tracé,
// c'est net partout, ça pèse zéro octet de plus, et les couleurs suivent le
// thème.
//
// LE LANGAGE VISUEL est celui de l'app : des anneaux segmentés, comme les
// donuts d'épargne. Le nombre d'anneaux dit le nombre de personnes — un pour
// Solo, deux pour Duo, un grand entouré de petits pour Famille. C'est lisible
// sans avoir appris le code couleur.

import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import type { Tier } from "../lib/entitlements";

const MINT = "#10B981";
const VIOLET = "#A855F7";
const AMBER = "#F59E0B";
/** Palier gratuit : un anneau sourd, pas une couleur de moins. */
const MUTED = "#64748B";

/** Segments d'un anneau : [couleur, part du tour]. Les parts font 1 en tout. */
const SEGMENTS: [string, number][] = [
  [MINT, 0.55],
  [VIOLET, 0.25],
  [AMBER, 0.2],
];

/**
 * Un anneau segmenté.
 *
 * Dessiné en `strokeDasharray` sur un cercle plutôt qu'en arcs de `Path` : pas
 * de trigonométrie à relire, et les jointures restent propres à toute taille.
 */
function Ring({
  cx,
  cy,
  r,
  width,
  colors,
}: {
  cx: number;
  cy: number;
  r: number;
  width: number;
  colors: [string, number][];
}) {
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <G>
      {colors.map(([color, share], i) => {
        const length = circumference * share;
        // Un cheveu de retrait sur chaque segment crée la coupure entre eux.
        const gap = Math.min(1.5, circumference * 0.02);
        const dash = `${Math.max(0, length - gap)} ${circumference - length + gap}`;
        const el = (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            stroke={color}
            strokeWidth={width}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            fill="none"
            strokeLinecap="butt"
            // -90° : on démarre en haut, comme une horloge.
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += length;
        return el;
      })}
    </G>
  );
}

/** Le glyphe seul, sans texte. */
export function TierGlyph({ tier, size = 16 }: { tier: Tier; size?: number }) {
  const s = size;
  const w = Math.max(1.6, s * 0.16);

  if (tier === "free") {
    // Un seul anneau, d'une seule couleur sourde : la place est visiblement
    // libre pour autre chose. Pas de croix ni de cadenas — on n'ouvre pas la
    // relation en disant « il te manque quelque chose ».
    return (
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Circle
          cx={s / 2}
          cy={s / 2}
          r={s / 2 - w / 2 - 0.5}
          stroke={MUTED}
          strokeWidth={w}
          fill="none"
          opacity={0.65}
        />
      </Svg>
    );
  }

  if (tier === "solo") {
    return (
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Ring
          cx={s / 2}
          cy={s / 2}
          r={s / 2 - w / 2 - 0.5}
          width={w}
          colors={SEGMENTS}
        />
      </Svg>
    );
  }

  if (tier === "duo") {
    // Deux anneaux qui se chevauchent : deux personnes, un même budget.
    const r = s * 0.29;
    const rw = Math.max(1.4, s * 0.14);
    return (
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Ring cx={s * 0.33} cy={s / 2} r={r} width={rw} colors={SEGMENTS} />
        <Ring
          cx={s * 0.67}
          cy={s / 2}
          r={r}
          width={rw}
          colors={[
            [VIOLET, 0.45],
            [AMBER, 0.25],
            [MINT, 0.3],
          ]}
        />
      </Svg>
    );
  }

  // Famille : un grand anneau, trois petits autour. On lit « un foyer », pas
  // « trois options ».
  const rw = Math.max(1.2, s * 0.11);
  const small = s * 0.15;
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Ring
        cx={s * 0.44}
        cy={s * 0.46}
        r={s * 0.24}
        width={rw * 1.25}
        colors={SEGMENTS}
      />
      <Ring
        cx={s * 0.82}
        cy={s * 0.22}
        r={small}
        width={rw}
        colors={[
          [VIOLET, 0.5],
          [AMBER, 0.5],
        ]}
      />
      <Ring
        cx={s * 0.84}
        cy={s * 0.76}
        r={small}
        width={rw}
        colors={[
          [AMBER, 0.5],
          [MINT, 0.5],
        ]}
      />
      <Ring
        cx={s * 0.18}
        cy={s * 0.83}
        r={small}
        width={rw}
        colors={[
          [MINT, 0.5],
          [VIOLET, 0.5],
        ]}
      />
    </Svg>
  );
}

/**
 * Pastille complète : glyphe + nom de la formule.
 *
 * `compact` n'affiche que le glyphe — à côté d'un pseudo, le nom de la formule
 * volerait la vedette au nom de la personne.
 */
export function TierBadge({
  tier,
  label,
  size = 16,
  compact = false,
}: {
  tier: Tier;
  /** Nom traduit de la formule. Fourni par l'appelant : ce composant est pur. */
  label?: string;
  size?: number;
  compact?: boolean;
}) {
  const tint = tier === "free" ? MUTED : MINT;

  if (compact || !label) {
    return (
      <View accessibilityLabel={label} style={styles.compact}>
        <TierGlyph tier={tier} size={size} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.pill,
        {
          borderColor:
            tier === "free"
              ? "rgba(100,116,139,0.35)"
              : "rgba(16,185,129,0.35)",
        },
      ]}
    >
      <TierGlyph tier={tier} size={size} />
      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { alignItems: "center", justifyContent: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
