import { useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { AuthShell, PasswordField, TextLink, isOffline } from "../../components/auth/AuthShell";
import { Button, InlineError, Text } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { AUTH_MESSAGE, classifyAuthError, MIN_PASSWORD, type AuthIssue } from "../../lib/authErrors";
import { success, error as hError } from "../../lib/haptics";
import { S } from "../../lib/theme";
import { useT } from "../../lib/i18n";

/** After a reset link: the user is signed in and picks a new password (same as the website's /reset-password). */
export default function ResetPassword() {
  const { t } = useT(); const { session, setRecovery } = useAuth();
  const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false); const inFlight = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  const fail = (k: AuthIssue) => { hError(); setErr(t(AUTH_MESSAGE[k])); };
  const done = () => { setRecovery(false); router.replace("/"); };
  const save = async () => {
    if (!supabase || inFlight.current) return;
    if (pw.length < MIN_PASSWORD) { fail("weak-password"); return; }
    inFlight.current = true; setBusy(true); setErr(null);
    try {
      if (await isOffline()) { fail("offline"); return; }
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) { fail(classifyAuthError(error)); return; }
      success(); done();
    } catch (e) { fail(classifyAuthError(e)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  if (!session) return (
    <AuthShell nav="close" pose="lock" title={t("Reset password")} testID="auth-reset-nosession">
      <View style={{ gap: S.md }}>
        <Text variant="body" tone="secondary">{t("Open the reset link from your email on this phone.")}</Text>
        <Button title={t("Send reset link")} onPress={() => router.replace("/auth/forgot")} />
      </View>
    </AuthShell>
  );
  return (
    <AuthShell nav="none" pose="lock" title={t("Choose a new password")} testID="auth-reset">
      <View style={{ gap: S.sm }}>
        <PasswordField isNew value={pw} onChangeText={(v) => { setPw(v); setErr(null); }} onSubmitEditing={save} returnKeyType="done" autoFocus />
        {!err && <Text variant="footnote" tone="secondary" style={{ marginHorizontal: S.xs }}>{t("At least 8 characters.")}</Text>}
        <InlineError text={err} />
        <View style={{ marginTop: S.xs }}><Button title={t("Save password")} loading={busy} onPress={save} /></View>
        <TextLink title={t("Not now")} onPress={done} />
      </View>
    </AuthShell>
  );
}
