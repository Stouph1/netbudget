// Expose la session Supabase à toute l'app via React Context.
//
// Usage :
//   const { session, loading, user } = useSession();
//   if (!session) → afficher écran login
//   if (session)  → afficher app Premium
//
// La session est restaurée depuis AsyncStorage au boot ; auto-refresh géré
// par supabase-js.

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setTierOverride } from "../lib/tierOverride";
import { supabase } from "../lib/supabase";
import { syncBilling } from "../lib/billing/start";
import { refreshTier } from "../lib/tier";

type SessionContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // Le palier forcé par le panneau testeur est un réglage du téléphone,
      // pas du compte : il suivait le compte suivant, qui s'est retrouvé en
      // « Solo » alors que le serveur disait « Famille ».
      if (event === "SIGNED_OUT") void setTierOverride(null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // La facturation doit connaître le compte AVANT tout achat : RevenueCat
  // rattache la transaction à l'`appUserID`. S'il est anonyme, le webhook
  // reçoit un paiement qu'il ne sait relier à personne — le client paie et
  // rien ne se débloque.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    void syncBilling(userId);
  }, [userId]);

  // La formule se relit DÈS que la session est là, et elle est rediffusée à
  // tous les écrans. Sans ça, un écran monté au démarrage interrogeait le
  // serveur avant que la session soit attachée, recevait « gratuit », et n'y
  // revenait jamais : une abonnée voyait « Famille » dans son profil et des
  // repères verrouillés dans son budget, le même jour, dans la même app.
  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => void refreshTier(undefined, 2).catch(() => {}), 300);
    return () => clearTimeout(timer);
  }, [userId]);

  const value = useMemo<SessionContextValue>(
    () => ({ session, user: session?.user ?? null, loading }),
    [session, loading],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within <SessionProvider>");
  return ctx;
}
