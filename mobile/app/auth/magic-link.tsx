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

/** Passwordless sign-in, like the website's "Email Magic Link" tab. The link opens the app at /auth/callback. */
export default function MagicLink() {
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
      // Same as the website: an unknown email gets a new account (shouldCreateUser defaults to true).
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: authRedirect("magiclink") } });
      if (error) { fail(classifyAuthError(error)); return; }
      success(); setSent(true); cool.start();
    } catch (e) { fail(classifyAuthError(e)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return (
    <AuthShell nav="back" title={sent ? t("Check your email") : t("Sign in with a link")} subtitle={sent ? undefined : t("No password needed.")} testID="auth-magic">
      {sent ? (
        <>
          <EmailSent email={email} note={t("Open it on this phone. The link works once and expires after a while.")} onResend={send} resending={busy} left={cool.left} onChangeEmail={() => { setSent(false); setErr(null); }} />
          <InlineError text={err} />
        </>
      ) : (
        <View style={{ gap: S.sm }}>
          <EmailField value={mail} onChangeText={(v) => { setMail(v); setErr(null); }} onSubmitEditing={send} returnKeyType="send" autoFocus={!p.email} />
          <InlineError text={err} />
          <View style={{ marginTop: S.xs }}><Button title={t("Send link")} loading={busy} onPress={send} /></View>
        </View>
      )}
    </AuthShell>
  );
}
