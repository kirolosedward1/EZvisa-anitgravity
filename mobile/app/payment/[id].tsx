// Payment result. The website's return URL only brings the user back; the result comes from the database
// (payment_status set by the Ziina webhook), polled briefly. Guests cannot read the row, so for them the
// Ziina status from our own create-payment id is shown and they are asked to sign in.
import { useEffect, useRef, useState } from "react";
import { View, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Icon, Text } from "../../components/ui";
import { useColors, S } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { getApplication, isPaid } from "../../lib/data";
import { checkPayment, startPayment, whatsapp } from "../../lib/api";
import { setupPush } from "../../lib/push";
import { employmentComplete } from "../../lib/wizard";
import { success, error as hError } from "../../lib/haptics";

type State = "checking" | "paid" | "pending" | "failed" | "cancelled" | "guest-paid" | "guest-pending";
const POLL_MS = 2000, POLL_FOR = 30_000;

export default function PaymentResult() {
  const { id, returned, pid } = useLocalSearchParams<{ id: string; returned?: string; pid?: string }>();
  const c = useColors(); const { t } = useT(); const insets = useSafeAreaInsets(); const { session } = useAuth();
  const [state, setState] = useState<State>("checking"); const [needsEmp, setNeedsEmp] = useState(false); const [busy, setBusy] = useState(false);
  const run = useRef(0);
  const verify = async () => {
    const me = ++run.current; setState("checking");
    const until = Date.now() + (returned === "success" ? POLL_FOR : 6000);
    while (run.current === me) {
      if (session) {
        try {
          const a = await getApplication(id!);
          if (isPaid(a)) { setNeedsEmp(!employmentComplete((a.notes?.wizard ?? {}) as any)); setState("paid"); success(); setupPush(true).catch(() => {}); return; }
          if (["failed", "expired"].includes(String(a.payment_status))) { setState("failed"); hError(); return; }
        } catch { /* keep polling */ }
      } else if (pid) {
        const z = await checkPayment(pid);
        if (z === "completed") { setState("guest-paid"); success(); return; }
        if (z === "failed" || z === "canceled") { setState(returned === "cancel" ? "cancelled" : "failed"); return; }
      }
      if (Date.now() > until) { setState(returned === "cancel" || returned === "closed" ? "cancelled" : session ? "pending" : "guest-pending"); return; }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  };
  useEffect(() => { verify(); return () => { run.current++; }; }, [id, !!session]);
  const retry = async () => {
    if (busy) return; setBusy(true);
    try { const a = await getApplication(id!).catch(() => null); const o = await startPayment({ id: id!, destination_country: a?.destination_country ?? null, total_amount: a?.total_amount }, (a?.applicants.length ?? 1) > 1);
      router.setParams({ returned: o.returned, pid: o.paymentId ?? "" }); setTimeout(verify, 50); }
    catch (e: any) { if (e?.alreadyPaid) verify(); else hError(); } finally { setBusy(false); }
  };
  const V: Record<State, { icon: any; color: string; title: string; body: string }> = {
    checking: { icon: "hourglass", color: c.tint, title: t("Checking your payment…"), body: t("This takes a few seconds.") },
    paid: { icon: "checkmark.circle.fill", color: c.green, title: t("Payment received"), body: needsEmp ? t("Next, add your employment details, then upload your documents.") : t("You can upload your documents now.") },
    pending: { icon: "clock.fill", color: c.tint, title: t("Payment not confirmed yet"), body: t("If you paid, it can take a minute to show. We'll update your application automatically.") },
    failed: { icon: "exclamationmark.circle.fill", color: c.red, title: t("Payment didn't go through"), body: t("You weren't charged. Try again or pay on WhatsApp.") },
    cancelled: { icon: "xmark.circle.fill", color: c.secondaryLabel, title: t("Payment cancelled"), body: t("Nothing was charged. You can pay whenever you're ready.") },
    "guest-paid": { icon: "checkmark.circle.fill", color: c.green, title: t("Payment received"), body: t("Sign in with the email you used to continue your application.") },
    "guest-pending": { icon: "clock.fill", color: c.tint, title: t("Payment not confirmed yet"), body: t("Sign in with the email you used to see the latest status.") },
  };
  const v = V[state];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: Platform.OS === "ios" ? S.lg : insets.top + S.lg }} testID="payment-result">
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: S.md, padding: S.xl }}>
        <Icon name={v.icon} size={56} color={v.color} />
        <Text variant="title1" center accessibilityRole="header" testID="payment-state">{v.title}</Text>
        <Text variant="body" tone="secondary" center>{v.body}</Text>
      </View>
      <View style={{ paddingHorizontal: S.lg, paddingBottom: Math.max(insets.bottom, S.lg), gap: S.xs }}>
        {state === "paid" && <Button title={needsEmp ? t("Continue application") : t("Upload documents")} onPress={() => router.replace(needsEmp ? `/continue/${id}` : `/applications/${id}`)} />}
        {(state === "guest-paid" || state === "guest-pending") && <Button title={t("Sign in to continue")} onPress={() => router.replace({ pathname: "/auth", params: { mode: "signin" } })} />}
        {state === "pending" && <Button title={t("Check again")} variant="secondary" onPress={verify} />}
        {(state === "failed" || state === "cancelled") && <Button title={busy ? t("Opening secure payment…") : t("Try again")} loading={busy} disabled={busy} onPress={retry} />}
        {(state === "failed" || state === "pending") && <Button title={t("Pay via WhatsApp instead")} variant="plain" color={c.label} onPress={() => whatsapp("Hi EZvisa, I need help paying for my application.")} />}
        {state !== "checking" && <Button title={t("Done")} variant="plain" color={c.label} onPress={() => router.replace(session ? `/applications/${id}` : "/")} />}
      </View>
    </View>
  );
}
