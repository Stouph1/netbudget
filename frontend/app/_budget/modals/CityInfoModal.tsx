// Explication de l'indice de coût de la vie + liens vers les sources.
import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { INDEX_SOURCES } from "../../../src/constants/cities";
import { openExternal } from "../../../src/utils/openExternal";
import { GOLD } from "../constants";
import { styles } from "../styles";
import type { Translate } from "../types";

export default function CityInfoModal({
  visible,
  t,
  onClose,
}: {
  visible: boolean;
  t: Translate;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.confirmBackdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>{t("info.indexTitle")}</Text>
          <Text style={styles.confirmMessage}>{t("info.indexBody")}</Text>
          <Text style={[styles.confirmMessage, { marginTop: 10, fontWeight: "700" }]}>
            {t("info.indexFooter")}
          </Text>
          {INDEX_SOURCES.map((src) => (
            <TouchableOpacity
              key={src.url}
              onPress={() => openExternal(src.url)}
              style={styles.sourceLinkRow}
              activeOpacity={0.7}
              testID={`source-link-${src.url}`}
            >
              <Feather name="external-link" size={13} color={GOLD} />
              <Text style={styles.sourceLinkText}>{src.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.infoCloseBtn}
            onPress={onClose}
            testID="close-city-info"
          >
            <Text style={styles.infoCloseText}>{t("btn.understood")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
