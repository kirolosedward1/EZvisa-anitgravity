// Shared frame for the auth screens: top bar (logo + close, or back), large title, optional one-line subtitle, content.
import { useEffect, useState } from "react";
import { I18nManager, KeyboardAvoidingView, Platform, ScrollView, TextInput, TextInputProps, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { Logo } from "../Logo";
import { Button, Icon, PressScale, Text } from "../ui";
import { useColors, T, S, R, HIT } from "../../lib/theme";
import { tap } from "../../lib/haptics";
import { useT } from "../../lib/i18n";

export function closeAuth() {
  if (router.canGoBack()) router.back(); else router.replace("/");
}

export function AuthShell({ title, subtitle, nav = "close", children, testID }: { title: string; subtitle?: string; nav?: "close" | "back" | "none"; children: React.ReactNode; testID?: string }) {
  const c = useColors(); const { t, rtl } = useT(); const insets = useSafeAreaInsets();
  const back = () => { tap(); if (router.canGoBack()) router.back(); else router.replace("/auth"); };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} testID={testID}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.lg, paddingTop: Platform.OS === "ios" ? S.md : insets.top + S.xs, minHeight: 56 }}>
        {nav === "back" ? (
          <PressScale onPress={back} accessibilityRole="button" accessibilityLabel={t("Back")} hitSlop={4} style={{ width: HIT, height: HIT, borderRadius: R.round, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
            <Icon name="chevron.left" size={16} color={c.label} weight="bold" style={{ transform: [{ scaleX: rtl || I18nManager.isRTL ? -1 : 1 }] }} />
          </PressScale>
        ) : <Logo height={22} />}
        {nav === "close" && (
          <PressScale onPress={() => { tap(); closeAuth(); }} accessibilityRole="button" accessibilityLabel={t("Close")} hitSlop={4} style={{ width: HIT, height: HIT, borderRadius: R.round, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
            <Icon name="xmark" size={14} color={c.label} weight="bold" />
          </PressScale>
        )}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: S.lg, paddingTop: S.xxl, paddingBottom: Math.max(insets.bottom, S.lg) + S.xl }}>
        <Text variant="largeTitle" accessibilityRole="header">{title}</Text>
        {!!subtitle && <Text variant="body" tone="secondary" style={{ marginTop: S.xs }}>{subtitle}</Text>}
        <View style={{ height: S.xxl }} />
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Text input on the card fill, 56pt tall, Dynamic Type capped at 1.6x so it never clips. */
export function Field({ trailing, ...p }: TextInputProps & { trailing?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: R.input, minHeight: 56, paddingHorizontal: S.md, gap: S.xs }}>
      <TextInput placeholderTextColor={c.secondaryLabel} maxFontSizeMultiplier={1.6} accessibilityLabel={p.placeholder} {...p}
        style={[T.body, { flex: 1, color: c.label, minHeight: 56, paddingVertical: 0, textAlign: "auto" }, Platform.OS === "web" && ({ outlineStyle: "none" } as object)]} />
      {trailing}
    </View>
  );
}

export function EmailField(p: TextInputProps) {
  const { t } = useT();
  return <Field placeholder={t("Email")} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" autoComplete="email" returnKeyType="next" testID="auth-email" {...p} />;
}

export function PasswordField({ isNew, ...p }: TextInputProps & { isNew?: boolean }) {
  const c = useColors(); const { t } = useT(); const [show, setShow] = useState(false);
  return (
    <Field placeholder={isNew ? t("New password") : t("Password")} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false}
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

/** "Check your email" state shared by sign-up, magic link and password reset. */
export function EmailSent({ email, note, onResend, resending, left, onChangeEmail }: { email: string; note: string; onResend: () => void; resending: boolean; left: number; onChangeEmail: () => void }) {
  const c = useColors(); const { t } = useT();
  return (
    <View style={{ gap: S.md }} testID="email-sent">
      <View style={{ width: 64, height: 64, borderRadius: R.round, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name="envelope.fill" size={26} color={c.tint} />
      </View>
      <Text variant="body">{t("We sent a link to {e}.", { e: email })}</Text>
      <Text variant="subhead" tone="secondary">{note}</Text>
      <View style={{ gap: S.xs, marginTop: S.sm }}>
        <Button title={left ? t("Send again in {s}s", { s: left }) : t("Send again")} variant="secondary" loading={resending} disabled={left > 0} onPress={onResend} />
        <TextLink title={t("Use a different email")} onPress={onChangeEmail} />
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
