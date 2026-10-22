import { PressScale } from "./ui";
import { useEffect, useState } from "react";
import { Pressable, TextInput, TextInputProps, View, Platform } from "react-native";
import { Button, Icon, Text, InlineError } from "./ui";
import { GoogleButton } from "./GoogleButton";
import { useColors, T, S, R } from "../lib/theme";
import { supabase } from "../lib/supabase";
import { signInWithGoogle, googleEnabled } from "../lib/google";
import { appleEnabled, signInWithApple } from "../lib/apple";
import * as AppleAuthentication from "expo-apple-authentication";
import { siteUrl } from "../lib/config";
import { success, error as hError } from "../lib/haptics";
import { useT } from "../lib/i18n";

export function Field({ trailing, ...p }: TextInputProps & { trailing?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: R.input, minHeight: 56, paddingHorizontal: S.md, gap: S.xs }}>
      <TextInput placeholderTextColor={c.secondaryLabel} maxFontSizeMultiplier={1.6} accessibilityLabel={p.placeholder} {...p}
        style={[T.body, { flex: 1, color: c.label, minHeight: 56, paddingVertical: 0 }, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]} />
      {trailing}
    </View>
  );
}

/** Email + password and Continue with Google. Errors render inline. */
export function AuthForm({ mode, onMode, initialEmail }: { mode: "signin" | "signup"; onMode: (m: "signin" | "signup") => void; initialEmail?: string }) {
  const c = useColors(); const { t } = useT();
  const [mail, setMail] = useState(initialEmail ?? ""); const [pw, setPw] = useState(""); const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"" | "pw" | "google" | "apple" | "link" | "reset">("");
  const [err, setErr] = useState<string | null>(null); const [info, setInfo] = useState<string | null>(null); const [forgot, setForgot] = useState(false);
  // Same links the website sends (official domain only): confirm -> /auth/callback, reset -> /auth/callback?type=recovery.
  const confirmTo = siteUrl("/auth/callback?next=/dashboard"); const resetTo = siteUrl("/auth/callback?type=recovery");
  const [google, setGoogle] = useState(false);
  useEffect(() => { googleEnabled().then(setGoogle); appleEnabled().then(setApple); }, []);
  const [apple, setApple] = useState(false);
  const check = (needPw: boolean) => {
    if (!/^\S+@\S+\.\S+$/.test(mail.trim())) { hError(); setErr(t("Enter a valid email.")); return false; }
    if (needPw && pw.length < 8) { hError(); setErr(t("Password must be at least 8 characters.")); return false; }
    return true;
  };
  const run = async (kind: typeof busy, fn: () => Promise<{ error: any }>, ok?: string) => {
    setErr(null); setInfo(null); setBusy(kind);
    try { const { error } = await fn(); if (error) throw error; success(); if (ok) setInfo(ok); }
    catch (e: any) { hError(); setErr(e?.message ?? String(e)); }
    finally { setBusy(""); }
  };
  const onGoogle = async () => {
    setErr(null); setInfo(null); setBusy("google");
    try { const r = await signInWithGoogle(); if (r === "ok") success(); }
    catch (e: any) { hError(); setErr(e?.message ?? "Google sign-in failed."); }
    finally { setBusy(""); }
  };
  const onApple = async () => {
    setErr(null); setInfo(null); setBusy("apple");
    try { const r = await signInWithApple(); if (r === "ok") success(); }
    catch (e: any) { hError(); setErr(e?.message ?? "Apple sign-in failed."); }
    finally { setBusy(""); }
  };
  const submit = () => {
    if (!check(true)) return;
    if (mode === "signin") run("pw", () => supabase!.auth.signInWithPassword({ email: mail.trim(), password: pw }));
    else run("pw", () => supabase!.auth.signUp({ email: mail.trim(), password: pw, options: { emailRedirectTo: confirmTo } }), "Check your email and tap the confirmation link, then sign in here with the same email and password.");
  };
  if (!supabase) return <Text variant="body" tone="secondary" center>Sign-in isn't configured.</Text>;
  return (
    <View style={{ gap: S.sm }}>
      {apple && (
        <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE} cornerRadius={28}
          buttonStyle={c.label === "#FFFFFF" ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          style={{ height: 56, width: "100%" }} onPress={onApple} />
      )}
      {(google || apple) && !google && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm, marginVertical: S.xs }}>
          <View style={{ flex: 1, height: 1, backgroundColor: c.card }} /><Text variant="footnote" tone="secondary">{t("or")}</Text><View style={{ flex: 1, height: 1, backgroundColor: c.card }} />
        </View>
      )}
      {google && (<>
      <GoogleButton onPress={onGoogle} loading={busy === "google"} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm, marginVertical: S.xs }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.card }} /><Text variant="footnote" tone="secondary">{t("or")}</Text><View style={{ flex: 1, height: 1, backgroundColor: c.card }} />
      </View>
      </>)}
      <Field placeholder={t("Email")} value={mail} onChangeText={(t) => { setMail(t); setErr(null); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" autoComplete="email" />
      <Field placeholder={t("Password")} value={pw} onChangeText={(t) => { setPw(t); setErr(null); }} secureTextEntry={!show} textContentType={mode === "signup" ? "newPassword" : "password"} autoComplete={mode === "signup" ? "new-password" : "password"} onSubmitEditing={submit}
        trailing={<PressScale onPress={() => setShow(!show)} accessibilityRole="button" accessibilityLabel={show ? t("Hide password") : t("Show password")} hitSlop={10}><Icon name={show ? "eye.slash" : "eye"} size={18} color={c.secondaryLabel} /></PressScale>} />
      {!!err && <InlineError text={err} />}
      {!!info && <Text variant="footnote" tone="green" style={{ marginHorizontal: S.xs }} accessibilityLiveRegion="polite">{t(info)}</Text>}
      <View style={{ marginTop: S.xs }}><Button title={mode === "signin" ? t("Sign in") : t("Create account")} loading={busy === "pw"} onPress={submit} /></View>
      {mode === "signin" && (
        <PressScale onPress={() => setForgot(!forgot)} accessibilityRole="button" accessibilityState={{ expanded: forgot }} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <Text variant="subhead" tone="secondary" weight="500">{t("Forgot password?")}</Text>
        </PressScale>
      )}
      {forgot && mode === "signin" && (
        <View style={{ flexDirection: "row", gap: S.xs }}>
          <View style={{ flex: 1 }}><Button title={t("Reset password")} variant="secondary" size="M" loading={busy === "reset"} onPress={() => check(false) && run("reset", () => supabase!.auth.resetPasswordForEmail(mail.trim(), { redirectTo: resetTo }), "We sent a reset link. Set a new password on ezvisa.net, then sign in here.")} /></View>
        </View>
      )}
      <PressScale onPress={() => { setErr(null); setInfo(null); setForgot(false); onMode(mode === "signin" ? "signup" : "signin"); }} accessibilityRole="button" style={{ minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: S.xs }}>
        <Text variant="subhead" tone="secondary">{mode === "signin" ? t("New here?") + " " : t("Have an account?") + " "}<Text variant="subhead" tone="tint" weight="600">{mode === "signin" ? t("Create account") : t("Sign in")}</Text></Text>
      </PressScale>
    </View>
  );
}
