// Voile flouté posé sur du contenu réservé, avec la proposition d'abonnement.
//
// LE PRINCIPE, et il n'est pas cosmétique : on MONTRE la chose, on la rend
// illisible. Un écran vide ou une porte fermée ne donne envie de rien, parce
// qu'on ne sait pas ce qu'on rate. Une projection sur vingt ans qu'on devine
// derrière un flou, si — on voit qu'elle est là, dense, calculée pour soi.
//
// TROIS RÈGLES pour que ça reste honnête plutôt que frustrant :
//
// 1. Ce qui répond à « où j'en suis » reste TOUJOURS net. L'année en cours d'un
//    prêt, le premier objectif, le budget entier. On ne floute que la
//    projection et le supplément.
//
// 2. Le voile ne piège pas. Il n'y a rien à fermer, aucun compte à rebours, et
//    l'écran en dessous reste utilisable dès qu'on remonte.
//
// 3. Le texte dit ce qu'on obtient, jamais ce qu'on perd. « Vois les vingt ans »
//    plutôt que « tu ne peux pas voir ».

import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLang } from "../contexts/LangContext";
import { PlanCards } from "./PlanCards";

const GOLD = "#4ADE80";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";

export function LockedOverlay({
  titleKey,
  bodyKey,
  icon = "lock",
  /** Hauteur minimale du voile — au moins la place de la carte. */
  minHeight = 180,
  align = "center",
  cards = false,
  onPress,
}: {
  titleKey: string;
  bodyKey: string;
  icon?: keyof typeof Feather.glyphMap;
  minHeight?: number;
  /**
   * Où poser la carte dans la zone floutée.
   *
   * « center » va bien sur un bloc de la taille d'un écran. Sur un bloc LONG —
   * vingt années d'échéancier, deux mille pixels — centrer envoie la carte à
   * mille pixels du haut, c'est-à-dire hors de vue : l'utilisateur ne voit
   * qu'un flou sans explication et sans issue. « top » la garde là où le
   * regard est déjà.
   */
  align?: "center" | "top";
  /**
   * Afficher les trois formules dans le voile plutôt qu'un simple bouton.
   *
   * À réserver aux zones qui ont la place. Un bouton seul demande de choisir
   * une deuxième fois sur l'écran suivant, et on en perd une partie entre les
   * deux ; trois cartes tassées dans un petit voile sont illisibles. La bonne
   * réponse dépend de la place, donc elle est décidée par l'appelant.
   */
  cards?: boolean;
  /** Par défaut, envoie vers les formules. */
  onPress?: () => void;
}) {
  const { t } = useLang();

  return (
    <View
      style={[StyleSheet.absoluteFill, { minHeight }]}
      pointerEvents="box-none"
    >
      {/* Sur Android le flou est coûteux et parfois ignoré : on double d'un
          voile opaque, sinon le contenu réservé resterait lisible. */}
      <BlurView
        intensity={Platform.OS === "android" ? 40 : 24}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[StyleSheet.absoluteFill, styles.scrim]}
        pointerEvents="none"
      />

      <View
        style={[styles.center, align === "top" && styles.top]}
        pointerEvents="box-none"
      >
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name={icon} size={20} color={GOLD} />
          </View>
          <Text style={styles.title}>{t(titleKey)}</Text>
          <Text style={styles.body}>{t(bodyKey)}</Text>

          {cards ? (
            <View style={{ alignSelf: "stretch" }}>
              <PlanCards
                featuresPerCard={2}
                onPick={(tier) =>
                  router.push({ pathname: "/plans", params: { tier } } as never)
                }
              />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.cta}
              onPress={onPress ?? (() => router.push("/plans" as never))}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>{t("plan.choose.cta")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: "rgba(15,23,42,0.55)" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  top: { justifyContent: "flex-start", paddingTop: 26 },
  card: {
    maxWidth: 360,
    width: "100%",
    alignItems: "center",
    backgroundColor: "rgba(26,34,56,0.96)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.28)",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74,222,128,0.12)",
    marginBottom: 10,
  },
  title: {
    color: TEXT_1,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  body: {
    color: TEXT_2,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 14,
  },
  cta: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignSelf: "stretch",
    alignItems: "center",
  },
  ctaText: { color: "#000", fontSize: 14, fontWeight: "800" },
});
