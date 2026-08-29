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
import { supabase } from "../lib/supabase";
import { syncBilling } from "../lib/billing/start";

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

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
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
