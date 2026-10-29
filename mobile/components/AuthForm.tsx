// Email + password sign-in and sign-up against the website's Supabase project (same accounts as www.ezvisa.net).
// The website offers: password sign-in, email magic link, sign-up and forgot password (app/login, app/signup,
// app/forgot-password in the web repo). Google and Apple only appear when the provider is enabled on the project.
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { Button, Text, InlineError, PressScale } from "./ui";
import { GoogleButton } from "./GoogleButton";
import { EmailField, PasswordField, TextLink, EmailSent, useCooldown, isOffline } from "./auth/AuthShell";
import { useColors, S, R, SIZE } from "../lib/theme";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { signInWithGoogle, googleEnabled } from "../lib/google";
import { appleEnabled, signInWithApple } from "../lib/apple";
import { authRedirect } from "../lib/authLinks";
import { AUTH_MESSAGE, classifyAuthError, EMAIL_RE, MIN_PASSWORD, type AuthIssue } from "../lib/authErrors";
import { success, error as hError } from "../lib/haptics";
import { useT } from "../lib/i18n";
export { Field } from "./auth/AuthShell";

type Busy = "" | "pw" | "google" | "apple" | "resend";

export function AuthForm({ mode, onMode, initialEmail, onGuest }: { mode: "signin" | "signup"; onMode: (m: "signin" | "signup") => void; initialEmail?: string; /** Shown on sign-in: start the wizard as a guest. */ onGuest?: () => void }) {
  const c = useColors(); const { t } = useT(); const { session } = useAuth();
  const [mail, setMail] = useState(initialEmail ?? ""); const [pw, setPw] = useState("");
  const [busy, setBusy] = useState<Busy>(""); const inFlight = useRef(false); // a ref, so a double tap can't send twice
  const [err, setErr] = useState<string | null>(null); const [issue, setIssue] = useState<AuthIssue | null>(null);
  const [sent, setSent] = useState(false); const cool = useCooldown();
  const [google, setGoogle] = useState(false); const [apple, setApple] = useState(false);
  useEffect(() => { googleEnabled().then(setGoogle); appleEnabled().then(setApple); }, []);
  const email = mail.trim().toLowerCase();

  const fail = (e: unknown | AuthIssue) => {
    if ((e as { isFriendly?: boolean })?.isFriendly) { hError(); setIssue("unknown"); setErr(t((e as Error).message)); return; } // Google/Apple helpers
    const k = typeof e === "string" && e in AUTH_MESSAGE ? (e as AuthIssue) : classifyAuthError(e);
    hError(); setIssue(k); setErr(t(AUTH_MESSAGE[k]));
  };
  /** Runs one request at a time; checks the connection first so airplane mode answers instantly. */
  const guard = async (kind: Busy, fn: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true; setErr(null); setIssue(null); setBusy(kind);
    try { if (await isOffline()) { fail("offline"); return; } await fn(); }
    catch (e) { fail(e); }
    finally { inFlight.current = false; setBusy(""); }
  };
  const valid = () => {
    if (!EMAIL_RE.test(email)) { fail("invalid-email"); return false; }
    if (pw.length < (mode === "signup" ? MIN_PASSWORD : 1)) { hError(); setErr(mode === "signup" ? t(AUTH_MESSAGE["weak-password"]) : t("Enter your password.")); return false; }
    return true;
  };

  const submit = () => {
    if (!supabase || inFlight.current || !valid()) return;
    const sb = supabase;
    guard("pw", async () => {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        success(); // the auth screen closes when the session arrives
        return;
      }
      const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: authRedirect("signup") } });
      if (error) throw error;
      // With email confirmation on, an existing address returns a user with no identities (no email is sent).
      if (data.user && data.user.identities?.length === 0) { fail("exists"); return; }
      success();
      if (!data.session) { setSent(true); cool.start(); }
    });
  };
  const resend = () => {
    if (!supabase) return;
    const sb = supabase;
    guard("resend", async () => {
      const { error } = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: authRedirect("signup") } });
      if (error) throw error;
      success(); cool.start(); if (!sent) { setSent(true); }
    });
  };
  const onGoogle = () => guard("google", async () => { if ((await signInWithGoogle()) === "ok") success(); });
  const onApple = () => guard("apple", async () => { if ((await signInWithApple()) === "ok") success(); });

  if (!supabase) return <Text variant="body" tone="secondary" center>{t("Sign-in isn't configured.")}</Text>;
  if (sent) return (
    <EmailSent email={email} note={t("Open it on this phone to confirm your account. Then you're signed in.")} onResend={resend} resending={busy === "resend"} left={cool.left}
      onChangeEmail={() => { setSent(false); setErr(null); }} />
  );
  const divider = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm, marginVertical: S.xs }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.card }} /><Text variant="footnote" tone="secondary">{t("or")}</Text><View style={{ flex: 1, height: 1, backgroundColor: c.card }} />
    </View>
  );
  // Canvas SignIn / SignUp: optional Apple and Google, then email and password, the primary action, the email link
  // (sign in), and the footer links. "Continue without an account" goes straight into the wizard as a guest.
  return (
    <View style={{ gap: 14 }}>
      {apple && (
        <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE} cornerRadius={R.button}
          buttonStyle={c.label === "#FFFFFF" ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          style={{ height: SIZE.buttonL, width: "100%" }} onPress={onApple} />
      )}
      {google && <GoogleButton onPress={onGoogle} loading={busy === "google"} />}
      {(google || apple) && divider}
      <EmailField value={mail} onChangeText={(v) => { setMail(v); setErr(null); }} />
      <View style={{ gap: 6 }}>
        <PasswordField isNew={mode === "signup"} value={pw} onChangeText={(v) => { setPw(v); setErr(null); }} onSubmitEditing={submit} returnKeyType="go" />
        {mode === "signup" && !err && <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: S.xxs }}>{t("At least 8 characters.")}</Text>}
      </View>
      {mode === "signin" && (
        <PressScale onPress={() => router.push({ pathname: "/auth/forgot", params: email ? { email } : {} })} accessibilityRole="button" testID="forgot-link"
          style={{ alignSelf: "flex-start", minHeight: 32, justifyContent: "center", paddingHorizontal: S.xxs }}>
          <Text variant="callout" weight="600" tone="accent">{t("Forgot password?")}</Text>
        </PressScale>
      )}
      <InlineError text={err} />
      {issue === "unconfirmed" && <TextLink title={t("Send the confirmation link again")} tone="tint" onPress={resend} testID="resend-confirm" />}
      {issue === "exists" && mode === "signup" && <TextLink title={t("Sign in instead")} tone="tint" onPress={() => { setErr(null); setIssue(null); onMode("signin"); }} />}
      <View style={{ gap: 10, marginTop: 6 }}>
        <Button title={mode === "signin" ? t("Sign in") : t("Create account")} loading={busy === "pw"} disabled={!!busy && busy !== "pw"} onPress={submit} />
        {mode === "signin"
          ? <Button title={t("Email me a sign-in link")} variant="secondary" disabled={!!busy} onPress={() => router.push({ pathname: "/auth/magic-link", params: email ? { email } : {} })} />
          : <Text variant="footnote" tone="secondary" center style={{ paddingHorizontal: S.sm }}>{t("We'll email a confirmation link. Open it on this phone and you're signed in.")}</Text>}
      </View>
      <View style={{ marginTop: S.lg, gap: 4 }}>
        <TextLink title={mode === "signin" ? t("New here? Create account") : t("Have an account? Sign in")} tone="tint"
          onPress={() => { setErr(null); setIssue(null); onMode(mode === "signin" ? "signup" : "signin"); }} testID="mode-toggle" />
        {mode === "signin" && !session && onGuest && <TextLink title={t("Continue without an account")} onPress={onGuest} testID="continue-guest" />}
      </View>
    </View>
  );
}
