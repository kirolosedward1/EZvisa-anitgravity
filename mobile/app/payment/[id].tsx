// Payment result. The return URL (and its r=success|cancel) only says how the checkout closed; it can pick between
// "pending" and "cancelled" but never shows "paid". Paid/failed come only from the server:
//   - visa_applications.payment_status (Supabase, signed in; set by the Ziina webhook),
//   - GET /api/check-payment?applicationId= (server sync with Ziina, once deployed; also works for guests),
//   - GET /api/check-payment?id= for the payment id the server returned to THIS device (stored, never from a URL).
// Ziina reporting "completed" while the row is not yet updated shows "Payment received · updating" and keeps checking.
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, ScrollView, View, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, HeaderIconButton, Icon, InfoNote, PrimaryButton, SecondaryButton, Text } from "../../components/ui";
import { GlobiPose, GLOBI_SIZE, type GlobiPose as Pose } from "../../components/globi/GlobiPose";
import { PushAsk, shouldAskPush } from "../../components/payment/PushAsk";
import { devPaymentPreview, paymentPhrase, paymentWaitPhase, usePaymentWaitClock, PAYMENT_SLOW_MS, PAYMENT_STALL_MS } from "../../components/payment/PaymentWait";
import { useColors, S } from "../../lib/theme";
import { referenceOf } from "../../lib/wizard";
import { useT } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { getApplication as loadApp, needsContinue, type Application } from "../../lib/data";
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
  const [app, setApp] = useState<Application | null>(null); const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [paidAt, setPaidAt] = useState<number | null>(null); const [ask, setAsk] = useState<null | (() => void)>(null);
  const headStart = preview === "slow" ? PAYMENT_SLOW_MS : preview === "stalled" ? PAYMENT_STALL_MS : 0;
  const elapsed = usePaymentWaitClock(state === "checking", attempt, headStart);
  const run = useRef(0); const pollSleep = useRef<(() => void) | null>(null);
  const returned = useRef(returnedParam === "cancel" || returnedParam === "closed" ? returnedParam : "success");
  const stateRef = useRef<State>(initialState);
  const OUTCOME: Partial<Record<State, "paid" | "pending" | "failed" | "cancelled">> = { paid: "paid", confirming: "paid", pending: "pending", failed: "failed", cancelled: "cancelled" };
  const show = (s: State) => { const o = OUTCOME[s]; if (o && stateRef.current !== s) { track("payment_finished", { outcome: o }); if (o === "paid") setPaidAt(Date.now()); } stateRef.current = s; setState(s); };

  const read = async (): Promise<Signals> => {
    let asked = 0, failed = 0;
    const attempt = async <T,>(f: () => Promise<T>): Promise<T | undefined> => { asked++; try { return await f(); } catch { failed++; return undefined; } };
    const p = await knownPayment(id!);
    const [server, db, intent] = await Promise.all([
      attempt(() => serverStatus(id!)),
      session ? attempt(async () => { const a = await loadApp(id!); setApp(a); setNeedsEmp(needsContinue(a)); return a.payment_status; }) : Promise.resolve(undefined),
      p ? attempt(() => intentStatus(p.paymentId)) : Promise.resolve(undefined),
    ]);
    if (!(asked > 0 && failed === asked)) setCheckedAt(Date.now());
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
      if (done === "paid") { show("paid"); success(); forgetPayment(id!); if (session) setupPush(false).catch(() => {}); return; }
      if (done === "failed") { show("failed"); hError(); forgetPayment(id!); return; }
      if (s.intent === "completed" && stateRef.current !== "confirming") { show("confirming"); success(); }
      if (s.intent && (s.intent === "completed" || PROCESSING.includes(s.intent))) until = Math.max(until, started + POLL_FOR);
      if (Date.now() > until) { show(unsettled(s, returned.current)); return; }
      let cancel: () => void = () => {};
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, POLL_MS);
        cancel = () => { clearTimeout(timer); resolve(); };
        const previous = pollSleep.current;
        pollSleep.current = cancel;
        previous?.();
      });
      if (pollSleep.current === cancel) pollSleep.current = null;
      if (run.current !== me) return;
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
      if (done === "paid") { show("paid"); success(); forgetPayment(id!); if (session) setupPush(false).catch(() => {}); }
      else if (done === "failed") { show("failed"); hError(); forgetPayment(id!); }
      else if (s.intent === "completed" && stateRef.current !== "confirming") { show("confirming"); success(); }
    } finally { quietBusy.current = false; }
  };

  useEffect(() => {
    if (preview) return;
    const h = setTimeout(verify, 0);
    return () => { clearTimeout(h); const wake = pollSleep.current; pollSleep.current = null; wake?.(); run.current++; };
  }, [id, !!session, preview]);
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
    const timer = setTimeout(() => { stateRef.current = "paid"; setState("paid"); setPaidAt(Date.now()); success(); }, preview === "success" ? 900 : 22_000);
    return () => clearTimeout(timer);
  }, [preview, attempt]);

  const retry = async () => {
    if (previewRef.current) { setAttempt((n) => n + 1); show("checking"); return; }
    if (paying) return;
    try { track("payment_started", { retry: true }); const o = await startPayment(id!); returned.current = o.returned; verify(); }
    catch (e: any) { if (e?.busy) return; if (e?.alreadyPaid) { returned.current = "success"; verify(); } else hError(); }
  };

  const guest = !session;
  const country = app?.destination_country || "";
  const ref = referenceOf(id ?? "");
  const amount = app?.total_amount ?? null;
  const clock = (ms: number | null) => ms ? new Date(ms).toLocaleTimeString(lang === "ar" ? "ar-AE" : "en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
  // Canvas: PaymentChecking / Pending / Stalled = thinking, Payment received = celebrate, Failed = puzzled, Cancelled and Offline = waiting.
  const GLOBI: Record<State, Pose> = { checking: "thinking", paid: "celebrate", confirming: "celebrate", pending: "thinking", failed: "puzzled", cancelled: "waiting", offline: "waiting" };
  // The 20s stall stays up through the verifier's "not confirmed yet" state. Quiet polling still promotes that to paid.
  const phase = state === "checking" ? paymentWaitPhase(elapsed) : null;
  const stalled = phase === "stalled" || (state === "pending" && elapsed >= PAYMENT_STALL_MS);
  const received = state === "paid" || state === "confirming";
  const TITLE: Record<State, string> = {
    checking: t("Checking your payment"), paid: t("Payment received"), confirming: t("Payment received"), pending: t("Payment not confirmed yet"),
    failed: t("Payment didn't go through"), cancelled: t("Payment cancelled"), offline: t("You're offline. Showing what I last saw."),
  };
  const LINE: Record<State, string> = {
    checking: phase === "slow" ? pt("Still confirming with the payment gateway…") : t("Confirming with your bank. A few seconds."),
    paid: [amount != null ? `${amount} AED` : "", ref, clock(paidAt)].filter(Boolean).join(" · "),
    confirming: t("Updating your application. This can take a minute."),
    pending: guest ? t("Sign in with the email you used to see the latest status.") : t("If you paid, it can take a minute to show. You don't need to stay here."),
    failed: t("You weren't charged. Try again, or pay on WhatsApp."),
    cancelled: t("Nothing was charged. Your answers are saved."),
    offline: t("I'll check your payment when you're back online"),
  };
  const title = stalled ? pt("Still confirming your payment") : TITLE[state];
  const line = stalled ? t("Taking longer than usual. You can leave; I'll notify you when it's done.") : LINE[state];
  const leave = () => router.replace(session ? `/applications/${id}` : "/", { withAnchor: true });
  const home = () => router.replace("/", { withAnchor: true });
  /** Once, after the first payment: the notification pre-prompt (canvas PushAsk) before the next screen. */
  const then = (go: () => void) => async () => { if (session && await shouldAskPush()) setAsk(() => go); else go(); };
  const next = then(() => router.replace(needsEmp ? `/continue/${id}` : `/applications/${id}`, { withAnchor: true }));
  const retryCheck = () => { if (previewRef.current) { setAttempt((n) => n + 1); show("checking"); return; } verify(); };
  const help = (m: string) => () => { track("whatsapp_handoff", { screen: "payment" }); whatsapp(m); };
  // V1 analytics: one payment_result per settled view (stalled and offline included).
  const result = stalled ? "stalled" : received ? "paid" : state === "checking" ? null : state;
  useEffect(() => { if (result) track("payment_result", { state: result }); }, [result]);
  useEffect(() => { if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(`${title}. ${line}`); }, [title, line]);

  const appRow = country ? `${t(country)} · ${ref}` : ref;
  const summary = (rows: [string, string][]) => (
    <Card testID="payment-summary">
      {rows.map(([k, v], i) => (
        <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: S.md, paddingHorizontal: S.md, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: c.separator }}>
          <Text variant="note" tone="secondary">{k}</Text>
          <Text variant="note" weight="600" style={{ flexShrink: 1, textAlign: "right" }}>{v}</Text>
        </View>
      ))}
    </Card>
  );
  const body = (() => {
    if (state === "checking" && !stalled) {
      const secs = Math.max(1, Math.round(elapsed / 1000));
      const steps: [string, "done" | "now" | "next", string?][] = [[t("Back from the payment page"), "done"], [t("Confirming the payment"), "now", t("{n} s", { n: secs })], [t("Updating your application"), "next"]];
      return (
        <Card padded testID="payment-steps">
          {steps.map(([label, st, right], i) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: c.separator }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: st === "done" ? c.success : st === "now" ? c.accent : c.fill }}>
                {st === "done" ? <Icon name="checkmark" size={12} color={c.onAccent} weight="bold" /> : st === "now" ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.onAccent }} /> : null}
              </View>
              <Text variant="optionSm" style={{ flex: 1 }} tone={st === "next" ? "secondary" : undefined}>{label}</Text>
              {!!right && <Text variant="note" tone="secondary" accessibilityLabel={t("{n} seconds", { n: secs })}>{right}</Text>}
            </View>
          ))}
        </Card>
      );
    }
    if (received && !guest) {
      const steps: [string, string][] = [
        ...(needsEmp ? [[t("A few more questions"), t("Trip dates, passport and job. About 3 minutes.")] as [string, string]] : []),
        [t("Upload your documents"), t("Photos of your passport, Emirates ID and bank statement are fine.")],
        [t("We prepare the file"), t("Ready in 1 to 2 days. We message you on WhatsApp.")],
      ];
      return (
        <Card padded testID="payment-next-steps">
          <View style={{ gap: S.md }}>
            {steps.map(([a, b], i) => (
              <View key={a} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: i ? c.fill : c.accent }}>
                  <Text variant="note" weight="600" color={i ? c.label : c.onAccent}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}><Text variant="optionSm" weight="600">{a}</Text><Text variant="note" tone="secondary">{b}</Text></View>
              </View>
            ))}
          </View>
        </Card>
      );
    }
    if (stalled) return <View style={{ gap: S.sm }}>{summary([[t("Application"), appRow]])}<InfoNote tone="info" icon="checkmark.shield.fill" text={t("If you were charged it will count, no second charge")} /></View>;
    if (state === "pending") return summary([[t("Application"), appRow], ...(amount != null ? [[t("Amount"), `${amount} AED`] as [string, string]] : []), ...(checkedAt ? [[t("Last checked"), clock(checkedAt)] as [string, string]] : [])]);
    if (state === "failed") return summary([[t("Application"), appRow], ...(amount != null ? [[t("Amount"), `${amount} AED`] as [string, string]] : [])]);
    if (state === "cancelled") return (
      <Card padded testID="payment-cancelled-card">
        <Text variant="optionSm" weight="600">{country ? t(country) : ref}</Text>
        <Text variant="note" tone="secondary">{[t("Submitted, not paid"), amount != null ? `${amount} AED` : ""].filter(Boolean).join(" · ")}</Text>
      </Card>
    );
    if (state === "offline") return <View style={{ gap: S.sm }}><InfoNote icon="wifi.slash" text={t("Nothing is lost. It updates when the connection returns.")} />{summary([[t("Application"), appRow], ...(checkedAt ? [[t("Last checked"), clock(checkedAt)] as [string, string]] : [])])}</View>;
    return null;
  })();

  const actions = (() => {
    const wa = (label: string, m: string) => <SecondaryButton whatsapp title={label} onPress={help(m)} testID="payment-whatsapp" />;
    if (stalled) return <>
      <PrimaryButton title={pt("Go to my application")} onPress={leave} testID="payment-leave" />
      <SecondaryButton title={t("Retry now")} onPress={retryCheck} testID="payment-retry" />
      {wa(t("Ask a person on WhatsApp"), "Hi EZvisa, my payment is still confirming.")}
    </>;
    if (state === "checking") return null;
    if (received && guest) return <PrimaryButton title={t("Sign in to continue")} onPress={() => router.replace({ pathname: "/auth", params: { mode: "signin" } })} />;
    if (received) return <>
      <PrimaryButton title={needsEmp ? t("Continue application") : t("Upload documents")} onPress={next} testID="payment-continue" />
      {state === "paid" && <SecondaryButton title={t("View receipt")} onPress={then(() => router.replace(`/receipt/${id}`, { withAnchor: true }))} testID="payment-receipt" />}
    </>;
    if (state === "pending") return <>
      {guest ? <PrimaryButton title={t("Sign in to continue")} onPress={() => router.replace({ pathname: "/auth", params: { mode: "signin" } })} /> : <PrimaryButton title={t("Check again")} onPress={verify} testID="payment-check" />}
      {wa(t("I paid but it isn't showing"), "Hi EZvisa, I paid but my payment isn't showing yet.")}
    </>;
    if (state === "failed") return <>
      <PrimaryButton title={paying ? t("Opening secure payment…") : t("Retry payment")} loading={paying} disabled={paying} onPress={retry} testID="payment-retry" />
      {wa(t("Pay via WhatsApp instead"), "Hi EZvisa, I need help paying for my application.")}
    </>;
    if (state === "cancelled") return <>
      <PrimaryButton title={paying ? t("Opening secure payment…") : t("Pay now")} loading={paying} disabled={paying} onPress={retry} testID="payment-retry" />
      <SecondaryButton title={t("Later, back to Home")} onPress={home} />
    </>;
    return <>
      <PrimaryButton title={t("Try again")} onPress={verify} testID="payment-check" />
      <SecondaryButton title={pt("Go to my application")} onPress={leave} />
    </>;
  })();
  const done = ["paid", "confirming", "pending", "failed", "cancelled"].includes(state) && !stalled;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: Platform.OS === "ios" ? S.sm : insets.top + S.sm }} testID="payment-result">
      <View style={{ height: 44, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", paddingHorizontal: S.gutter }}>
        {done && <HeaderIconButton icon="xmark" label={t("Done")} onPress={received ? then(leave) : leave} testID="payment-done" />}
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", gap: S.lg, paddingHorizontal: S.gutter, paddingBottom: S.lg }}>
        <View style={{ alignItems: "center", gap: S.sm }} accessibilityLiveRegion="polite">
          <GlobiPose pose={stalled ? "thinking" : GLOBI[state]} size={GLOBI_SIZE.result} animated={state === "checking" || received} />
          <Text variant="resultTitle" center accessibilityRole="header" testID="payment-state">{title}</Text>
          {!!line && <Text variant="callout" tone="secondary" center style={{ maxWidth: 320 }}>{line}</Text>}
        </View>
        {body}
      </ScrollView>
      <View style={{ paddingHorizontal: S.gutter, paddingBottom: Math.max(insets.bottom, S.lg), gap: 10 }}>
        {actions}
        {(state === "checking" || stalled) && <Text variant="caption" tone="secondary" center>{t("We keep checking in the background.")}</Text>}
      </View>
      <PushAsk visible={!!ask} country={country} onDone={() => { const go = ask; setAsk(null); go?.(); }} />
    </View>
  );
}
