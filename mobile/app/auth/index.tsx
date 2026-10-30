import { requestWizardStart } from "../../lib/onboarding";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { AuthForm } from "../../components/AuthForm";
import { AuthShell, closeAuth } from "../../components/auth/AuthShell";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";

/** Sign in / create account. Closes itself once a session exists (route protection then shows Home). */
export default function SignIn() {
  const { t } = useT(); const { session, recovery, continueAsGuest, guest: guestMode } = useAuth();
  // "Continue without an account": guest mode, then straight into the wizard (canvas SignIn).
  // Already a guest (the app side is mounted): open the wizard now. From signed out, guest mode switches the protected
  // routes first, so the root opens the wizard afterwards (lib/onboarding.ts).
  const guest = () => {
    if (router.canDismiss()) router.dismissAll();
    if (guestMode) { setTimeout(() => router.replace("/apply"), 0); return; }
    requestWizardStart(); continueAsGuest();
  };
  const p = useLocalSearchParams<{ mode?: string; email?: string }>();
  const [mode, setMode] = useState<"signin" | "signup">(p.mode === "signup" ? "signup" : "signin");
  useEffect(() => { if (session && !recovery) closeAuth(); }, [session, recovery]);
  return (
    <AuthShell nav="back" pose="welcome" title={mode === "signin" ? t("Welcome back") : t("Create your account")} testID={`auth-${mode}`}>
      <AuthForm mode={mode} onMode={setMode} initialEmail={p.email} onGuest={guest} />
    </AuthShell>
  );
}
