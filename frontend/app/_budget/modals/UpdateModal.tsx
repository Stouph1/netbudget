// « Nouvelle version disponible » — vérification au lancement contre l'App Store.
import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { dismissUpdate, type UpdateInfo } from "../../../src/utils/appUpdate";
import { openExternal } from "../../../src/utils/openExternal";
import { interpolate } from "../../../src/utils/advice";
import { styles } from "../styles";
import type { Translate } from "../types";

export default function UpdateModal({
  updateInfo,
  t,
  onDismiss,
}: {
  updateInfo: UpdateInfo | null;
  t: Translate;
  onDismiss: () => void;
}) {
  return (
    <Modal
      visible={!!updateInfo}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.confirmBackdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss} />
        <View style={styles.confirmBox}>
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: "rgba(16,185,129,0.15)",
              alignItems: "center", justifyContent: "center",
              borderWidth: 1, borderColor: "rgba(16,185,129,0.4)",
            }}>
              <Feather name="download" size={26} color="#10B981" />
            </View>
          </View>
          <Text style={styles.confirmTitle}>{t("update.title")}</Text>
          <Text style={styles.confirmMessage}>
            {interpolate(t("update.message"), {
              current: updateInfo?.installedVersion ?? "",
              latest: updateInfo?.storeVersion ?? "",
            })}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <TouchableOpacity
              style={[styles.infoCloseBtn, { flex: 1, backgroundColor: "rgba(255,255,255,0.06)" }]}
              onPress={async () => {
                if (updateInfo) await dismissUpdate(updateInfo.storeVersion);
                onDismiss();
              }}
              testID="update-later"
            >
              <Text style={styles.infoCloseText}>{t("update.later")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.infoCloseBtn, { flex: 1, backgroundColor: "#10B981" }]}
              onPress={() => {
                if (updateInfo?.appStoreUrl) openExternal(updateInfo.appStoreUrl);
                onDismiss();
              }}
              testID="update-now"
            >
              <Text style={[styles.infoCloseText, { color: "#0A0A0C" }]}>{t("update.now")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
