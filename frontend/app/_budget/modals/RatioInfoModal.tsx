// Ratio budgétaire — explication du mix (personnalisée si Premium loggé).
import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { explainBudgetSplit } from "../../../src/lib/adviceEngine";
import type { UserProfile } from "../../../src/types/advice";
import { TEXT_3 } from "../constants";
import { styles } from "../styles";
import type { Translate } from "../types";

export default function RatioInfoModal({
  visible,
  premiumProfile,
  adviceI18n,
  t,
  onClose,
}: {
  visible: boolean;
  premiumProfile: UserProfile | null;
  adviceI18n: Parameters<typeof explainBudgetSplit>[1];
  t: Translate;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.confirmBackdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.confirmBox}>
          {(() => {
            const info = explainBudgetSplit(premiumProfile ?? {}, adviceI18n);
            return (
              <>
                <Text style={styles.confirmTitle}>
                  {info.isPersonalized
                    ? `${info.mix.name} · ${info.split.besoins}/${info.split.envies}/${info.split.epargne}`
                    : `${t("adv.mix.equilibre.name")} · 50/30/20`}
                </Text>
                {info.isPersonalized ? (
                  <>
                    <Text style={[styles.confirmMessage, { fontStyle: "italic", marginTop: 2 }]}>
                      {info.mix.tagline}
                    </Text>
                    <Text style={[styles.confirmMessage, { marginTop: 10 }]}>
                      {info.mix.description}
                    </Text>
                    <Text style={[styles.confirmMessage, { marginTop: 12, color: TEXT_3, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }]}>
                      {t("adv.mix.detail")}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.confirmMessage}>
                    {t("adv.mix.generic.intro")}
                  </Text>
                )}
                <Text style={[styles.confirmMessage, { marginTop: 12 }]}>
                  <Text style={{ color: "#10B981", fontWeight: "800" }}>
                    {t("adv.mix.label.besoins")} {info.split.besoins}% ·{" "}
                  </Text>
                  {info.besoinsReason}
                </Text>
                <Text style={[styles.confirmMessage, { marginTop: 8 }]}>
                  <Text style={{ color: "#A855F7", fontWeight: "800" }}>
                    {t("adv.mix.label.envies")} {info.split.envies}% ·{" "}
                  </Text>
                  {info.enviesReason}
                </Text>
                <Text style={[styles.confirmMessage, { marginTop: 8 }]}>
                  <Text style={{ color: "#F59E0B", fontWeight: "800" }}>
                    {t("adv.mix.label.epargne")} {info.split.epargne}% ·{" "}
                  </Text>
                  {info.epargneReason}
                </Text>
                <Text
                  style={[
                    styles.confirmMessage,
                    { marginTop: 14, fontStyle: "italic" },
                  ]}
                >
                  {info.reminder}
                </Text>
              </>
            );
          })()}
          <TouchableOpacity
            style={styles.infoCloseBtn}
            onPress={onClose}
            testID="close-rule-info"
          >
            <Text style={styles.infoCloseText}>{t("btn.understood")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
