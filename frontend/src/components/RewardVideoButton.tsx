// Bouton « voir une vidéo » : une récompense que l'utilisateur CHOISIT.
//
// On ne récompense jamais un clic sur une publicité — le règlement des régies
// l'interdit et c'est le motif classique de suspension. On récompense le fait
// d'avoir regardé la vidéo jusqu'au bout, et rien d'autre.
import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useAccent } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { showRewardedAd } from "../lib/ads";
import { alpha } from "../theme/accents";

export function RewardVideoButton({
  labelKey,
  onEarned,
  testID,
}: {
  labelKey: string;
  /** Appelé une fois la vidéo vue jusqu'au bout. */
  onEarned: () => void | Promise<void>;
  testID?: string;
}) {
  const GOLD = useAccent().main;
  const styles = useMemo(() => makeStyles(GOLD), [GOLD]);
  const { t } = useLang();
  const [state, setState] = useState<"idle" | "loading" | "none">("idle");

  const watch = async () => {
    if (state === "loading") return;
    setState("loading");
    const outcome = await showRewardedAd();
    if (outcome === "earned") await onEarned();
    setState(outcome === "unavailable" ? "none" : "idle");
  };

  return (
    <>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => void watch()}
        disabled={state === "loading"}
        activeOpacity={0.85}
        accessibilityRole="button"
        testID={testID}
      >
        {state === "loading" ? (
          <ActivityIndicator size="small" color={GOLD} />
        ) : (
          <Feather name="play-circle" size={16} color={GOLD} />
        )}
        <Text style={styles.text}>{t(labelKey)}</Text>
      </TouchableOpacity>
      <Text style={styles.note}>
        {t(state === "none" ? "schedule.reward.none" : "schedule.reward.or")}
      </Text>
    </>
  );
}

const makeStyles = (GOLD: string) =>
  StyleSheet.create({
    btn: {
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: alpha(GOLD, 0.5),
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    text: { color: GOLD, fontSize: 13.5, fontWeight: "700", flexShrink: 1, textAlign: "center" },
    note: { color: "#8193AC", fontSize: 12, textAlign: "center", marginTop: 8, marginBottom: 8 },
  });
