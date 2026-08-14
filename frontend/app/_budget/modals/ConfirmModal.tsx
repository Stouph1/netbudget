// Boîte de confirmation maison.
//
// Elle remplace Alert.alert : sur navigateur, un Alert.alert à plusieurs
// boutons est un no-op silencieux (cf. src/utils/notify).
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { DANGER } from "../constants";
import { styles } from "../styles";
import type { ConfirmState, Translate } from "../types";

export default function ConfirmModal({
  confirm,
  t,
  onCloseKeepingState,
}: {
  confirm: ConfirmState;
  t: Translate;
  /** Ferme la boîte SANS effacer titre/message (l'animation de sortie les lit). */
  onCloseKeepingState: () => void;
}) {
  return (
    <Modal
      visible={confirm.open}
      transparent
      animationType="fade"
      onRequestClose={onCloseKeepingState}
    >
      <View style={styles.confirmBackdrop}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>{confirm.title}</Text>
          <Text style={styles.confirmMessage}>{confirm.message}</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={styles.confirmCancelBtn}
              onPress={() => {
                const fn = confirm.onCancel;
                onCloseKeepingState();
                if (fn) fn();
              }}
              testID="confirm-cancel"
            >
              <Text style={styles.confirmCancelText}>
                {confirm.cancelLabel || t("btn.cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmOkBtn, confirm.danger && { backgroundColor: DANGER }]}
              onPress={() => {
                const fn = confirm.onConfirm;
                onCloseKeepingState();
                if (fn) fn();
              }}
              testID="confirm-ok"
            >
              <Text style={[styles.confirmOkText, confirm.danger && { color: "#fff" }]}>
                {confirm.confirmLabel || t("btn.confirm")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
