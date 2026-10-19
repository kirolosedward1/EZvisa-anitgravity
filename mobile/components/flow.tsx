// Building blocks for the one-question-per-screen application flow.
import { useEffect, useState } from "react";
import { Platform, Pressable, Switch, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useColors, useIsDark, S, R, T, curve } from "../lib/theme";
import { Icon, IconName, PressScale, Text, Flag, InlineError } from "./ui";
import { select } from "../lib/haptics";

export function FlowProgress({ value }: { value: number }) {
  const c = useColors(); const w = useSharedValue(value);
  useEffect(() => { w.value = withTiming(value, { duration: 320, easing: Easing.out(Easing.cubic) }); }, [value]);
  const a = useAnimatedStyle(() => ({ width: `${Math.max(0.04, w.value) * 100}%` as any }));
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={{ height: 4, borderRadius: R.xs, backgroundColor: c.card, overflow: "hidden" }}><Animated.View style={[{ height: 4, borderRadius: R.xs, backgroundColor: c.tint }, a]} /></View>;
}

export function CircleButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const c = useColors();
  return <PressScale onPress={() => { select(); onPress(); }} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={{ width: 44, height: 44, borderRadius: R.round, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={15} color={c.label} weight="bold" /></PressScale>;
}

/** Full-width selectable row with a leading icon or flag. */
export function ChoiceRow({ label, sub, icon, country, selected, onPress }: { label: string; sub?: string; icon?: IconName; country?: string; selected?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <PressScale onPress={() => { select(); onPress(); }} accessibilityRole="radio" accessibilityState={{ checked: !!selected }} aria-checked={!!selected} accessibilityLabel={sub ? `${label}, ${sub}` : label}
      style={[{ minHeight: 64, borderRadius: R.tile, paddingHorizontal: S.md, flexDirection: "row", alignItems: "center", gap: S.sm, backgroundColor: selected ? c.tintFill : c.card }, curve]}>
      {country ? <Flag country={country} size={36} /> : icon ? <Icon name={icon} size={20} color={selected ? "#fff" : c.label} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="headline" color={selected ? "#fff" : undefined}>{label}</Text>
        {!!sub && <Text variant="subhead" color={selected ? "rgba(255,255,255,0.8)" : c.secondaryLabel}>{sub}</Text>}
      </View>
      {selected && <Icon name="checkmark" size={16} color="#fff" weight="bold" />}
    </PressScale>
  );
}

/** Two-column big tappable tile with an SF Symbol. */
export function ChoiceTile({ label, icon, selected, onPress }: { label: string; icon: IconName; selected?: boolean; onPress: () => void }) {
  const c = useColors(); const { width } = useWindowDimensions(); const w = Math.floor((Math.min(width, 600) - S.lg * 2 - S.sm) / 2);
  return (
    <PressScale onPress={() => { select(); onPress(); }} accessibilityRole="radio" accessibilityState={{ checked: !!selected }} aria-checked={!!selected} accessibilityLabel={label}
      style={[{ width: w, minHeight: 112, gap: S.sm, borderRadius: R.card, padding: S.md, justifyContent: "space-between", backgroundColor: selected ? c.tintFill : c.card }, curve]}>
      <Icon name={icon} size={26} color={selected ? "#fff" : c.tint} />
      <Text variant="headline" color={selected ? "#fff" : undefined}>{label}</Text>
    </PressScale>
  );
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => (s ? new Date(s + "T12:00:00") : undefined);
export const fmtDate = (s: string, year = true) => (s ? parse(s)!.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) }) : "");

/** Large date card: native compact picker (iOS), dialog (Android), <input type=date> (web). */
export function DateCard({ label, value, onChange, min, max, error, icon }: { label: string; value: string; onChange: (v: string) => void; min?: Date; max?: Date; error?: string; icon?: IconName }) {
  const c = useColors(); const dark = useIsDark();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const current = parse(value) ?? (max && max < now ? max : min && min > now ? min : now);
  const head = (
    <View style={{ flex: 1, gap: S.xxs }}>
      <Text variant="footnote" tone={error ? "red" : "secondary"} weight="500">{error ?? label}</Text>
      {Platform.OS !== "ios" && <Text variant="title3" color={value ? undefined : c.tertiaryLabel}>{value ? fmtDate(value) : "Select date"}</Text>}
    </View>
  );
  return (
    <PressScale onPress={() => { if (Platform.OS === "android") { select(); setOpen(true); } }} accessibilityRole="button" accessibilityLabel={`${label}, ${value ? fmtDate(value) : "not set"}`}
      style={[{ minHeight: 84, borderRadius: R.card, backgroundColor: c.card, paddingHorizontal: S.lg, paddingVertical: S.md, flexDirection: "row", alignItems: "center", gap: S.sm }, curve]}>
      {!!icon && <Icon name={icon} size={22} color={c.tint} />}
      {head}
      {Platform.OS === "ios" && !value && (
        <PressScale onPress={() => { select(); onChange(iso(current)); }} accessibilityRole="button" accessibilityLabel={`Select ${label}`} style={{ paddingHorizontal: S.sm, minHeight: 44, borderRadius: R.md, backgroundColor: c.surface2, justifyContent: "center" }}>
          <Text variant="body" color={c.tint}>Select</Text>
        </PressScale>
      )}
      {Platform.OS === "ios" && !!value && <DateTimePicker value={current} mode="date" display="compact" minimumDate={min} maximumDate={max} accentColor={c.tint} themeVariant={dark ? "dark" : "light"} onChange={(_, d) => d && onChange(iso(d))} />}
      {Platform.OS === "web" && (
        // @ts-ignore react-native-web renders a DOM input
        <input type="date" value={value} min={min ? iso(min) : undefined} max={max ? iso(max) : undefined} onChange={(e: any) => onChange(e.target.value)} aria-label={label}
          style={{ position: "absolute", inset: 0, opacity: 0, border: "none", background: "transparent", width: "100%", height: "100%", cursor: "pointer", colorScheme: dark ? "dark" : "light" }} />
      )}
      {Platform.OS === "android" && open && <DateTimePicker value={current} mode="date" minimumDate={min} maximumDate={max} onChange={(e, d) => { setOpen(false); if (e.type === "set" && d) onChange(iso(d)); }} />}
    </PressScale>
  );
}

/** Web-style step indicator: one segment per visible step, the current one fills by sub-page progress. */
export function StepProgress({ count, index, fraction }: { count: number; index: number; fraction: number }) {
  const c = useColors();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={`Step ${index + 1} of ${count}`} style={{ flexDirection: "row", gap: S.xs }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ flex: 1 }}><FlowProgress value={i < index ? 1 : i > index ? 0.0001 : Math.max(0.08, fraction)} /></View>
      ))}
    </View>
  );
}

export function QLabel({ children, first }: { children: string; first?: boolean }) {
  return <Text variant="headline" style={{ marginTop: first ? 0 : S.lg, marginBottom: S.xxs, marginHorizontal: S.xxs }}>{children}</Text>;
}

/** Yes / No pair (the web's toggle buttons). */
export function YesNo({ value, onChange, error, label }: { value: string; onChange: (v: "yes" | "no") => void; error?: string; label: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: S.xs }}>
      <View style={{ flexDirection: "row", gap: S.sm }}>
        <View style={{ flex: 1 }}><ChoiceRow label="Yes" selected={value === "yes"} onPress={() => onChange("yes")} /></View>
        <View style={{ flex: 1 }}><ChoiceRow label="No" selected={value === "no"} onPress={() => onChange("no")} /></View>
      </View>
      {!!error && <InlineError text={error} />}
    </View>
  );
}

export function ToggleRow({ label, value, onChange, icon }: { label: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName }) {
  const c = useColors();
  return (
    <View style={[{ minHeight: 56, borderRadius: R.input, backgroundColor: c.card, paddingHorizontal: S.md, flexDirection: "row", alignItems: "center", gap: S.sm }, curve]}>
      {!!icon && <Icon name={icon} size={20} color={c.whatsapp} />}
      <Text variant="subhead" style={{ flex: 1 }}>{label}</Text>
      <Switch value={value} onValueChange={(v) => { select(); onChange(v); }} trackColor={{ true: c.green, false: c.surface2 }} accessibilityLabel={label} />
    </View>
  );
}

export function Area({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const c = useColors();
  return (
    <View style={[{ backgroundColor: c.card, borderRadius: R.input, paddingHorizontal: S.md, paddingVertical: S.sm }, curve]}>
      <TextInput multiline value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.secondaryLabel} accessibilityLabel={placeholder} maxFontSizeMultiplier={1.6}
        style={[T.body, { color: c.label, minHeight: 104, textAlignVertical: "top" }, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]} />
    </View>
  );
}

/** Short in-field tip. */
export function Tip({ children }: { children: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", gap: S.xs, alignItems: "flex-start", marginHorizontal: S.xxs, marginTop: S.xxs }} accessible accessibilityLabel={`Tip: ${children}`}>
      <Icon name="lightbulb.fill" size={14} color={c.orange} />
      <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}
