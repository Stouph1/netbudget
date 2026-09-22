// Réglages partagés des contrôles natifs.
import { Platform, type StyleProp, type ViewStyle } from "react-native";

/**
 * L'interrupteur Android natif est nettement plus large que celui d'iOS et
 * paraît disproportionné à côté d'un libellé de 15 pt. On le ramène à la
 * même échelle visuelle sur toutes les plateformes.
 */
export const switchStyle: StyleProp<ViewStyle> =
  Platform.OS === "android" ? { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] } : undefined;
