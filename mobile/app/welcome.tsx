// Welcome (canvas Main.dc.html, "start first, account at pay"): centred logo, Globi, the title, then "Start my
// application" straight into the wizard as a guest, Apple and Google side by side, and "I already have an account".
// No onboarding slides and no sign-up button here: the account is created at Review & pay, and a guest draft merges
// into the account on sign-in. Apple and Google appear only when the provider is switched on for the project.
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { Logo } from "../components/Logo";
import { PrimaryButton, PressScale, Text } from "../components/ui";
import { GlobiPose, GLOBI_SIZE } from "../components/globi/GlobiPose";
import { GoogleButton } from "../components/GoogleButton";
import { useAuth } from "../lib/auth";
import { useColors, useLargeText, S, R, SIZE } from "../lib/theme";
import { markWelcomed } from "../lib/onboarding";
import { tap, success, error as hError } from "../lib/haptics";
import { useT } from "../lib/i18n";
import { signInWithGoogle, googleEnabled } from "../lib/google";
import { signInWithApple, appleEnabled } from "../lib/apple";

export default function Welcome() {
  const c = useColors(); const insets = useSafeAreaInsets(); const reduce = useReducedMotion(); const { t } = useT(); const big = useLargeText();
  const { notice, clearNotice, continueAsGuest } = useAuth();
  // Development preview only (?social=1 or globalThis.__EZ_PREVIEW_SOCIAL__): draws both provider buttons on web,
  // where neither provider can run.
  const { social } = useLocalSearchParams<{ social?: string }>();
  const preview = __DEV__ && (social === "1" || !!(globalThis as { __EZ_PREVIEW_SOCIAL__?: boolean }).__EZ_PREVIEW_SOCIAL__);

  const [gOn, setGOn] = useState(false); const [aOn, setAOn] = useState(false);
  useEffect(() => {
    let on = true;
    googleEnabled().then((v) => on && setGOn(v)).catch(() => {});
    appleEnabled().then((v) => on && setAOn(v)).catch(() => {});
    return () => { on = false; };
  }, []);
  const [busy, setBusy] = useState<"" | "google" | "apple">(""); const [err, setErr] = useState<string | null>(null);

  /** Guest start: the route guard opens the app side, then the wizard opens on its first question. */
  const start = () => {
    tap(); clearNotice(); markWelcomed(); continueAsGuest();
    setTimeout(() => router.push("/apply"), 0);
  };
  const signIn = () => { tap(); clearNotice(); markWelcomed(); router.push({ pathname: "/auth", params: { mode: "signin" } }); };
  const provider = (which: "google" | "apple") => async () => {
    tap(); clearNotice(); setErr(null); setBusy(which);
    try { if ((await (which === "google" ? signInWithGoogle() : signInWithApple())) === "ok") { markWelcomed(); success(); } }
    catch (e: any) { hError(); setErr(e?.message ?? String(e)); }
    finally { setBusy(""); }
  };
  const showApple = aOn || preview; const showGoogle = gOn || preview;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} bounces={false} testID="welcome"
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + S.lg, paddingBottom: Math.max(insets.bottom, S.lg) + S.xs, paddingHorizontal: S.xl }}>
      <View style={{ alignItems: "center" }}><Logo height={28} /></View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: S.xxl, paddingVertical: S.xl }}>
        <Animated.View entering={reduce ? undefined : FadeIn.duration(300)}>
          <GlobiPose pose="welcome" size={big ? 160 : GLOBI_SIZE.welcome} style={{ margin: big ? -12 : -18 }} />
        </Animated.View>
        <Text variant="title1" center accessibilityRole="header" style={{ maxWidth: 300, fontSize: 24, lineHeight: 28 }}>{t("Schengen visa assistance")}</Text>
      </View>
      <Animated.View entering={reduce ? undefined : FadeInDown.delay(120).springify().damping(22).stiffness(240)} style={{ gap: 10 }}>
        {notice ? <Text variant="subhead" tone="secondary" center accessibilityLiveRegion="polite" testID="session-notice">{t(notice)}</Text> : null}
        <PrimaryButton title={t("Start my application")} onPress={start} testID="start-application" />
        {(showApple || showGoogle) && (
          <View style={{ flexDirection: big ? "column" : "row", gap: 10 }}>
            {showApple && (aOn ? (
              <View style={{ flex: big ? undefined : 1 }}>
                <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={R.button} style={{ height: SIZE.buttonM, width: "100%" }} onPress={provider("apple")} />
              </View>
            ) : (
              <PressScale onPress={() => {}} accessibilityRole="button" accessibilityLabel={t("Sign in with Apple")} style={{ flex: big ? undefined : 1, minHeight: SIZE.buttonM, borderRadius: R.button, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" }}>
                <Text variant="optionSm" weight="600" color="#FFFFFF">Apple</Text>
              </PressScale>
            ))}
            {showGoogle && <GoogleButton compact onPress={provider("google")} loading={busy === "google"} />}
          </View>
        )}
        {err ? <Text variant="footnote" tone="red" center accessibilityLiveRegion="polite" testID="provider-error">{t(err)}</Text> : null}
        <PressScale onPress={signIn} accessibilityRole="button" testID="have-account" style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <Text variant="callout" weight="500" tone="secondary">{t("I already have an account")}</Text>
        </PressScale>
      </Animated.View>
    </ScrollView>
  );
}
