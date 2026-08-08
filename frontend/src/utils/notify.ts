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

/**
 * Confirmation cross-plateforme.
 *
 * À utiliser SYSTÉMATIQUEMENT à la place d'`Alert.alert(..., [boutons])` :
 * sur react-native-web, un Alert à boutons est un NO-OP silencieux — le
 * dialogue ne s'affiche pas et l'action n'est jamais déclenchée. C'est ce qui
 * rendait « Supprimer cet espace » inopérant dans le navigateur.
 */
export function confirmDialog(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  opts?: { cancelLabel?: string; destructive?: boolean },
): void {
  const cancelLabel = opts?.cancelLabel ?? "Annuler";
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: "cancel" },
    {
      text: confirmLabel,
      style: opts?.destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
}
