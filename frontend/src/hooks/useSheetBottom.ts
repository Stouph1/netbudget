// Marge basse d'une feuille (bottom sheet) posée au bord de l'écran.
//
// Sur Android en bord à bord (edgeToEdgeEnabled), une Modal passe SOUS la
// barre de navigation : React Native force navigationBarTranslucent quand le
// mode est actif (ReactModalHostView). Un bouton « Enregistrer » collé au bas
// de la feuille se retrouvait derrière les trois boutons du système. Sur
// iOS, c'est la barre d'accueil qui joue le même rôle.
//
// Le padding = la hauteur de cette barre, plus un peu d'air, jamais moins que
// ce que la feuille avait déjà. Clavier ouvert, la barre est cachée dessous :
// on ne garde qu'un souffle, sinon un bandeau vide sépare le bouton du clavier.
import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(show, () => setVisible(true));
    const h = Keyboard.addListener(hide, () => setVisible(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);
  return visible;
}

export function useSheetBottom(min = 32): number {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  if (keyboard) return Math.min(min, 16);
  return Math.max(min, insets.bottom + 16);
}

/**
 * De combien remonter une feuille posée au bas de la fenêtre pour qu'elle
 * s'arrête juste au-dessus du clavier.
 *
 * On ne se fie pas à `endCoordinates.height` : sur Android en bord à bord,
 * React Native y retire la barre de navigation, alors que le clavier la
 * recouvre. La feuille se retrouvait 48 dp sous le clavier. La position du
 * haut du clavier (`screenY`) est la même sur les deux plateformes.
 */
export function useKeyboardLift(): number {
  const [lift, setLift] = useState(0);
  useEffect(() => {
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(show, (e) => {
      const screenY = e?.endCoordinates?.screenY;
      const h = e?.endCoordinates?.height ?? 0;
      setLift(typeof screenY === "number" ? Math.max(0, Dimensions.get("window").height - screenY) : h);
    });
    const hd = Keyboard.addListener(hide, () => setLift(0));
    return () => {
      s.remove();
      hd.remove();
    };
  }, []);
  return lift;
}
