// Feuille de style de l'écran Budget, dans la couleur d'accent de l'espace.
//
// `styles` (statique, menthe) reste exporté par ./styles pour ce qui n'est pas
// un composant. Dans un composant, on appelle ce hook et l'on nomme le
// résultat `styles` et `GOLD` : les usages existants suivent l'accent sans
// changer une ligne de rendu.
import { useMemo } from "react";
import { useAccent } from "../../src/contexts/ThemeContext";
import { makeBudgetStyles } from "./styles";

export function useBudgetTheme() {
  const GOLD = useAccent().main;
  const styles = useMemo(() => makeBudgetStyles(GOLD), [GOLD]);
  return { styles, GOLD };
}
