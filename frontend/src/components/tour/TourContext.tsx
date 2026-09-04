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
  /**
   * Déclare l'onglet réellement affiché.
   *
   * À appeler depuis l'écran qui possède la navigation, à chaque changement.
   * C'est ce qui permet à la visite d'ATTENDRE l'arrivée au lieu de parier
   * sur un délai — voir `show()`.
   */
  setActiveTab: (tab: string) => void;
  start: (steps: TourStep[], opts: { onNavigate: (tab: string) => void; onDone: () => void }) => void;
  next: () => void;
  skip: () => void;
  step: TourStep | null;
  rect: TargetRect | null;
  index: number;
  total: number;
};

/** Durée du glissement entre onglets (voir app/index.tsx), plus une marge. */
const SLIDE_MS = 320;
/** Au-delà, on renonce à attendre l'onglet et on continue quand même. */
const NAV_TIMEOUT_MS = 1500;
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
  const scrollers = useRef(new Map<string, Scroller>());
  const activeTab = useRef<string | null>(null);
  const waitingFor = useRef<{ tab: string; resolve: () => void } | null>(null);

  const attach = useCallback((id: string, view: View | null) => {
    if (view) targets.current.set(id, view);
    else targets.current.delete(id);
  }, []);

  const attachScroller = useCallback((tab: string, api: Scroller | null) => {
    if (api) scrollers.current.set(tab, api);
    else scrollers.current.delete(tab);
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    activeTab.current = tab;
    const pending = waitingFor.current;
    if (pending && pending.tab === tab) {
      waitingFor.current = null;
      pending.resolve();
    }
  }, []);

  /**
   * Demande un onglet et ATTEND d'y être.
   *
   * C'était le défaut : on appelait la navigation puis on mesurait après un
   * délai fixe. Le carrousel glisse en 220 ms, mais rien ne garantit que la
   * demande a été honorée — et une mesure prise pendant le glissement rend des
   * coordonnées justes pour un écran qui n'est pas encore là. Résultat : le
   * projecteur se posait au bon endroit… du mauvais écran.
   *
   * Le garde-fou de temps reste : si personne ne confirme, on continue plutôt
   * que de bloquer la visite.
   */
  const goToTab = useCallback(
    (tab: string) =>
      new Promise<void>((resolve) => {
        if (activeTab.current === tab) {
          resolve();
          return;
        }
        const timer = setTimeout(() => {
          waitingFor.current = null;
          resolve();
        }, NAV_TIMEOUT_MS);
        waitingFor.current = {
          tab,
          resolve: () => {
            clearTimeout(timer);
            resolve();
          },
        };
        navRef.current?.(tab);
      }),
    [],
  );

  /**
   * Amène la cible de l'étape `i` dans le champ, la mesure, puis affiche.
   *
   * Quatre temps, et chacun corrige un défaut rencontré :
   *   1. demander l'onglet et ATTENDRE d'y être (pas un délai au hasard) ;
   *   2. laisser le carrousel finir de glisser ;
   *   3. faire DÉFILER l'écran jusqu'à la cible si elle est sous le pli ;
   *   4. vérifier que la cible est bien à l'écran, puis éclairer.
   *
   * Une étape dont la cible reste introuvable est sautée : se bloquer
   * laisserait un voile noir sur toute l'application.
   */
  const show = useCallback(
    async (list: TourStep[], i: number) => {
      if (i >= list.length) {
        setSteps([]);
        setRect(null);
        const done = doneRef.current;
        doneRef.current = null;
        done?.();
        return;
      }

      const step = list[i];
      await goToTab(step.tab);
      // Le carrousel glisse en 220 ms. Mesurer pendant le glissement donne des
      // coordonnées d'un écran qui n'est pas encore en place.
      await new Promise((r) => setTimeout(r, SLIDE_MS));

      const measure = (attempt: number) => {
        const view = targets.current.get(step.target);
        if (!view) {
          void show(list, i + 1);
          return;
        }
        view.measureInWindow((x, y, width, height) => {
          const { width: W, height: H } = Dimensions.get("window");
          if (!width || !height) {
            void show(list, i + 1);
            return;
          }

          // Zone confortable : sous l'en-tête, au-dessus de la barre
          // d'onglets, avec la place pour la bulle.
          const TOP = H * 0.14;
          const BOTTOM = H * 0.68;
          const scroller = scrollers.current.get(step.tab);
          const needsScroll = y < TOP || y + height > BOTTOM;

          // Une seule tentative de défilement : si la cible n'arrive pas en
          // place, elle est dans un conteneur qu'on ne pilote pas. On
          // l'éclaire où elle est plutôt que de boucler.
          if (needsScroll && scroller && attempt === 0) {
            scroller.scrollTo(Math.max(0, scroller.offset() + (y - H * 0.34)));
            setTimeout(() => measure(1), SCROLL_SETTLE_MS);
            return;
          }

          // Hors écran malgré tout — typiquement une cible qui vit dans un
          // onglet où l'on n'est pas. On passe : percer un trou dans le vide
          // donnerait un voile noir sans explication.
          if (y + height < 0 || y > H || x + width < 0 || x > W) {
            void show(list, i + 1);
            return;
          }

          setRect({ x, y, width, height });
          setIndex(i);
        });
      };

      measure(0);
    },
    [goToTab],
  );

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
      setSteps(list);
      setIndex(0);
      void show(list, 0);
    },
    [show],
  );

  const next = useCallback(() => void show(steps, index + 1), [show, steps, index]);

  const skip = useCallback(() => {
    setSteps([]);
    setRect(null);
    waitingFor.current = null;
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
      setActiveTab,
      start,
      next,
      skip,
      step: steps[index] ?? null,
      rect,
      index,
      total: steps.length,
    }),
    [attach, attachScroller, setActiveTab, start, next, skip, steps, index, rect],
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
