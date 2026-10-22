import { useRef, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AuthShell, EmailField, EmailSent, isOffline, useCooldown } from "../../components/auth/AuthShell";
import { Button, InlineError } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { authRedirect } from "../../lib/authLinks";
import { AUTH_MESSAGE, classifyAuthError, EMAIL_RE, type AuthIssue } from "../../lib/authErrors";
import { success, error as hError } from "../../lib/haptics";
import { S } from "../../lib/theme";
import { useT } from "../../lib/i18n";

/** Password reset email. The link opens the app at /auth/callback?type=recovery, which leads to /auth/reset. */
export default function Forgot() {
  const { t } = useT(); const p = useLocalSearchParams<{ email?: string }>();
  const [mail, setMail] = useState(p.email ?? ""); const email = mail.trim().toLowerCase();
  const [busy, setBusy] = useState(false); const inFlight = useRef(false);
  const [err, setErr] = useState<string | null>(null); const [sent, setSent] = useState(false); const cool = useCooldown();
  const fail = (k: AuthIssue) => { hError(); setErr(t(AUTH_MESSAGE[k])); };
  const send = async () => {
    if (!supabase || inFlight.current) return;
    if (!EMAIL_RE.test(email)) { fail("invalid-email"); return; }
    inFlight.current = true; setBusy(true); setErr(null);
    try {
      if (await isOffline()) { fail("offline"); return; }
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirect("recovery") });
      if (error) { fail(classifyAuthError(error)); return; }
      success(); setSent(true); cool.start();
    } catch (e) { fail(classifyAuthError(e)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return (
    <AuthShell nav="back" title={sent ? t("Check your email") : t("Reset password")} subtitle={sent ? undefined : t("We'll email you a link to choose a new one.")} testID="auth-forgot">
      {sent ? (
        <>
          <EmailSent email={email} note={t("If there's an account for this email, the link is on its way. Open it on this phone.")} onResend={send} resending={busy} left={cool.left} onChangeEmail={() => { setSent(false); setErr(null); }} />
          <InlineError text={err} />
        </>
      ) : (
        <View style={{ gap: S.sm }}>
          <EmailField value={mail} onChangeText={(v) => { setMail(v); setErr(null); }} onSubmitEditing={send} returnKeyType="send" autoFocus={!p.email} />
          <InlineError text={err} />
          <View style={{ marginTop: S.xs }}><Button title={t("Send reset link")} loading={busy} onPress={send} /></View>
        </View>
      )}
    </AuthShell>
  );
}
