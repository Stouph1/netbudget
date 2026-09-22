// Feuille de style de l'écran Budget, dans la couleur d'accent de l'espace.
//
// `styles` (statique, menthe) reste exporté par ./styles pour ce qui n'est pas
// un composant. Dans un composant, on appelle ce hook et l'on nomme le
// résultat `styles` et `GOLD` : les usages existants suivent l'accent sans
// changer une ligne de rendu.
import { useMemo } from "react";
import { useAccent } from "../../src/contexts/ThemeContext";
import { makeBudgetStyles } from "./styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSheetBottom, useTabBarReserve } from "../../src/hooks/useSheetBottom";

export function useBudgetTheme() {
  const GOLD = useAccent().main;
  const styles = useMemo(() => makeBudgetStyles(GOLD), [GOLD]);
  // Marge basse des feuilles : barre de navigation Android, barre d'accueil iOS.
  const sheetBottom = useSheetBottom(32);
  // Clavier ouvert, la feuille est bornée par ce qui reste au-dessus : elle
  // ne doit jamais passer sous la barre de statut.
  const sheetTop = useSafeAreaInsets().top + 16;
  // Bas des listes qui défilent sous la barre d'onglets.
  const scrollBottom = useTabBarReserve(100);
  return { styles, GOLD, sheetBottom, sheetTop, scrollBottom };
}
