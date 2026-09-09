// Le point mensuel, et la série qu'il construit.
//
// L'IDÉE. Un budget rempli une fois et jamais rouvert ne sert à rien. Le geste
// utile tient en deux minutes, une fois par mois : relire ses chiffres et
// confirmer qu'ils correspondent encore. Cette carte demande ce geste, et
// montre ce qu'il a construit.
//
// POURQUOI CE N'EST PAS UN PIÈGE À ENGAGEMENT. Trois choses en décident :
//
// - Elle ne réclame rien tant que le point du mois n'est pas dû, et disparaît
//   dès qu'il est fait. Une carte qui insiste après coup serait du harcèlement.
// - Elle ne menace jamais. Pas de compte à rebours, pas de « tu vas perdre ta
//   série ». Le meilleur score est acquis pour toujours.
// - Elle ne déverrouille rien et n'exige aucun abonnement. Une habitude qui se
//   troque contre des fonctions n'est plus une habitude, c'est un péage.
//
// Ce qui la rend efficace n'est donc pas la pression, c'est que le geste
// demandé est réellement court et réellement utile.

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useLang } from "../contexts/LangContext";
import { buildRecap, type Recap, type Snapshot } from "../lib/recap";
import { milestoneReached, type Streak } from "../lib/streak";
import { claimMilestone, lastSnapshot, loadStreak, recordCheckIn } from "../lib/streakStore";
import { monthKey } from "../lib/streak";

const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const GOLD = "#4ADE80";
const AMBER = "#FBBF24";

/**
 * `figures` vient de l'écran Budget. Absent tant que rien n'est saisi : le
 * point reste possible, il ne produit simplement pas de bilan.
 */
export function StreakCard({
  figures,
  fmt,
}: {
  figures?: Omit<Snapshot, "month">;
  /** Formateur de montant de l'écran Budget : l'app n'est pas qu'en euros. */
  fmt?: (v: number) => string;
}) {
  const { t, tp } = useLang();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);

  useEffect(() => {
    let alive = true;
    loadStreak().then((s) => {
      if (alive) setStreak(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const check = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // On lit l'instantané précédent AVANT d'écrire le nouveau : après, le
    // dernier point serait celui de ce mois-ci et la comparaison serait vide.
    const previous = figures ? await lastSnapshot() : null;
    const next = await recordCheckIn(figures);
    setStreak(next);

    if (figures && previous) {
      setRecap(buildRecap(previous, { month: monthKey(new Date()), ...figures }));
    }

    const reached = milestoneReached(next);
    // `claimMilestone` rend false si le palier a déjà été fêté : sans ça la
    // félicitation reviendrait à chaque ouverture du même mois.
    if (reached !== null && (await claimMilestone(reached))) {
      setMilestone(reached);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [figures]);

  if (!streak) return null;

  // Le bilan d'abord : c'est ce qui a de la valeur. Le palier est une
  // félicitation, il peut attendre la fermeture du bilan.
  if (recap) {
    return (
      <Reanimated.View entering={FadeIn} exiting={FadeOut} style={[s.card, s.cardWin, s.cardCol]}>
        <View style={s.row}>
          <Feather name="bar-chart-2" size={17} color={GOLD} />
          <Text style={[s.title, { flex: 1 }]}>{t("recap.title")}</Text>
          <TouchableOpacity onPress={() => setRecap(null)} hitSlop={10} accessibilityRole="button">
            <Feather name="x" size={16} color={TEXT_2} />
          </TouchableOpacity>
        </View>
        {recap.lines.map((l) => {
          const good = l.delta > 0 === l.upIsGood;
          return (
            <View key={l.key} style={s.row}>
              <Feather
                name={l.delta > 0 ? "arrow-up-right" : "arrow-down-right"}
                size={13}
                color={good ? GOLD : AMBER}
              />
              <Text style={[s.body, { flex: 1, marginTop: 0 }]}>
                {tp(`recap.line.${l.key}`, { delta: fmtDelta(l.delta, fmt) })}
              </Text>
            </View>
          );
        })}
        <Text style={s.foot}>{t("recap.note")}</Text>
      </Reanimated.View>
    );
  }

  // Palier atteint : on félicite, une fois, et on s'efface au geste suivant.
  if (milestone !== null) {
    return (
      <Reanimated.View entering={FadeIn} exiting={FadeOut} style={[s.card, s.cardWin]}>
        <Feather name="award" size={18} color={GOLD} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{tp("streak.milestone.title", { months: milestone })}</Text>
          <Text style={s.body}>{t("streak.milestone.body")}</Text>
        </View>
        <TouchableOpacity onPress={() => setMilestone(null)} hitSlop={10} accessibilityRole="button">
          <Feather name="x" size={16} color={TEXT_2} />
        </TouchableOpacity>
      </Reanimated.View>
    );
  }

  // Point fait, série encore courte : rien à dire. Afficher « série : 1 mois »
  // à quelqu'un qui vient de commencer ne l'aide pas et occupe l'écran.
  if (streak.doneThisMonth && streak.current < 2) return null;

  if (streak.doneThisMonth) {
    return (
      <View style={s.card}>
        <Feather name="check-circle" size={16} color={GOLD} />
        <Text style={[s.body, { flex: 1 }]}>
          {tp("streak.done", { months: streak.current })}
        </Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <Feather name="calendar" size={17} color={GOLD} />
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{t("streak.due.title")}</Text>
        <Text style={s.body}>
          {streak.current > 0
            ? tp("streak.due.running", { months: streak.current })
            : t("streak.due.body")}
        </Text>
      </View>
      <TouchableOpacity
        onPress={check}
        style={s.cta}
        activeOpacity={0.85}
        accessibilityRole="button"
        testID="streak-checkin"
      >
        <Text style={s.ctaText}>{t("streak.due.cta")}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Signe toujours explicite : « 40 € » ne dit pas si on a gagné ou perdu, et
// le lecteur ne doit pas avoir à le deviner d'après la flèche. Le montant
// passe par le formateur de l'écran Budget, sans quoi un utilisateur en francs
// suisses ou en dirhams lirait des euros.
function fmtDelta(n: number, fmt?: (v: number) => string): string {
  const abs = Math.round(Math.abs(n));
  return `${n > 0 ? "+" : "−"}${fmt ? fmt(abs) : abs}`;
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#1A2238",
  },
  cardWin: {
    borderColor: "rgba(74,222,128,0.4)",
    backgroundColor: "rgba(74,222,128,0.08)",
  },
  cardCol: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  foot: { color: "#8193AC", fontSize: 10.5, lineHeight: 14 },
  title: { color: TEXT_1, fontSize: 13, fontWeight: "700" },
  body: { color: TEXT_2, fontSize: 11.5, lineHeight: 16, marginTop: 1 },
  cta: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  ctaText: { color: "#04140B", fontSize: 12.5, fontWeight: "800" },
});
