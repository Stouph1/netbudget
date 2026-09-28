// Boîte de confirmation maison.
//
// Elle remplace Alert.alert : sur navigateur, un Alert.alert à plusieurs
// boutons est un no-op silencieux (cf. src/utils/notify).
import { useBudgetTheme } from "../useBudgetTheme";
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
  const { styles } = useBudgetTheme();
  // Deux boutons côte à côte ne tiennent qu'avec des libellés courts. Dès
  // qu'un libellé dépasse (« Supprimer définitivement »), le texte se
  // coupait sur deux lignes et les deux boutons n'avaient plus la même
  // hauteur. On empile : l'action principale en haut, pleine largeur.
  const okLabel = confirm.confirmLabel || t("btn.confirm");
  const cancelLabel = confirm.cancelLabel || t("btn.cancel");
  const stacked = okLabel.length > 14 || cancelLabel.length > 14;
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
          <View style={[styles.confirmActions, stacked && styles.confirmActionsStacked]}>
            <TouchableOpacity
              style={[styles.confirmCancelBtn, stacked && styles.confirmBtnStacked]}
              onPress={() => {
                const fn = confirm.onCancel;
                onCloseKeepingState();
                if (fn) fn();
              }}
              testID="confirm-cancel"
            >
              <Text style={styles.confirmCancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmOkBtn,
                stacked && styles.confirmBtnStacked,
                confirm.danger && { backgroundColor: DANGER },
              ]}
              onPress={() => {
                const fn = confirm.onConfirm;
                onCloseKeepingState();
                if (fn) fn();
              }}
              testID="confirm-ok"
            >
              <Text style={[styles.confirmOkText, confirm.danger && { color: "#fff" }]} numberOfLines={1}>
                {okLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
