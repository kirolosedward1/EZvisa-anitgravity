import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { AuthForm } from "../../components/AuthForm";
import { AuthShell, closeAuth } from "../../components/auth/AuthShell";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";

/** Sign in / create account. Closes itself once a session exists (route protection then shows Home). */
export default function SignIn() {
  const { t } = useT(); const { session, recovery } = useAuth();
  const p = useLocalSearchParams<{ mode?: string; email?: string }>();
  const [mode, setMode] = useState<"signin" | "signup">(p.mode === "signup" ? "signup" : "signin");
  useEffect(() => { if (session && !recovery) closeAuth(); }, [session, recovery]);
  return (
    <AuthShell title={mode === "signin" ? t("Welcome back") : t("Create your\naccount")} subtitle={mode === "signin" ? t("Use the same account as ezvisa.net.") : undefined} testID={`auth-${mode}`}>
      <AuthForm mode={mode} onMode={setMode} initialEmail={p.email} />
    </AuthShell>
  );
}
