// Alerte cross-platform : Alert.alert est un no-op sur react-native-web
// (les popups avec boutons ne s'affichent JAMAIS sur le web). Ce helper
// bascule sur window.alert/confirm côté web.

import { Alert, Platform } from "react-native";

export function notify(
  title: string,
  message?: string,
  onOk?: () => void,
): void {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(message ? `${title}\n\n${message}` : title);
    onOk?.();
    return;
  }
  if (onOk) {
    Alert.alert(title, message, [{ text: "OK", onPress: onOk }]);
  } else {
    Alert.alert(title, message);
  }
}

export function confirmDialog(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
): void {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Annuler", style: "cancel" },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}
