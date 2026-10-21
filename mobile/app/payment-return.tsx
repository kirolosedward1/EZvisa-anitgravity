// Deep-link target for the Ziina return (ezvisa://payment-return / exp://…/--/payment-return). Normally the in-app
// auth session catches it; if the OS opens it instead, go to the result screen, which checks the database.
import { Redirect, useLocalSearchParams } from "expo-router";
export default function PaymentReturn() {
  const p = useLocalSearchParams<{ appId?: string; r?: string }>();
  const id = (p.appId ?? "").replace(/[^0-9a-f-]/gi, "").slice(0, 36);
  return <Redirect href={id ? { pathname: "/payment/[id]", params: { id, returned: p.r === "cancel" ? "cancel" : "success" } } : "/"} />;
}
