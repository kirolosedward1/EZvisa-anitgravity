// Copy, clock and the stalled-payment actions for the payment result screen.
// The verifier in app/payment/[id].tsx is unchanged; this only decides what that wait looks like.
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Button, PressScale, Text } from "../ui";
import { curve, R, S, useColors } from "../../lib/theme";
import { tap } from "../../lib/haptics";
import type { Lang } from "../../lib/i18n";

export const PAYMENT_SLOW_MS = 8_000;
export const PAYMENT_STALL_MS = 20_000;

const PREVIEWS = new Set(["checking", "slow", "stalled", "timers", "success", "late", "failure"]);

/** Dev-only `?preview=` on /payment/[id]. Empty in production, so it can never skip a real check. */
export function devPaymentPreview(raw: string | string[] | undefined): string {
  if (!__DEV__) return "";
  const v = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  return PREVIEWS.has(v) ? v : "";
}

export function paymentWaitPhase(elapsedMs: number): "checking" | "slow" | "stalled" {
  if (elapsedMs >= PAYMENT_STALL_MS) return "stalled";
  if (elapsedMs >= PAYMENT_SLOW_MS) return "slow";
  return "checking";
}

// New strings live here so this change doesn't touch the shared Arabic catalogue.
const AR: Record<string, string> = {
  "Still confirming with the payment gateway…": "ما زلنا نؤكد الدفع مع بوابة الدفع…",
  "Still confirming your payment": "ما زلنا نؤكد دفعك",
  "We'll keep checking in the background.": "سنواصل التحقق في الخلفية.",
  "Go to my application": "الانتقال إلى طلبي",
};

export function paymentPhrase(lang: Lang, english: string, t: (s: string) => string) {
  if (lang === "ar" && AR[english]) return AR[english];
  return t(english);
}

/**
 * Elapsed time while the result screen is still on "checking".
 * Re-renders at 8s and at 20s, then stops. When the wait ends, the value freezes at the real
 * time spent (capped at 20s) so a late handoff to "not confirmed" still counts as stalled.
 * `headStart` is only for the dev preview (jump straight to the slow or stalled copy).
 */
export function usePaymentWaitClock(active: boolean, resetKey: number, headStart: number) {
  const origin = useRef(0);
  const [elapsed, setElapsed] = useState(Math.min(headStart, PAYMENT_STALL_MS));
  useEffect(() => {
    const passed = () => (origin.current === 0 ? Math.min(headStart, PAYMENT_STALL_MS) : Math.min(Math.max(0, Date.now() - origin.current), PAYMENT_STALL_MS));
    if (!active) { if (origin.current !== 0) setElapsed(passed()); return; }
    origin.current = Date.now() - (resetKey === 0 ? Math.min(headStart, PAYMENT_STALL_MS) : 0);
    setElapsed(passed());
    const slowIn = PAYMENT_SLOW_MS - (Date.now() - origin.current);
    const stallIn = PAYMENT_STALL_MS - (Date.now() - origin.current);
    const slow = slowIn > 0 ? setTimeout(() => setElapsed(PAYMENT_SLOW_MS), slowIn) : 0;
    const stall = stallIn > 0 ? setTimeout(() => setElapsed(PAYMENT_STALL_MS), stallIn) : 0;
    return () => { if (slow) clearTimeout(slow); if (stall) clearTimeout(stall); };
  }, [active, resetKey, headStart]);
  return elapsed;
}


/** Shown once the check has run for 20s. Polling continues behind these. */
export function PaymentStallActions({ retryLabel, leaveLabel, onRetry, onLeave }: { retryLabel: string; leaveLabel: string; onRetry: () => void; onLeave: () => void }) {
  const c = useColors(); const BRAND = c.accent; const BORDER = c.border;
  return (
    <>
      <View testID="payment-retry"><Button title={retryLabel} onPress={onRetry} /></View>
      <PressScale
        testID="payment-leave"
        onPress={() => { tap(); onLeave(); }}
        accessibilityRole="button"
        accessibilityLabel={leaveLabel}
        style={[{ minHeight: 48, borderRadius: R.button, paddingHorizontal: S.lg, paddingVertical: S.xs, alignItems: "center", justifyContent: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: BORDER }, curve]}
      >
        <Text variant="headline" weight="600" color={BRAND} numberOfLines={2} center style={{ flexShrink: 1 }}>{leaveLabel}</Text>
      </PressScale>
    </>
  );
}
