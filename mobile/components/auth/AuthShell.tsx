// Shared frame for the auth screens: top bar (logo + close, or back), large title, optional one-line subtitle, content.
import { useEffect, useState } from "react";
import { I18nManager, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TextInputProps, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { Button, Icon, PressScale, Text, HeaderIconButton, QuestionHeader } from "../ui";
import { GlobiPose, type GlobiPose as Pose } from "../globi/GlobiPose";
import { useColors, T, S, R, HIT, SIZE } from "../../lib/theme";
import { tap } from "../../lib/haptics";
import { useT } from "../../lib/i18n";

export function closeAuth() {
  if (router.canGoBack()) router.back(); else router.replace("/");
}

/**
 * Auth screen frame (canvas SignIn, SignUp, Forgot, Reset, MagicLink): round back or close button, then Globi beside a
 * speech bubble that holds the title. No description line under it. `bare` drops the bubble for hero states (EmailSent).
 */
export function AuthShell({ title, pose = "welcome", nav = "close", bare = false, children, testID }: { title: string; pose?: Pose; nav?: "close" | "back" | "none"; bare?: boolean; children: React.ReactNode; testID?: string; /** @deprecated canvas: no line under the title */ subtitle?: string }) {
  const c = useColors(); const { t, rtl } = useT(); const insets = useSafeAreaInsets();
  const back = () => { if (router.canGoBack()) router.back(); else router.replace("/auth"); };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} testID={testID}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.gutter - S.xxs, paddingTop: Platform.OS === "ios" ? S.md : insets.top + S.xs, minHeight: 56 }}>
        {nav === "back" ? <HeaderIconButton icon={rtl ? "chevron.right" : "chevron.left"} label={t("Back")} onPress={back} testID="auth-back" /> : <View style={{ width: HIT, height: HIT }} />}
        {nav === "close" && <HeaderIconButton icon="xmark" label={t("Close")} onPress={closeAuth} testID="auth-close" />}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: S.gutter, paddingTop: bare ? 0 : S.lg, paddingBottom: Math.max(insets.bottom, S.lg) + S.md }}>
        {!bare && <QuestionHeader question={title} pose={pose} />}
        {!bare && <View style={{ height: S.lg }} />}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Text input (canvas): optional 13/600 label above, white 52 pt field with 14 pt corners, blue while typing.
 *  Dynamic Type capped at 1.6× so it never clips. */
export function Field({ trailing, label, ...p }: TextInputProps & { trailing?: React.ReactNode; label?: string }) {
  const c = useColors(); const [focused, setFocused] = useState(false);
  const box = (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderRadius: R.input, minHeight: SIZE.input, paddingHorizontal: S.md, gap: S.xs, borderWidth: focused ? 1.5 : 1, borderColor: focused ? c.accent : c.border }}>
      <TextInput placeholderTextColor={c.secondaryLabel} maxFontSizeMultiplier={1.6} accessibilityLabel={label ?? p.placeholder} {...p}
        onFocus={(e) => { setFocused(true); p.onFocus?.(e); }} onBlur={(e) => { setFocused(false); p.onBlur?.(e); }}
        style={[T.title3, { fontWeight: "400", flex: 1, color: c.label, minHeight: SIZE.input - 2, paddingVertical: 0, textAlign: "auto" }, Platform.OS === "web" && ({ outlineStyle: "none" } as object)]} />
      {trailing}
    </View>
  );
  if (!label) return box;
  return <View style={{ gap: 6 }}><Text variant="note" weight="600" tone="secondary" style={{ paddingHorizontal: S.xxs }}>{label}</Text>{box}</View>;
}

export function EmailField(p: TextInputProps) {
  const { t } = useT();
  return <Field label={t("Email")} placeholder="you@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" autoComplete="email" returnKeyType="next" testID="auth-email" {...p} />;
}

export function PasswordField({ isNew, ...p }: TextInputProps & { isNew?: boolean }) {
  const c = useColors(); const { t } = useT(); const [show, setShow] = useState(false);
  return (
    <Field label={isNew ? t("New password") : t("Password")} placeholder={isNew ? t("At least 8 characters") : ""} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false}
      textContentType={isNew ? "newPassword" : "password"} autoComplete={isNew ? "new-password" : "current-password"} passwordRules="minlength: 8;" testID="auth-password" {...p}
      trailing={<PressScale onPress={() => setShow(!show)} accessibilityRole="button" accessibilityLabel={show ? t("Hide password") : t("Show password")} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Icon name={show ? "eye.slash" : "eye"} size={18} color={c.secondaryLabel} /></PressScale>} />
  );
}

/** A quiet text link (44pt tall). */
export function TextLink({ title, onPress, tone = "secondary", testID }: { title: string; onPress: () => void; tone?: "secondary" | "tint"; testID?: string }) {
  return (
    <PressScale onPress={() => { tap(); onPress(); }} accessibilityRole="button" testID={testID} style={{ minHeight: HIT, alignItems: "center", justifyContent: "center", paddingHorizontal: S.xs }}>
      <Text variant="subhead" tone={tone} weight={tone === "tint" ? "600" : "500"} center>{title}</Text>
    </PressScale>
  );
}

/** Supabase lets one email go out per address per 60 s; the resend button waits that long. */
export const RESEND_SECONDS = 60;
export function useCooldown() {
  const [left, setLeft] = useState(0);
  useEffect(() => { if (left <= 0) return; const id = setTimeout(() => setLeft((n) => n - 1), 1000); return () => clearTimeout(id); }, [left]);
  return { left, start: () => setLeft(RESEND_SECONDS) };
}

/** "Check your email" (canvas MagicLink.dc.html), shared by sign-up, magic link and password reset: Globi with the
 *  envelope, the address, "Send the link again" and a way back. Use inside AuthShell with `bare`. */
export function EmailSent({ email, note, onResend, resending, left, onChangeEmail, changeLabel }: { email: string; note: string; onResend: () => void; resending: boolean; left: number; onChangeEmail: () => void; changeLabel?: string }) {
  const c = useColors(); const { t } = useT();
  return (
    <View style={{ flex: 1, gap: S.lg }} testID="email-sent">
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: S.lg, paddingVertical: S.xl }}>
        <View style={{ width: 180, height: 180, alignItems: "center", justifyContent: "center" }}>
          <GlobiPose pose="phone" size={165} />
          <View style={{ position: "absolute", end: 0, top: 4, width: 64, height: 48, borderRadius: 10, backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}>
            <Icon name="envelope.fill" size={24} color={c.accent} />
          </View>
        </View>
        <View style={{ gap: S.xs, alignItems: "center" }}>
          <Text variant="resultTitle" center accessibilityRole="header">{t("Check your email")}</Text>
          <Text variant="body" tone="secondary" center style={{ maxWidth: 300 }}>{t("Sent to {e}.", { e: email })} {note}</Text>
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Button title={left ? t("Send again in {s}s", { s: left }) : t("Send the link again")} variant="secondary" loading={resending} disabled={left > 0} onPress={onResend} />
        <TextLink title={changeLabel ?? t("Use a different email")} onPress={onChangeEmail} />
      </View>
    </View>
  );
}

/** Fast offline check before a request, so airplane mode gets an instant, clear message. Only "no network at all"
 *  counts: isInternetReachable pings a third-party URL that some networks block, so it would wrongly stop sign-in.
 *  Other connection failures are still reported from the request error (lib/authErrors.ts isNetworkError). */
export async function isOffline() {
  try { return (await NetInfo.refresh()).isConnected === false; } catch { return false; }
}
