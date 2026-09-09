import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CurrencyProvider } from "../src/contexts/CurrencyContext";
import { LangProvider } from "../src/contexts/LangContext";
import { ScopeProvider } from "../src/contexts/ScopeContext";
import { SessionProvider } from "../src/contexts/SessionContext";
import { TourProvider } from "../src/components/tour/TourContext";
import { useNotificationRouting } from "../src/hooks/useNotificationRouting";
import { usePersonalNotifications } from "../src/hooks/usePersonalNotifications";
import { useVault } from "../src/hooks/useVault";
import { useEffect } from "react";
import { loadInflation } from "../src/lib/inflationLive";

// Effets qui doivent vivre aussi longtemps que l'app, quel que soit l'écran
// affiché. Monté DANS les providers pour accéder à la langue, la session et le
// scope ; ne rend rien.
function AppEffects() {
  // L'ordre compte : le coffre publie son état pour la couche de stockage, qui
  // le lit de façon synchrone. Sans ce hook monté, aucune écriture cloud ne
  // serait chiffrée.
  useVault();
  usePersonalNotifications();
  useNotificationRouting();

  // Sans dépendance : une seule fois par lancement. `loadInflation` publie
  // d'abord le cache disque puis rafraîchit si besoin, et ne rejette jamais —
  // aucun écran n'attend son résultat.
  useEffect(() => {
    void loadInflation();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <LangProvider>
          <CurrencyProvider>
          <ScopeProvider>
          {/* Au-dessus de la pile de navigation : le voile de la visite guidée
              doit pouvoir couvrir l'écran courant quel qu'il soit. */}
          <TourProvider>
            <AppEffects />
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#0A0A0C" },
              }}
            />
          </TourProvider>
          </ScopeProvider>
          </CurrencyProvider>
          </LangProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
