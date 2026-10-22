// Deep-link target for the Ziina return (ezvisa://payment-return / exp://…/--/payment-return). Normally the in-app
// auth session catches it; if the OS opens it instead, go to the result screen, which checks the database.
// A guest who paid and comes back on a cold start has no session: continue as guest so the result screen is reachable.
import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../lib/auth";
export default function PaymentReturn() {
  const p = useLocalSearchParams<{ appId?: string; r?: string }>(); const { session, guest, loading, continueAsGuest } = useAuth();
  const id = (p.appId ?? "").replace(/[^0-9a-f-]/gi, "").slice(0, 36);
  const waiting = loading || (!session && !guest);
  useEffect(() => { if (!loading && !session && !guest) continueAsGuest(); }, [loading, session, guest, continueAsGuest]);
  if (waiting) return null;
  return <Redirect href={id ? { pathname: "/payment/[id]", params: { id, returned: p.r === "cancel" ? "cancel" : "success" } } : "/"} />;
}
