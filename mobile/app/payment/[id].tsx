// Payment result. The return URL (and its r=success|cancel) only says how the checkout closed; it can pick between
// "pending" and "cancelled" but never shows "paid". Paid/failed come only from the server:
//   - visa_applications.payment_status (Supabase, signed in; set by the Ziina webhook),
//   - GET /api/check-payment?applicationId= (server sync with Ziina, once deployed; also works for guests),
//   - GET /api/check-payment?id= for the payment id the server returned to THIS device (stored, never from a URL).
// Ziina reporting "completed" while the row is not yet updated shows "Payment received · updating" and keeps checking.
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, View, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Icon, Text, type IconName } from "../../components/ui";
import { PaymentMark } from "../../components/payment/PaymentMark";
import { PaymentStallActions, devPaymentPreview, paymentPhrase, paymentWaitPhase, usePaymentWaitClock, PAYMENT_SLOW_MS, PAYMENT_STALL_MS } from "../../components/payment/PaymentWait";
import { useColors, S } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { getApplication, needsContinue } from "../../lib/data";
import { whatsapp } from "../../lib/api";
import { forgetPayment, intentStatus, knownPayment, serverStatus, startPayment, usePaying, type ServerStatus } from "../../lib/payments";
import { setupPush } from "../../lib/push";
import { success, error as hError } from "../../lib/haptics";
import { track } from "../../lib/analytics";

type State = "checking" | "paid" | "confirming" | "pending" | "failed" | "cancelled" | "offline";
type Signals = { server?: ServerStatus | null; db?: string | null; intent?: string | null; offline: boolean };
const POLL_MS = 2000, POLL_FOR = 30_000, POLL_SHORT = 8_000;
/** After the first window: keep checking quietly while "not confirmed / updating" is on screen (webhook delay). */
const QUIET_EVERY = 10_000, QUIET_FOR = 5 * 60_000;
const PAID = ["paid", "completed"];
const PROCESSING = ["pending", "requires_user_action"];

/** Paid / failed from server data only; null while undecided. */
function settled(s: Signals): "paid" | "failed" | null {
  if ([s.server?.payment_status, s.db].some((x) => PAID.includes(String(x ?? "")))) return "paid";
  if (s.intent === "failed") return "failed";
  // A failed row from an earlier attempt doesn't count while this device's checkout is still open.
  if (!s.intent && [s.server?.payment_status, s.db].includes("failed")) return "failed";
  return null;
}
/** After polling: what to show when nothing settled. */
function unsettled(s: Signals, returned: string): State {
  if (s.intent === "completed") return "confirming";
  if (s.intent && PROCESSING.includes(s.intent)) return "pending";
  return returned === "success" ? "pending" : "cancelled";
}

export default function PaymentResult() {
  const { id, returned: returnedParam, preview: previewParam } = useLocalSearchParams<{ id: string; returned?: string; preview?: string | string[] }>();
  // Dev only (?preview=checking|slow|stalled|timers|success|late|failure). Ignored in production, and it never calls Ziina.
  const preview = devPaymentPreview(previewParam); const previewRef = useRef(preview);
  useEffect(() => { previewRef.current = preview; }, [preview]);
  const c = useColors(); const { t, lang } = useT(); const pt = (s: string) => paymentPhrase(lang, s, t);
  const insets = useSafeAreaInsets(); const { session } = useAuth();
  const initialState: State = preview === "failure" ? "failed" : "checking";
  const [state, setState] = useState<State>(initialState); const [needsEmp, setNeedsEmp] = useState(false); const paying = usePaying();
  const [attempt, setAttempt] = useState(0);
  const headStart = preview === "slow" ? PAYMENT_SLOW_MS : preview === "stalled" ? PAYMENT_STALL_MS : 0;
  const elapsed = usePaymentWaitClock(state === "checking", attempt, headStart);
  const run = useRef(0); const returned = useRef(returnedParam === "cancel" || returnedParam === "closed" ? returnedParam : "success");
  const stateRef = useRef<State>(initialState);
  const OUTCOME: Partial<Record<State, "paid" | "pending" | "failed" | "cancelled">> = { paid: "paid", confirming: "paid", pending: "pending", failed: "failed", cancelled: "cancelled" };
  const show = (s: State) => { const o = OUTCOME[s]; if (o && stateRef.current !== s) track("payment_finished", { outcome: o }); stateRef.current = s; setState(s); };

  const read = async (): Promise<Signals> => {
    let asked = 0, failed = 0;
    const attempt = async <T,>(f: () => Promise<T>): Promise<T | undefined> => { asked++; try { return await f(); } catch { failed++; return undefined; } };
    const p = await knownPayment(id!);
    const [server, db, intent] = await Promise.all([
      attempt(() => serverStatus(id!)),
      session ? attempt(async () => { const a = await getApplication(id!); setNeedsEmp(needsContinue(a)); return a.payment_status; }) : Promise.resolve(undefined),
      p ? attempt(() => intentStatus(p.paymentId)) : Promise.resolve(undefined),
    ]);
    return { server, db, intent, offline: asked > 0 && failed === asked };
  };

  const verify = async () => {
    if (previewRef.current) return; // dev preview paints the states itself
    setAttempt((n) => n + 1); // restart the 8s / 20s copy clock with this attempt
    const me = ++run.current;
    show("checking");
    const started = Date.now(); let until = started + (returned.current === "success" ? POLL_FOR : POLL_SHORT);
    for (;;) {
      const s = await read();
      if (run.current !== me) return;
      if (s.offline) { show("offline"); return; } // every request failed: no network (re-checked below)
      const done = settled(s);
      if (done === "paid") { show("paid"); success(); forgetPayment(id!); if (session) setupPush(true).catch(() => {}); return; }
      if (done === "failed") { show("failed"); hError(); forgetPayment(id!); return; }
      if (s.intent === "completed" && stateRef.current !== "confirming") { show("confirming"); success(); }
      if (s.intent && (s.intent === "completed" || PROCESSING.includes(s.intent))) until = Math.max(until, started + POLL_FOR);
      if (Date.now() > until) { show(unsettled(s, returned.current)); return; }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  };

  // Quiet re-check (no "checking" flash): upgrades pending/confirming to paid or failed as soon as the server knows.
  const openedAt = useRef(Date.now()); const quietBusy = useRef(false);
  const quiet = async () => {
    if (quietBusy.current || !["pending", "confirming"].includes(stateRef.current)) return;
    quietBusy.current = true; const me = run.current;
    try {
      const s = await read();
      if (run.current !== me || !["pending", "confirming"].includes(stateRef.current) || s.offline) return;
      const done = settled(s);
      if (done === "paid") { show("paid"); success(); forgetPayment(id!); if (session) setupPush(true).catch(() => {}); }
      else if (done === "failed") { show("failed"); hError(); forgetPayment(id!); }
      else if (s.intent === "completed" && stateRef.current !== "confirming") { show("confirming"); success(); }
    } finally { quietBusy.current = false; }
  };

  useEffect(() => { if (preview) return; const h = setTimeout(verify, 0); return () => { clearTimeout(h); run.current++; }; }, [id, !!session, preview]);
  useEffect(() => {
    if (preview) return;
    const tick = setInterval(() => { if (Date.now() - openedAt.current < QUIET_FOR) quiet(); }, QUIET_EVERY);
    return () => clearInterval(tick);
  }, [id, !!session, preview]);
  // Back online (NetInfo, plus a light 5 s retry while offline), or back from another app (e.g. a banking app for
  // 3-D Secure): check again if not settled.
  useEffect(() => {
    if (preview) return;
    const again = () => { if (["pending", "confirming", "offline"].includes(stateRef.current)) verify(); };
    const net = NetInfo.addEventListener((n) => { if (n.isConnected && stateRef.current === "offline") verify(); });
    const app = AppState.addEventListener("change", (a) => { if (a === "active") again(); });
    const tick = setInterval(() => { if (stateRef.current === "offline") verify(); }, 5000);
    return () => { net(); app.remove(); clearInterval(tick); };
  }, [id, !!session, preview]);
  // Dev preview resolves itself: success morphs after 0.9s, late confirms at 22s (through the stalled screen). Retry cancels that.
  useEffect(() => {
    if (!preview || attempt > 0) return;
    if (preview === "failure") { hError(); return; }
    if (preview !== "success" && preview !== "late") return;
    const timer = setTimeout(() => { stateRef.current = "paid"; setState("paid"); success(); }, preview === "success" ? 900 : 22_000);
    return () => clearTimeout(timer);
  }, [preview, attempt]);

  const retry = async () => {
    if (previewRef.current) { setAttempt((n) => n + 1); show("checking"); return; }
    if (paying) return;
    try { track("payment_started", { retry: true }); const o = await startPayment(id!); returned.current = o.returned; verify(); }
    catch (e: any) { if (e?.busy) return; if (e?.alreadyPaid) { returned.current = "success"; verify(); } else hError(); }
  };

  const guest = !session;
  const V: Record<State, { icon: IconName | null; color: string; title: string; body: string }> = {
    checking: { icon: null, color: c.tint, title: t("Checking your payment…"), body: t("This takes a few seconds.") },
    paid: { icon: "checkmark.circle.fill", color: c.green, title: t("Payment received"), body: guest ? t("Sign in with the email you used to continue your application.") : needsEmp ? t("Next, add your passport number and employment details, then upload your documents.") : t("You can upload your documents now.") },
    confirming: { icon: "checkmark.circle.fill", color: c.green, title: t("Payment received"), body: guest ? t("Sign in with the email you used to continue your application.") : t("Updating your application. This can take a minute.") },
    pending: { icon: "clock.fill", color: c.tint, title: t("Payment not confirmed yet"), body: guest ? t("Sign in with the email you used to see the latest status.") : t("If you paid, it can take a minute to show. We'll update your application automatically.") },
    failed: { icon: "exclamationmark.circle.fill", color: c.red, title: t("Payment didn't go through"), body: t("You weren't charged. Try again or pay on WhatsApp.") },
    cancelled: { icon: "xmark.circle.fill", color: c.secondaryLabel, title: t("Payment cancelled"), body: t("Nothing was charged. You can pay whenever you're ready.") },
    offline: { icon: "wifi.slash", color: c.secondaryLabel, title: t("You're offline"), body: t("We'll check your payment when you're back online.") },
  };
  const v = V[state];
  // The 20s stall stays up through the verifier's "not confirmed yet" state. Quiet polling still promotes that to paid,
  // and the same mark morphs into the check — the screen does not swap to a different result view underneath the user.
  const phase = state === "checking" ? paymentWaitPhase(elapsed) : null;
  const stalled = phase === "stalled" || (state === "pending" && elapsed >= PAYMENT_STALL_MS);
  const title = stalled ? pt("Still confirming your payment") : v.title;
  const body = stalled ? pt("We'll keep checking in the background.") : phase === "slow" ? pt("Still confirming with Ziina…") : v.body;
  const mark = state === "failed" ? "failure" as const : state === "paid" || state === "confirming" ? "success" as const : state === "checking" || stalled ? "checking" as const : null;
  const leave = () => router.replace(session ? `/applications/${id}` : "/", { withAnchor: true });
  const retryCheck = () => { if (previewRef.current) { setAttempt((n) => n + 1); show("checking"); return; } verify(); };
  useEffect(() => { if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(`${title}. ${body}`); }, [title, body]);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: Platform.OS === "ios" ? S.lg : insets.top + S.lg }} testID="payment-result">
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: S.md, padding: S.xl }}>
        {mark ? <PaymentMark mode={mark} paused={stalled} label={title} /> : v.icon ? <Icon name={v.icon} size={56} color={v.color} /> : null}
        <View accessibilityLiveRegion="polite" style={{ alignItems: "center", gap: S.md }}>
          <Text variant="title1" center accessibilityRole="header" testID="payment-state">{title}</Text>
          <Text variant="body" tone="secondary" center>{body}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: S.lg, paddingBottom: Math.max(insets.bottom, S.lg), gap: S.xs }}>
        {stalled && <PaymentStallActions retryLabel={t("Retry")} leaveLabel={pt("Go to my application")} onRetry={retryCheck} onLeave={leave} />}
        {state === "paid" && !guest && <Button title={needsEmp ? t("Continue application") : t("Upload documents")} onPress={() => router.replace(needsEmp ? `/continue/${id}` : `/applications/${id}`, { withAnchor: true })} />}
        {guest && ["paid", "confirming", "pending"].includes(state) && !stalled && <Button title={t("Sign in to continue")} onPress={() => router.replace({ pathname: "/auth", params: { mode: "signin" } })} />}
        {["pending", "confirming", "offline"].includes(state) && !stalled && <Button title={t("Check again")} variant="secondary" onPress={verify} />}
        {(state === "failed" || state === "cancelled") && <Button title={paying ? t("Opening secure payment…") : state === "failed" ? t("Retry") : t("Try again")} loading={paying} disabled={paying} onPress={retry} />}
        {(state === "failed" || (state === "pending" && !stalled)) && <Button title={t("Pay via WhatsApp instead")} variant="plain" color={c.label} onPress={() => whatsapp("Hi EZvisa, I need help paying for my application.")} />}
        {state !== "checking" && !stalled && <Button title={t("Done")} variant="plain" color={c.label} onPress={leave} />}
      </View>
    </View>
  );
}
