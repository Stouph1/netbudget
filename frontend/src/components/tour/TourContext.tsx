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
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type View,
} from "react-native";
import type { TourStep } from "../../lib/tourSteps";

export type TargetRect = { x: number; y: number; width: number; height: number };

/**
 * Ce qu'un écran défilant doit fournir pour que la visite l'atteigne.
 *
 * SANS ÇA, LA VISITE PARAÎT INCOMPLÈTE. Une cible sous le pli est hors du champ
 * visible : on la saute pour ne pas percer un trou dans le vide, et l'étape
 * disparaît sans un mot. La moitié de l'application devenait invisible à la
 * visite alors que les étapes existaient.
 */
export type Scroller = {
  scrollTo: (y: number) => void;
  /** Décalage courant, en points. */
  offset: () => number;
};

type TourValue = {
  /** Enregistre une vue pouvant être mise en lumière. */
  attach: (id: string, view: View | null) => void;
  /** Enregistre l'écran défilant d'un onglet. */
  attachScroller: (tab: string, api: Scroller | null) => void;
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
/** Temps laissé au défilement animé pour finir. */
const SCROLL_SETTLE_MS = 400;

const TourCtx = createContext<TourValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const targets = useRef(new Map<string, View>());
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const doneRef = useRef<(() => void) | null>(null);
  const navRef = useRef<((tab: string) => void) | null>(null);
  const tabRef = useRef<string | null>(null);
  const scrollers = useRef(new Map<string, Scroller>());

  const attach = useCallback((id: string, view: View | null) => {
    if (view) targets.current.set(id, view);
    else targets.current.delete(id);
  }, []);

  const attachScroller = useCallback((tab: string, api: Scroller | null) => {
    if (api) scrollers.current.set(tab, api);
    else scrollers.current.delete(tab);
  }, []);

  /**
   * Amène la cible de l'étape `i` dans le champ, la mesure, puis affiche.
   *
   * Trois temps, et chacun a sa raison :
   *   1. changer d'onglet si l'étape parle d'ailleurs ;
   *   2. faire DÉFILER l'écran jusqu'à la cible si elle est sous le pli ;
   *   3. mesurer, puis éclairer.
   *
   * Une étape dont la cible reste introuvable est sautée : se bloquer
   * laisserait un voile noir sur toute l'application, et c'est le pire premier
   * contact imaginable.
   */
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

    const needsNav = step.tab !== tabRef.current;
    if (needsNav) {
      tabRef.current = step.tab;
      navRef.current?.(step.tab);
    }

    const measure = (attempt: number) => {
      const view = targets.current.get(step.target);
      if (!view) {
        show(list, i + 1);
        return;
      }
      view.measureInWindow((x, y, width, height) => {
        const { width: W, height: H } = Dimensions.get("window");
        if (!width || !height) {
          show(list, i + 1);
          return;
        }

        // Zone confortable : sous l'en-tête, au-dessus de la barre d'onglets,
        // et avec la place pour la bulle.
        const TOP = H * 0.14;
        const BOTTOM = H * 0.68;
        const scroller = scrollers.current.get(step.tab);
        const needsScroll = y < TOP || y + height > BOTTOM;

        // Une seule tentative de défilement : si la cible n'est toujours pas
        // en place, elle est probablement dans un conteneur qu'on ne pilote
        // pas. On l'éclaire là où elle est plutôt que de boucler.
        if (needsScroll && scroller && attempt === 0) {
          const wanted = H * 0.34;
          const next = Math.max(0, scroller.offset() + (y - wanted));
          scroller.scrollTo(next);
          setTimeout(() => measure(1), SCROLL_SETTLE_MS);
          return;
        }

        // Complètement hors écran malgré tout : on passe.
        if (y + height < 0 || y > H || x + width < 0 || x > W) {
          show(list, i + 1);
          return;
        }

        setRect({ x, y, width, height });
        setIndex(i);
      });
    };

    setTimeout(() => measure(0), needsNav ? NAV_SETTLE_MS : 0);
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
      attachScroller,
      start,
      next,
      skip,
      step: steps[index] ?? null,
      rect,
      index,
      total: steps.length,
    }),
    [attach, attachScroller, start, next, skip, steps, index, rect],
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

/**
 * À poser sur l'écran défilant d'un onglet, pour que la visite puisse aller
 * chercher une cible sous le pli :
 *
 *   const scroll = useTourScroller("budget");
 *   <ScrollView ref={scroll.ref} onScroll={scroll.onScroll}
 *               scrollEventThrottle={32} />
 */
export function useTourScroller(tab: string) {
  const { attachScroller } = useTour();
  const offset = useRef(0);
  const view = useRef<ScrollView | null>(null);

  const ref = useCallback(
    (sv: ScrollView | null) => {
      view.current = sv;
      attachScroller(
        tab,
        sv
          ? {
              scrollTo: (y) => sv.scrollTo({ y, animated: true }),
              offset: () => offset.current,
            }
          : null,
      );
    },
    [attachScroller, tab],
  );

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  }, []);

  return { ref, onScroll };
}
