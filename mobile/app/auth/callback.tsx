// Landing screen for email links: ezvisa://auth/callback?code=…&type=signup|magiclink|recovery (exp://…/--/auth/callback in
// Expo Go). Exchanges the code for a session, then goes Home, or to "Set a new password" for a reset link.
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ExpoLinking from "expo-linking";
import { AuthShell } from "../../components/auth/AuthShell";
import { Logo } from "../../components/Logo";
import { Button, Skeleton, Text } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { completeAuth, parseAuthUrl, type LinkParams } from "../../lib/authLinks";
import { AUTH_MESSAGE, type AuthIssue } from "../../lib/authErrors";
import { success, error as hError } from "../../lib/haptics";
import { useColors, S } from "../../lib/theme";
import { useT } from "../../lib/i18n";

const KEYS = ["code", "type", "error", "error_code", "error_description", "access_token", "refresh_token"] as const;

export default function AuthCallback() {
  const c = useColors(); const { t } = useT(); const { setRecovery } = useAuth();
  const params = useLocalSearchParams<Record<string, string>>(); const url = ExpoLinking.useLinkingURL();
  const [issue, setIssue] = useState<AuthIssue | null>(null); const [run, setRun] = useState(0);
  const started = useRef(-1);
  const p: LinkParams = { ...(url?.includes("auth/callback") ? parseAuthUrl(url) : {}) };
  for (const k of KEYS) if (typeof params[k] === "string" && params[k]) p[k] = params[k];
  const type = p.type;

  useEffect(() => {
    if (started.current === run) return;
    started.current = run; setIssue(null);
    completeAuth(p).then((r) => {
      if (r.ok) {
        success();
        if (r.recovery) { setRecovery(true); router.replace("/auth/reset"); } else router.replace("/");
      } else { hError(); setIssue(r.issue); }
    });
    // Runs once per attempt (`run`), never on parameter changes: a code can be exchanged only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  if (!issue) return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: S.lg }} accessible accessibilityLabel={t("Signing you in")} testID="auth-callback-loading">
      <Logo height={30} />
      <Skeleton w={160} h={12} r={6} />
    </View>
  );

  // A sign-up link opened elsewhere still confirms the email on the server; only the sign-in part needs this phone.
  const confirmedElsewhere = type === "signup" && issue === "other-device";
  const title = confirmedElsewhere ? t("Email confirmed") : issue === "offline" ? t("You're offline") : t("This link didn't work");
  const message = confirmedElsewhere ? t("Sign in with your email and password.") : t(AUTH_MESSAGE[issue]);
  const again = type === "recovery" ? { title: t("Send a new reset link"), to: "/auth/forgot" as const }
    : type === "magiclink" ? { title: t("Send a new link"), to: "/auth/magic-link" as const }
    : { title: t("Sign in"), to: "/auth" as const };
  return (
    <AuthShell nav="none" pose="puzzled" title={title} testID="auth-callback-error">
      <View style={{ gap: S.sm }}>
        <Text variant="body" tone="secondary">{message}</Text>
        <View style={{ height: S.md }} />
        {issue === "offline"
          ? <Button title={t("Try again")} onPress={() => setRun((n) => n + 1)} />
          : <Button title={confirmedElsewhere ? t("Sign in") : again.title} onPress={() => router.replace(confirmedElsewhere ? "/auth" : again.to)} />}
        <Button title={t("Not now")} variant="plain" color={c.label} onPress={() => router.replace("/")} />
      </View>
    </AuthShell>
  );
}
