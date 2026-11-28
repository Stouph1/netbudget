// Accès offert pour 24 heures après une vidéo choisie par l'utilisateur.
//
// LOCAL ET LIMITÉ À LA LECTURE, exprès. Le laissez-passer n'ouvre que des
// vues calculées sur l'appareil (l'échéancier complet d'un prêt, la liste des
// conseils du Coach) : rien n'est
// créé pendant qu'il court, donc rien ne reste en trop quand il expire, et le
// serveur — qui ne connaît que les vraies formules — n'a pas à le croire.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export type PassFeature = "schedule" | "coach";
export const PASS_HOURS = 24;
const key = (f: PassFeature) => `netbudget:pass:${f}`;

/** Fin du laissez-passer (ms), ou 0 s'il n'y en a pas ou plus. */
export function passExpiry(raw: string | null, now: number): number {
  const until = Number(raw);
  return Number.isFinite(until) && until > now ? until : 0;
}

export async function readPass(f: PassFeature): Promise<number> {
  try {
    return passExpiry(await AsyncStorage.getItem(key(f)), Date.now());
  } catch {
    return 0;
  }
}

export async function grantPass(f: PassFeature): Promise<number> {
  const until = Date.now() + PASS_HOURS * 3600 * 1000;
  try {
    await AsyncStorage.setItem(key(f), String(until));
  } catch {}
  return until;
}

/** `active` vrai tant que le laissez-passer court ; `grant` l'ouvre. */
export function useRewardPass(f: PassFeature, enabled = true) {
  const [until, setUntil] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void readPass(f).then((u) => {
      if (alive) setUntil(u);
    });
    return () => {
      alive = false;
    };
  }, [f, enabled]);
  const grant = useCallback(async () => setUntil(await grantPass(f)), [f]);
  return { active: until > Date.now(), grant };
}
