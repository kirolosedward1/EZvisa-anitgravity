import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { AppearanceProvider } from "../lib/appearance";
import { AuthProvider } from "../lib/auth";
import { FormProvider } from "../lib/form";
import { useColors, useIsDark } from "../lib/theme";
import { useEffect } from "react";
import { NetworkBanner } from "../components/NetworkBanner";
import { startUploadQueue } from "../lib/uploads";
import { startReminderRouting } from "../lib/reminders";

export default function Root() {
  return <AppearanceProvider><Themed /></AppearanceProvider>;
}

function Themed() {
  const dark = useIsDark(); const c = useColors();
  const base = dark ? DarkTheme : DefaultTheme;
  useEffect(() => { startUploadQueue(); return startReminderRouting(); }, []);
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: c.tint, background: c.bg, card: c.bg } }}>
      <AuthProvider><FormProvider>
        <StatusBar style={dark ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="welcome" options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="auth" options={{ presentation: "modal" }} />
          <Stack.Screen name="apply" options={{ presentation: "modal" }} />
        </Stack>
        <NetworkBanner />
      </FormProvider></AuthProvider>
    </ThemeProvider>
  );
}
