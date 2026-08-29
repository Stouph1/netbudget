// Visite guidée : le registre des cibles, et la machine à étapes.
//
// COMMENT ON DÉSIGNE UN BOUTON RÉEL. N'importe quel écran appelle
// `useTourTarget("tab:budget")` et pose le `ref` renvoyé sur sa vue. Le
// contexte garde la référence et mesure sa position À L'ÉCRAN au moment où
// l'étape s'affiche — pas avant. Mesurer d'avance donnerait des coordonnées
// fausses dès que l'utilisateur tourne son téléphone, ouvre le clavier ou
// change d'onglet.
//
// POURQUOI `collapsable={false}` EST OBLIGATOIRE côté appelant sur Android :
// une vue sans style propre y est supprimée de l'arbre natif à l'optimisation.
// Elle existe toujours en JavaScript, mais `measureInWindow` ne renvoie plus
// rien — et le projecteur se pose sur le coin haut-gauche de l'écran.
//
// SI UNE CIBLE MANQUE, ON PASSE. Une visite qui se bloque sur une étape
// impossible à mesurer laisse un voile noir sur toute l'app : c'est le pire
// premier contact imaginable.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dimensions, type View } from "react-native";
import type { TourStep } from "../../lib/tourSteps";

export type TargetRect = { x: number; y: number; width: number; height: number };

type TourValue = {
  /** Enregistre une vue pouvant être mise en lumière. */
  attach: (id: string, view: View | null) => void;
  start: (steps: TourStep[], opts: { onNavigate: (tab: string) => void; onDone: () => void }) => void;
  next: () => void;
  skip: () => void;
  step: TourStep | null;
  rect: TargetRect | null;
  index: number;
  total: number;
};

/** Temps laissé à un écran pour se dessiner avant qu'on mesure dedans. */
const NAV_SETTLE_MS = 420;

const TourCtx = createContext<TourValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const targets = useRef(new Map<string, View>());
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const doneRef = useRef<(() => void) | null>(null);
  const navRef = useRef<((tab: string) => void) | null>(null);
  const tabRef = useRef<string | null>(null);

  const attach = useCallback((id: string, view: View | null) => {
    if (view) targets.current.set(id, view);
    else targets.current.delete(id);
  }, []);

  /** Mesure la cible de l'étape `i`, puis affiche. Passe l'étape si introuvable. */
  const show = useCallback((list: TourStep[], i: number) => {
    if (i >= list.length) {
      setSteps([]);
      setRect(null);
      tabRef.current = null;
      const done = doneRef.current;
      doneRef.current = null;
      done?.();
      return;
    }

    const step = list[i];

    // Changer d'écran si l'étape parle d'ailleurs, puis laisser le temps au
    // nouvel écran de se poser : mesurer avant qu'il soit dessiné renvoie des
    // coordonnées de l'écran précédent.
    const needsNav = step.tab !== tabRef.current;
    if (needsNav) {
      tabRef.current = step.tab;
      navRef.current?.(step.tab);
    }

    setTimeout(
      () => {
        const view = targets.current.get(step.target);
        if (!view) {
          // Cible absente : on enchaîne au lieu de laisser un voile sur un
          // trou qui n'existe pas.
          show(list, i + 1);
          return;
        }
        view.measureInWindow((x, y, width, height) => {
          const { width: W, height: H } = Dimensions.get("window");
          // Cible hors de l'écran — repliée sous le pli d'une liste, ou d'un
          // onglet qu'on a quitté. Percer un trou dans le vide donnerait un
          // voile noir sans explication.
          const offscreen =
            !width || !height || y + height < 0 || y > H || x + width < 0 || x > W;
          if (offscreen) {
            show(list, i + 1);
            return;
          }
          setRect({ x, y, width, height });
          setIndex(i);
        });
      },
      needsNav ? NAV_SETTLE_MS : 0,
    );
  }, []);

  const start = useCallback(
    (
      list: TourStep[],
      { onNavigate, onDone }: { onNavigate: (tab: string) => void; onDone: () => void },
    ) => {
      if (list.length === 0) {
        onDone();
        return;
      }
      doneRef.current = onDone;
      navRef.current = onNavigate;
      tabRef.current = null;
      setSteps(list);
      setIndex(0);
      show(list, 0);
    },
    [show],
  );

  const next = useCallback(() => show(steps, index + 1), [show, steps, index]);

  const skip = useCallback(() => {
    setSteps([]);
    setRect(null);
    tabRef.current = null;
    const done = doneRef.current;
    doneRef.current = null;
    // Passer la visite compte comme l'avoir vue. La reproposer au lancement
    // suivant transformerait un refus en harcèlement.
    done?.();
  }, []);

  const value = useMemo<TourValue>(
    () => ({
      attach,
      start,
      next,
      skip,
      step: steps[index] ?? null,
      rect,
      index,
      total: steps.length,
    }),
    [attach, start, next, skip, steps, index, rect],
  );

  return <TourCtx.Provider value={value}>{children}</TourCtx.Provider>;
}

export function useTour(): TourValue {
  const ctx = useContext(TourCtx);
  if (!ctx) throw new Error("useTour doit être utilisé dans <TourProvider>");
  return ctx;
}

/**
 * À poser sur la vue à mettre en lumière :
 *
 *   const ref = useTourTarget("tab:budget");
 *   <View ref={ref} collapsable={false}>…</View>
 */
export function useTourTarget(id: string) {
  const { attach } = useTour();
  return useCallback((view: View | null) => attach(id, view), [attach, id]);
}
