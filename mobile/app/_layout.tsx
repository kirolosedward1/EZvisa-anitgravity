import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { AppearanceProvider, useAppearance } from "../lib/appearance";
import { AuthProvider, useAuth } from "../lib/auth";
import { FormProvider, useForm } from "../lib/form";
import { I18nProvider, useT } from "../lib/i18n";
import { useColors, useIsDark } from "../lib/theme";
import { useEffect } from "react";
import { View } from "react-native";
import { NetworkBanner } from "../components/NetworkBanner";
import { BootOverlay } from "../components/Boot";
import { useWelcomed } from "../lib/onboarding";
import { startUploadQueue } from "../lib/uploads";
import { startReminderRouting } from "../lib/reminders";

export default function Root() {
  return <AppearanceProvider><I18nProvider><Themed /></I18nProvider></AppearanceProvider>;
}

/** The splash stays until the things the first screen needs are loaded (no fixed delay). */
function Boot() {
  const { ready: a } = useAppearance(); const { ready: l } = useT(); const { loading } = useAuth(); const { hydrated } = useForm(); const welcomed = useWelcomed();
  return <BootOverlay ready={a && l && !loading && hydrated && welcomed !== null} />;
}

function Themed() {
  const dark = useIsDark(); const c = useColors();
  const base = dark ? DarkTheme : DefaultTheme;
  useEffect(() => { startUploadQueue(); return startReminderRouting(); }, []);
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: c.tint, background: c.bg, card: c.bg } }}>
      <AuthProvider><FormProvider>
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <StatusBar style={dark ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="welcome" options={{ animation: "fade", gestureEnabled: false }} />
            <Stack.Screen name="auth" options={{ presentation: "modal" }} />
            <Stack.Screen name="apply" options={{ presentation: "modal" }} />
          </Stack>
          <NetworkBanner />
          <Boot />
        </View>
      </FormProvider></AuthProvider>
    </ThemeProvider>
  );
}
