// Ouverture de l'écran concerné quand l'utilisateur touche une notification.
//
// Une notification qui retombe sur l'accueil oblige à retrouver soi-même ce
// dont on vient de vous parler — c'est le meilleur moyen de faire ignorer les
// suivantes. Chaque notification embarque donc sa route dans `data.route`.
//
// Deux cas à couvrir, et le second est facile à oublier : l'app était ouverte
// (listener), ou l'app était FERMÉE et c'est la notification qui l'a lancée
// (getLastNotificationResponseAsync). Sans le second, un tap depuis l'écran
// verrouillé ouvre l'accueil et le message est perdu.

import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

function routeOf(response: Notifications.NotificationResponse | null): string | null {
  const data = response?.notification.request.content.data as
    | { route?: string | null }
    | undefined;
  const route = data?.route;
  // On n'accepte que des chemins internes : une route venant d'un payload ne
  // doit pas pouvoir envoyer l'utilisateur ailleurs que dans l'app.
  return typeof route === "string" && route.startsWith("/") ? route : null;
}

export function useNotificationRouting(): void {
  const handled = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;

    const go = (route: string | null, key: string) => {
      if (!alive || !route || handled.current === key) return;
      handled.current = key;
      // @ts-expect-error — routes typées générées par expo-router ; la valeur
      // vient de nos propres notifications, validée par routeOf().
      router.push(route);
    };

    // App lancée PAR la notification.
    Notifications.getLastNotificationResponseAsync()
      .then((r) => go(routeOf(r), r?.notification.request.identifier ?? "cold"))
      .catch(() => {});

    // App déjà ouverte ou en arrière-plan.
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      go(routeOf(r), r.notification.request.identifier);
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
}
