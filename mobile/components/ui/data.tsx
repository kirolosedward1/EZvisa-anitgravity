import { useState } from "react";
import { nextAction } from "../../lib/nextStep";
import { stage } from "../../lib/stage";
import React, { memo, useEffect } from "react";
import { View, Pressable, Image, StyleProp, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming, useReducedMotion } from "react-native-reanimated";
import { router } from "expo-router";
import { useColors, S, R, curve, SPRING } from "../../lib/theme";
import { FLAG_SVG } from "../../assets/flags";
import { STATUS_LABEL, type Application } from "../../lib/data";
import { buildTimeline, type Step } from "../../lib/timeline";
import { useT, ltr } from "../../lib/i18n";
import { tap, success as hSuccess } from "../../lib/haptics";
import { Text } from "./Text";
import { Icon, PressScale, Chevron } from "./core";

/** Circular flag (HatScripts circle-flags, MIT) with a hairline ring. Memoised: list rows re-render on every search keystroke,
 *  and re-rendering an SVG tree per row was the main cost of the country / nationality lists. */
export const Flag = memo(function Flag({ country, size = 28 }: { country?: string | null; size?: number }) {
  const c = useColors();
  const xml = country ? FLAG_SVG[country] : undefined;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: c.fill }}>
      {xml ? <SvgXml xml={xml} width={size} height={size} /> : country === "Other" ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Icon name="globe" size={size * 0.55} color={c.secondaryLabel} /></View>
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text variant="caption" tone="secondary">{(country ?? "?").slice(0, 2).toUpperCase()}</Text></View>
      )}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, borderRadius: size / 2, borderWidth: 1, borderColor: c.ring } as ViewStyle} />
    </View>
  );
});

export function FlagChip({ country, onPress, selected }: { country: string; onPress: () => void; selected?: boolean }) {
  const c = useColors();
  return (
    <PressScale onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={country} accessibilityState={{ selected: !!selected }} style={{ width: 72, alignItems: "center", gap: S.xs }}>
      <View style={{ padding: S.xxs, borderRadius: R.round, borderWidth: 2, borderColor: selected ? c.tint : "transparent" }}><Flag country={country} size={56} /></View>
      <Text variant="footnote" weight="500" numberOfLines={1} color={selected ? c.tint : undefined}>{country}</Text>
    </PressScale>
  );
}

const STATUS_TONE = (c: ReturnType<typeof useColors>, v: string) => (({ paid: c.green, completed: c.green, approved: c.green, ready: c.green, generated: c.green, rejected: c.red, failed: c.red, cancelled: c.grey, draft: c.grey, reviewing: c.orange, under_review: c.orange, processing: c.orange, awaiting_documents: c.orange, pending: c.orange, submitted: c.blue, appointment_booked: c.indigo, uploaded: c.blue } as Record<string, string>)[v] ?? c.grey);
export function StatusPill({ v, a }: { v: string; a?: { status: string; payment_status?: string | null } }) {
  const { t } = useT();
  const c = useColors(); const st = a ? stage(a) : null; const col = st ? st.color ?? (c as any)[st.tone] ?? c.grey : STATUS_TONE(c, v); v = st ? st.key : v;
  return <View style={[{ backgroundColor: col + "1F", borderRadius: R.chip, paddingHorizontal: S.xs, paddingVertical: S.xxs, alignSelf: "flex-start" }, curve]}><Text variant="caption" weight="600" color={col}>{t(st ? st.label : STATUS_LABEL[v] ?? v)}</Text></View>;
}

/** Status pill plus, for a paid application with something left to do, the specific action (lib/nextStep), 8pt after it.
 *  Falls back to "Action required" when the full label doesn't fit on the row (e.g. 375 pt wide). */
export function StatusPills({ a }: { a: Application }) {
  const { t } = useT(); const act = nextAction(a as any);
  const [rowW, setRowW] = useState(0); const [needW, setNeedW] = useState(0);
  const short = !!act && rowW > 0 && needW + 8 > rowW; // 8pt margin: rounding/font metrics differ by a few px
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }} onLayout={(e) => setRowW(e.nativeEvent.layout.width)} testID="status-pills">
      {/* Invisible measure of the full-length pair, so the choice doesn't flicker. */}
      {act && <View pointerEvents="none" style={{ position: "absolute", opacity: 0, flexDirection: "row", gap: 8 }} onLayout={(e) => setNeedW(e.nativeEvent.layout.width)}>
        <StatusPill v={a.status} a={a} /><ActionPill label={t(act.label)} />
      </View>}
      <StatusPill v={a.status} a={a} />
      {act && <ActionPill label={t(short ? act.short : act.label)} />}
    </View>
  );
}
export function ActionPill({ label }: { label: string }) {
  return <View style={[{ backgroundColor: "#FFF1E6", borderRadius: R.chip, paddingHorizontal: S.xs, paddingVertical: S.xxs, alignSelf: "flex-start" }, curve]} testID="action-pill"><Text variant="caption" weight="600" color="#B83200" numberOfLines={1}>{label}</Text></View>;
}

// Customer-facing journey, from the live columns only: application_status (website/admin: submitted -> reviewing -> ready |
// cancelled) and payment_status (set by the Ziina webhook). Dates are shown only where the row really has one.
export const JOURNEY = ["submitted", "paid", "reviewing", "ready"] as const;
const PAID = (p?: string | null) => p === "paid" || p === "completed";
export function journeyIndex(status: string, payment?: string | null) {
  if (status === "draft") return -1;
  if (["ready", "approved", "completed"].includes(status)) return 3;
  if (["reviewing", "awaiting_documents", "appointment_booked"].includes(status)) return 2;
  if (PAID(payment)) return 1;
  return 0;
}
export function MiniProgress({ status, payment }: { status: string; payment?: string | null }) {
  const c = useColors(); const { t } = useT(); const idx = journeyIndex(status, payment);
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }} accessible accessibilityLabel={t("Step {i} of {n}", { i: idx + 1, n: 4 })}>
      {JOURNEY.map((_, i) => (
        <React.Fragment key={i}>
          <View style={{ width: 10, height: 10, borderRadius: R.xs, backgroundColor: i <= idx ? c.tint : c.fill }} />
          {i < JOURNEY.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: i < idx ? c.tint : c.fill }} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const fmtDT = (s: string, lang?: string) => new Date(s).toLocaleString(lang === "ar" ? "ar" : undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtAppt = (s: string, lang?: string) => new Date(s).toLocaleString(lang === "ar" ? "ar" : undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** Five-step status timeline (lib/timeline.ts). A step shows as done only when the row says so, and a time only when
 *  the row has a real one; there is no placeholder or estimated date. */
export function Timeline({ a }: { a: Application; t?: (s: string) => string }) {
  const c = useColors(); const { t, lang } = useT();
  const steps = buildTimeline(a);
  const tone = (st: Step["state"], key: Step["key"]) => (st === "done" || st === "current" ? c.tint : st === "attention" ? c.orange : st === "failed" ? (key === "decision" && a.status === "cancelled" ? c.secondaryLabel : c.red) : c.tertiaryLabel);
  return (
    <View style={{ paddingHorizontal: S.md, paddingVertical: S.sm }} testID="timeline">
      {steps.map((s, i) => {
        const last = i === steps.length - 1; const col = tone(s.state, s.key); const filled = s.state === "done" || s.state === "attention" || s.state === "failed";
        const when = s.at ? (s.scheduled ? fmtAppt(s.at, lang) : fmtDT(s.at, lang)) : null;
        const reached = s.state !== "todo";
        const stateWord = s.state === "done" ? t("done") : s.state === "current" ? t("in progress") : s.state === "attention" ? t("needs attention") : s.state === "todo" ? t("not yet") : "";
        return (
          <View key={s.key} style={{ flexDirection: "row", gap: S.sm, minHeight: last ? 28 : 52 }} accessible testID={`step-${s.key}`}
            accessibilityLabel={[t(s.label), stateWord, s.note && t(s.note), when].filter(Boolean).join(", ")}>
            <View style={{ alignItems: "center", width: 16 }}>
              <View style={{ width: 16, height: 16, borderRadius: R.sm, marginTop: S.xxs, backgroundColor: filled ? col : "transparent", borderWidth: 2, borderColor: col, alignItems: "center", justifyContent: "center" }}>
                {s.state === "done" && <Icon name="checkmark" size={8} color="#fff" weight="bold" />}
                {s.state === "failed" && <Icon name="xmark" size={8} color="#fff" weight="bold" />}
                {s.state === "attention" && <Icon name="exclamationmark" size={8} color="#fff" weight="bold" />}
                {s.state === "current" && <View style={{ width: 6, height: 6, borderRadius: R.xs, backgroundColor: col }} />}
              </View>
              {!last && <View style={{ flex: 1, width: 2, marginVertical: S.xxs, backgroundColor: s.state === "done" ? c.tint : c.fill }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : S.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: S.xs }}>
                <Text variant="body" weight={s.state === "current" || s.state === "attention" ? "600" : "400"} tone={reached ? "label" : "secondary"} color={s.state === "attention" || s.state === "failed" ? col : undefined} style={{ flex: 1 }}>{t(s.label)}</Text>
                {!!when && <Text variant="footnote" tone="secondary" tabular>{when}</Text>}
              </View>
              {!!s.note && <Text variant="footnote" tone="secondary" numberOfLines={2}>{t(s.note)}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function SuccessCheck({ size = 88 }: { size?: number }) {
  const c = useColors(); const reduce = useReducedMotion(); const s = useSharedValue(reduce ? 1 : 0.4); const o = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { hSuccess(); if (!reduce) { s.value = withSpring(1, SPRING.pop); o.value = withTiming(1, { duration: 180 }); } }, []);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: o.value }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.green, alignItems: "center", justifyContent: "center" }, a]} accessibilityLabel="Success"><Icon name="checkmark" size={size * 0.45} color="#fff" weight="bold" /></Animated.View>;
}

/** Small check that pops in (spring) next to a "saved" message. Haptic is fired by the caller. Reduce Motion: no pop. */
export function SavedCheck({ tone = "green" }: { tone?: "green" | "accent" }) {
  const c = useColors(); const reduce = useReducedMotion(); const s = useSharedValue(reduce ? 1 : 0.3);
  useEffect(() => { if (!reduce) s.value = withSpring(1, SPRING.pop); }, []);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: Math.min(1, s.value * 1.4) }));
  const col = tone === "green" ? c.green : c.accent;
  return <Animated.View testID="saved-check" style={[{ width: 22, height: 22, borderRadius: R.round, backgroundColor: col, alignItems: "center", justifyContent: "center" }, a]} accessibilityElementsHidden><Icon name="checkmark" size={12} color="#fff" weight="bold" /></Animated.View>;
}

const fmtShort = (s?: string | null) => (s ? new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");
export function ApplicationRow({ a }: { a: Application }) {
  const name = a.countries?.name ?? "Application";
  return (
    <PressScale onPress={() => { tap(); router.push(`/applications/${a.id}`, { withAnchor: true }); }} accessibilityRole="button" accessibilityLabel={`${name}, ${a.reference}, ${STATUS_LABEL[a.status] ?? a.status}`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.md, paddingVertical: S.sm, minHeight: 64, opacity: pressed ? 0.6 : 1 })}>
      <Flag country={name} size={40} />
      <View style={{ flex: 1, gap: S.xxs }}>
        <Text variant="headline" numberOfLines={1}>{name}</Text>
        <Text variant="subhead" tone="secondary" numberOfLines={1} tabular>{[ltr(a.reference), fmtShort(a.entry_date)].filter(Boolean).join(" · ")}</Text>
      </View>
      <StatusPill v={a.status} a={a} />
      <ChevronR />
    </PressScale>
  );
}
const ChevronR = () => <Chevron size={13} />;

export function CountryRow({ name, onPress }: { name: string; onPress: () => void }) {
  return (
    <PressScale onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={name}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.md, minHeight: 52, opacity: pressed ? 0.6 : 1 })}>
      <Flag country={name} size={28} />
      <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>{name}</Text>
      <ChevronR />
    </PressScale>
  );
}

export function StatusHeroCard({ a }: { a: Application }) {
  const c = useColors(); const { t } = useT(); const name = a.countries?.name ?? ""; const status = t(stage(a).label);
  return (
    <PressScale onPress={() => { tap(); router.push(`/applications/${a.id}`, { withAnchor: true }); }} accessibilityRole="button" accessibilityLabel={`${t(name)}, ${a.reference}, ${status}`}
      style={[{ backgroundColor: c.card, borderRadius: R.card, padding: S.md, marginHorizontal: S.md, gap: S.md }, curve]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
        <Flag country={name} size={40} />
        <View style={{ flex: 1 }}><Text variant="headline">{t(name)}</Text><Text variant="subhead" tone="secondary" tabular>{ltr(a.reference)}</Text></View>
        <StatusPill v={a.status} a={a} />
      </View>
      <MiniProgress status={a.status} payment={a.payment_status} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="subhead" tone="secondary">{status}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.xxs }}><Text variant="subhead" tone="tint" weight="600">{t("View")}</Text><Icon name="chevron.right" size={12} color={c.tint} weight="semibold" /></View>
      </View>
    </PressScale>
  );
}

export function HeroImage({ source, style }: { source: any; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ aspectRatio: 4 / 3, backgroundColor: c.fill, overflow: "hidden" }, style]}><Image source={source} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors /><View style={{ position: "absolute", inset: 0, backgroundColor: c.label === "#FFFFFF" ? "rgba(0,0,0,0.2)" : "transparent" } as ViewStyle} /></View>;
}
