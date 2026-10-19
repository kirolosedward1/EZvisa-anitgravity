import React, { useEffect } from "react";
import { View, Pressable, Image, StyleProp, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming, useReducedMotion } from "react-native-reanimated";
import { router } from "expo-router";
import { useColors, S, R, curve, SPRING } from "../../lib/theme";
import { FLAG_SVG } from "../../assets/flags";
import { STATUS_LABEL, type Application } from "../../lib/data";
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
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: size * 0.6 }}>🌐</Text></View>
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
    <PressScale onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={country} accessibilityState={{ selected: !!selected }} style={{ width: 72, alignItems: "center", gap: 6 }}>
      <View style={{ padding: 3, borderRadius: 34, borderWidth: 2, borderColor: selected ? c.tint : "transparent" }}><Flag country={country} size={56} /></View>
      <Text variant="footnote" weight="500" numberOfLines={1} color={selected ? c.tint : undefined}>{country}</Text>
    </PressScale>
  );
}

const STATUS_TONE = (c: ReturnType<typeof useColors>, v: string) => (({ paid: c.green, completed: c.green, approved: c.green, ready: c.green, generated: c.green, rejected: c.red, failed: c.red, cancelled: c.grey, draft: c.grey, reviewing: c.orange, under_review: c.orange, processing: c.orange, awaiting_documents: c.orange, pending: c.orange, submitted: c.blue, appointment_booked: c.indigo, uploaded: c.blue } as Record<string, string>)[v] ?? c.grey);
export function StatusPill({ v }: { v: string }) {
  const c = useColors(); const col = STATUS_TONE(c, v);
  return <View style={[{ backgroundColor: col + "1F", borderRadius: R.chip, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" }, curve]}><Text variant="caption" weight="600" color={col}>{STATUS_LABEL[v] ?? v}</Text></View>;
}

// Customer-facing journey for the timeline / mini progress.
export const JOURNEY = ["submitted", "reviewing", "appointment_booked", "completed"] as const;
const JOURNEY_LABEL = ["Submitted", "In review", "Appointment", "Decision"];
export function journeyIndex(status: string) {
  if (status === "draft") return -1;
  if (["completed", "approved", "ready", "rejected"].includes(status)) return 3;
  if (status === "appointment_booked") return 2;
  if (["reviewing", "awaiting_documents"].includes(status)) return 1;
  return 0;
}
export function MiniProgress({ status }: { status: string }) {
  const c = useColors(); const idx = journeyIndex(status);
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }} accessible accessibilityLabel={`Step ${idx + 1} of 4`}>
      {JOURNEY.map((_, i) => (
        <React.Fragment key={i}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i <= idx ? c.tint : c.fill }} />
          {i < JOURNEY.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: i < idx ? c.tint : c.fill }} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const fmtDT = (s: string) => new Date(s).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export function Timeline({ status, history }: { status: string; history: { to_status: string; created_at: string; note?: string | null }[] }) {
  const c = useColors(); const idx = journeyIndex(status);
  const when = (i: number) => history.filter((h) => journeyIndex(h.to_status) === i).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return (
    <View style={{ paddingHorizontal: S.md, paddingVertical: S.sm }}>
      {JOURNEY.map((_, i) => {
        const done = i <= idx; const h = when(i); const last = i === JOURNEY.length - 1;
        const label = i === 3 && ["rejected"].includes(status) ? "Refused" : i === idx ? (STATUS_LABEL[status] ?? JOURNEY_LABEL[i]) : JOURNEY_LABEL[i];
        return (
          <View key={i} style={{ flexDirection: "row", gap: S.sm, minHeight: last ? 28 : 52 }} accessible accessibilityLabel={`${label}${done ? ", done" : ""}${h ? `, ${fmtDT(h.created_at)}` : ""}`}>
            <View style={{ alignItems: "center", width: 16 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, marginTop: 4, backgroundColor: done ? c.tint : "transparent", borderWidth: 2, borderColor: done ? c.tint : c.tertiaryLabel, alignItems: "center", justifyContent: "center" }}>
                {done && <Icon name="checkmark" size={8} color="#fff" weight="bold" />}
              </View>
              {!last && <View style={{ flex: 1, width: 2, marginVertical: 2, backgroundColor: i < idx ? c.tint : c.fill }} />}
            </View>
            <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", gap: S.xs }}>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight={i === idx ? "600" : "400"} tone={done ? "label" : "secondary"}>{label}</Text>
                {!!h?.note && <Text variant="footnote" tone="secondary">{h.note}</Text>}
              </View>
              {!!h && <Text variant="footnote" tone="secondary" tabular>{fmtDT(h.created_at)}</Text>}
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

const fmtShort = (s?: string | null) => (s ? new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");
export function ApplicationRow({ a }: { a: Application }) {
  const name = a.countries?.name ?? "Application";
  return (
    <Pressable onPress={() => { tap(); router.push(`/applications/${a.id}`); }} accessibilityRole="button" accessibilityLabel={`${name}, ${a.reference}, ${STATUS_LABEL[a.status] ?? a.status}`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.md, paddingVertical: S.sm, minHeight: 64, opacity: pressed ? 0.6 : 1 })}>
      <Flag country={name} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline" numberOfLines={1}>{name}</Text>
        <Text variant="subhead" tone="secondary" numberOfLines={1} tabular>{[a.reference, fmtShort(a.entry_date)].filter(Boolean).join(" · ")}</Text>
      </View>
      <StatusPill v={a.status} />
      <ChevronR />
    </Pressable>
  );
}
const ChevronR = () => { const c = useColors(); return <Icon name="chevron.right" size={13} color={c.tertiaryLabel} weight="semibold" />; };

export function CountryRow({ name, onPress }: { name: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={name}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.md, minHeight: 52, opacity: pressed ? 0.6 : 1 })}>
      <Flag country={name} size={28} />
      <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>{name}</Text>
      <ChevronR />
    </Pressable>
  );
}

export function StatusHeroCard({ a }: { a: Application }) {
  const c = useColors(); const name = a.countries?.name ?? "";
  return (
    <PressScale onPress={() => { tap(); router.push(`/applications/${a.id}`); }} accessibilityRole="button" accessibilityLabel={`${name} application ${a.reference}, ${STATUS_LABEL[a.status] ?? a.status}. View`}
      style={[{ backgroundColor: c.card, borderRadius: R.card, padding: S.md, marginHorizontal: S.md, gap: S.md }, curve]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
        <Flag country={name} size={40} />
        <View style={{ flex: 1 }}><Text variant="headline">{name}</Text><Text variant="subhead" tone="secondary" tabular>{a.reference}</Text></View>
        <StatusPill v={a.status} />
      </View>
      <MiniProgress status={a.status} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="subhead" tone="secondary">{STATUS_LABEL[a.status] ?? a.status}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Text variant="subhead" tone="tint" weight="600">View</Text><Icon name="chevron.right" size={12} color={c.tint} weight="semibold" /></View>
      </View>
    </PressScale>
  );
}

export function HeroImage({ source, style }: { source: any; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ aspectRatio: 4 / 3, backgroundColor: c.fill, overflow: "hidden" }, style]}><Image source={source} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors /><View style={{ position: "absolute", inset: 0, backgroundColor: c.label === "#FFFFFF" ? "rgba(0,0,0,0.2)" : "transparent" } as ViewStyle} /></View>;
}
