import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CurrencyProvider } from "../src/contexts/CurrencyContext";
import { LangProvider } from "../src/contexts/LangContext";
import { ScopeProvider } from "../src/contexts/ScopeContext";
import { SessionProvider } from "../src/contexts/SessionContext";
import { useNotificationRouting } from "../src/hooks/useNotificationRouting";
import { usePersonalNotifications } from "../src/hooks/usePersonalNotifications";

// Effets qui doivent vivre aussi longtemps que l'app, quel que soit l'écran
// affiché. Monté DANS les providers pour accéder à la langue, la session et le
// scope ; ne rend rien.
function AppEffects() {
  usePersonalNotifications();
  useNotificationRouting();
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
            <AppEffects />
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#0A0A0C" },
              }}
            />
          </ScopeProvider>
          </CurrencyProvider>
          </LangProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
