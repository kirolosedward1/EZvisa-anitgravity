import "../lib/perf"; // first: starts the startup clock
import { initSentry } from "../lib/sentry";
import { installCrashHandler } from "../lib/crash";
import { startAnalytics } from "../lib/analytics";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { AppearanceProvider, useAppearance } from "../lib/appearance";
import { AuthProvider, useAuth } from "../lib/auth";
import { FormProvider, useForm } from "../lib/form";
import { I18nProvider, useT } from "../lib/i18n";
import { useColors, useIsDark } from "../lib/theme";
import { useEffect } from "react";
import { View, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NetworkBanner } from "../components/NetworkBanner";
import { BootOverlay } from "../components/Boot";
import { LockGate } from "../lib/lock";
import { startUploadQueue } from "../lib/uploads";
import { useNotificationRouting } from "../lib/push";

installCrashHandler(); initSentry(); // module load: catches errors in the first render too; Sentry is a no-op without a DSN

export default function Root() {
  return <AppearanceProvider><I18nProvider><Themed /></I18nProvider></AppearanceProvider>;
}

/** The splash stays until the things the first screen needs are loaded (no fixed delay), so the stored session is known
 *  before anything is shown: no flash of the sign-in screen for a signed-in user, or of Home for a signed-out one. */
function Boot() {
  const { ready: a } = useAppearance(); const { ready: l } = useT(); const { loading } = useAuth(); const { hydrated } = useForm();
  return <BootOverlay ready={a && l && !loading && hydrated} />;
}

/** Route protection. Signed out: Welcome (sign in / create account / continue without an account). Signed in or guest: the app.
 *  While the session loads, the app side stays mounted under the splash, so a signed-in start never passes through Welcome.
 *  /auth/* (sign-in screens, email-link callback, new password), /payment-return and /payment/[id] are reachable in every state:
 *  a guest who paid and whose app restarted (guest mode is in memory only) must still see the payment result. */
function Routes() {
  const c = useColors(); const { session, guest, loading } = useAuth();
  const inApp = loading || !!session || guest;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Protected guard={inApp}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="apply" options={{ presentation: "modal" }} />
        <Stack.Screen name="trip/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="continue/[id]" options={{ presentation: "modal" }} />
        {/* full screen: a swipe-to-dismiss sheet would fight the crop handles */}
        <Stack.Screen name="upload/[id]" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!inApp}>
        <Stack.Screen name="welcome" options={{ animation: "fade", gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Screen name="auth" options={{ presentation: "modal" }} />
      <Stack.Screen name="payment-return" />
      <Stack.Screen name="payment/[id]" options={{ presentation: "modal", gestureEnabled: false }} />
    </Stack>
  );
}

/** Tapped notifications (push or reminder) open their screen once the stored session is known, warm or cold start.
 *  Every target is inside the app side of Routes (signed in or guest); application screens also wait for sign-in. */
function NotificationRouter() {
  const { session, guest, loading } = useAuth();
  useNotificationRouting(!loading, !!session, !!session || guest);
  return null;
}

/** Status-bar backdrop on every screen: content scrolling under the clock is softened, tinted from the theme background. */
function StatusBackdrop() {
  const c = useColors(); const insets = useSafeAreaInsets();
  if (insets.top <= 0) return null;
  const tint = /^#[0-9a-f]{6}$/i.test(c.bg) ? c.bg + (Platform.OS === "ios" ? "8C" : "F0") : c.bg;
  const st = { position: "absolute" as const, top: 0, left: 0, right: 0, height: insets.top, backgroundColor: tint };
  return Platform.OS === "ios" ? <BlurView pointerEvents="none" intensity={60} tint="systemChromeMaterialLight" style={st} /> : <View pointerEvents="none" style={st} />;
}

function Themed() {
  const dark = useIsDark(); const c = useColors();
  const base = dark ? DarkTheme : DefaultTheme;
  useEffect(() => { startAnalytics(); startUploadQueue(); }, []);
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: c.tint, background: c.bg, card: c.bg } }}>
      <AuthProvider><FormProvider>
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <StatusBar style={dark ? "light" : "dark"} />
          <Routes />
          <StatusBackdrop />
          <NotificationRouter />
          <NetworkBanner />
          <LockGate />
          <Boot />
        </View>
      </FormProvider></AuthProvider>
    </ThemeProvider>
  );
}
