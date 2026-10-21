import React, { useEffect } from "react";
import { View, Pressable, Image, StyleProp, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming, useReducedMotion } from "react-native-reanimated";
import { router } from "expo-router";
import { useColors, S, R, curve, SPRING } from "../../lib/theme";
import { FLAG_SVG } from "../../assets/flags";
import { STATUS_LABEL, type Application } from "../../lib/data";
import { useT } from "../../lib/i18n";
import { tap, success as hSuccess } from "../../lib/haptics";
import { Text } from "./Text";
import { Icon, PressScale } from "./core";

/** Circular flag (HatScripts circle-flags, MIT) with a hairline ring. */
export function Flag({ country, size = 28 }: { country?: string | null; size?: number }) {
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
}

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
export function StatusPill({ v }: { v: string }) {
  const { t } = useT();
  const c = useColors(); const col = STATUS_TONE(c, v);
  return <View style={[{ backgroundColor: col + "1F", borderRadius: R.chip, paddingHorizontal: S.xs, paddingVertical: S.xxs, alignSelf: "flex-start" }, curve]}><Text variant="caption" weight="600" color={col}>{t(STATUS_LABEL[v] ?? v)}</Text></View>;
}

// Customer-facing journey, from the live columns only: application_status (website/admin: submitted -> reviewing -> ready |
// cancelled) and payment_status (set by the Ziina webhook). Dates are shown only where the row really has one.
export const JOURNEY = ["submitted", "paid", "reviewing", "ready"] as const;
const JOURNEY_LABEL = ["Submitted", "Paid", "In review", "File ready"];
const PAID = (p?: string | null) => p === "paid" || p === "completed";
export function journeyIndex(status: string, payment?: string | null) {
  if (status === "draft") return -1;
  if (["ready", "approved", "completed"].includes(status)) return 3;
  if (["reviewing", "awaiting_documents", "appointment_booked"].includes(status)) return 2;
  if (PAID(payment)) return 1;
  return 0;
}
export function MiniProgress({ status, payment }: { status: string; payment?: string | null }) {
  const c = useColors(); const idx = journeyIndex(status, payment);
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }} accessible accessibilityLabel={`Step ${idx + 1} of 4`}>
      {JOURNEY.map((_, i) => (
        <React.Fragment key={i}>
          <View style={{ width: 10, height: 10, borderRadius: R.xs, backgroundColor: i <= idx ? c.tint : c.fill }} />
          {i < JOURNEY.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: i < idx ? c.tint : c.fill }} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const fmtDT = (s: string) => new Date(s).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export function Timeline({ a, t = (s: string) => s }: { a: Application; t?: (s: string) => string }) {
  const c = useColors(); const idx = journeyIndex(a.status, a.payment_status);
  const cancelled = a.status === "cancelled" || a.status === "rejected";
  // Real timestamps only: created_at for "Submitted"; updated_at for the latest reached step (we don't know earlier ones).
  const when = (i: number) => (i === 0 ? a.created_at : i === idx && idx > 0 ? a.updated_at : null);
  const steps = cancelled ? [...JOURNEY.slice(0, Math.max(1, idx + 1)).map((_, i) => JOURNEY_LABEL[i]), a.status === "rejected" ? "Refused" : "Cancelled"] : JOURNEY_LABEL;
  const cur = cancelled ? steps.length - 1 : idx;
  return (
    <View style={{ paddingHorizontal: S.md, paddingVertical: S.sm }} testID="timeline">
      {steps.map((label, i) => {
        const done = i <= cur; const last = i === steps.length - 1; const at = cancelled && last ? a.updated_at : when(i);
        const tone = cancelled && last ? c.red : c.tint;
        return (
          <View key={i} style={{ flexDirection: "row", gap: S.sm, minHeight: last ? 28 : 52 }} accessible accessibilityLabel={`${t(label)}${done ? `, ${t("done")}` : ""}${at && done ? `, ${fmtDT(at)}` : ""}`}>
            <View style={{ alignItems: "center", width: 16 }}>
              <View style={{ width: 14, height: 14, borderRadius: R.sm, marginTop: S.xxs, backgroundColor: done ? tone : "transparent", borderWidth: 2, borderColor: done ? tone : c.tertiaryLabel, alignItems: "center", justifyContent: "center" }}>
                {done && <Icon name={cancelled && last ? "xmark" : "checkmark"} size={8} color="#fff" weight="bold" />}
              </View>
              {!last && <View style={{ flex: 1, width: 2, marginVertical: S.xxs, backgroundColor: i < cur ? c.tint : c.fill }} />}
            </View>
            <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", gap: S.xs }}>
              <Text variant="body" weight={i === cur ? "600" : "400"} tone={done ? "label" : "secondary"} style={{ flex: 1 }}>{t(label)}</Text>
              {!!at && done && <Text variant="footnote" tone="secondary" tabular>{fmtDT(at)}</Text>}
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
        <Text variant="subhead" tone="secondary" numberOfLines={1} tabular>{[a.reference, fmtShort(a.entry_date)].filter(Boolean).join(" · ")}</Text>
      </View>
      <StatusPill v={a.status} />
      <ChevronR />
    </PressScale>
  );
}
const ChevronR = () => { const c = useColors(); return <Icon name="chevron.right" size={13} color={c.tertiaryLabel} weight="semibold" />; };

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
  const c = useColors(); const name = a.countries?.name ?? "";
  return (
    <PressScale onPress={() => { tap(); router.push(`/applications/${a.id}`, { withAnchor: true }); }} accessibilityRole="button" accessibilityLabel={`${name} application ${a.reference}, ${STATUS_LABEL[a.status] ?? a.status}. View`}
      style={[{ backgroundColor: c.card, borderRadius: R.card, padding: S.md, marginHorizontal: S.md, gap: S.md }, curve]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
        <Flag country={name} size={40} />
        <View style={{ flex: 1 }}><Text variant="headline">{name}</Text><Text variant="subhead" tone="secondary" tabular>{a.reference}</Text></View>
        <StatusPill v={a.status} />
      </View>
      <MiniProgress status={a.status} payment={a.payment_status} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="subhead" tone="secondary">{STATUS_LABEL[a.status] ?? a.status}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.xxs }}><Text variant="subhead" tone="tint" weight="600">View</Text><Icon name="chevron.right" size={12} color={c.tint} weight="semibold" /></View>
      </View>
    </PressScale>
  );
}

export function HeroImage({ source, style }: { source: any; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ aspectRatio: 4 / 3, backgroundColor: c.fill, overflow: "hidden" }, style]}><Image source={source} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors /><View style={{ position: "absolute", inset: 0, backgroundColor: c.label === "#FFFFFF" ? "rgba(0,0,0,0.2)" : "transparent" } as ViewStyle} /></View>;
}
