import React, { useEffect } from "react";
import { Platform, Pressable, PressableProps, View, ViewStyle, StyleProp, TextInput, TextInputProps, ActivityIndicator, StyleSheet, AccessibilityInfo } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, useReducedMotion, Easing } from "react-native-reanimated";
import { SymbolView, SFSymbol } from "expo-symbols";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, useIsDark, T, S, R, curve, elevation, SPRING, TAB_BAR_HEIGHT } from "../../lib/theme";
import { tap, select } from "../../lib/haptics";
import { Text } from "./Text";

const ION: Record<string, string> = { "chevron.up.chevron.down": "chevron-expand", "lightbulb.fill": "bulb", "wifi.slash": "cloud-offline", "alarm.fill": "alarm", "arrow.up.circle.fill": "cloud-upload", "exclamationmark.circle.fill": "alert-circle", "house.fill": "home", "globe.europe.africa.fill": "earth", "doc.text.fill": "document-text", "person.crop.circle.fill": "person-circle", "bubble.left.and.bubble.right.fill": "chatbubbles", "chevron.right": "chevron-forward", "checkmark": "checkmark", "checkmark.circle.fill": "checkmark-circle", "airplane": "airplane", "bed.double.fill": "bed", "envelope.fill": "mail", "phone.fill": "call", "calendar": "calendar", "creditcard.fill": "card", "clock.fill": "time", "shield.checkered": "shield-checkmark", "doc.on.doc.fill": "documents", "list.bullet.clipboard.fill": "clipboard", "pencil.and.list.clipboard": "create", "map.fill": "map", "magnifyingglass": "search", "arrow.up.right.square": "share-outline", "exclamationmark.triangle.fill": "warning", "tray": "file-tray-outline", "person.badge.key.fill": "key", "wand.and.stars": "sparkles", "safari.fill": "compass", "questionmark.circle.fill": "help-circle", "lock.fill": "lock-closed", "sparkles": "sparkles", "person.fill": "person", "briefcase.fill": "briefcase", "eurosign.circle.fill": "cash", "star.fill": "star", "bolt.fill": "flash", "arrow.right": "arrow-forward", "logo.whatsapp": "logo-whatsapp", "bell.fill": "notifications", "sun.max.fill": "sunny", "moon.stars.fill": "moon", "cloud.sun.fill": "partly-sunny", "cloud.moon.fill": "cloudy-night", "cloud.fill": "cloud", "cloud.fog.fill": "cloud", "cloud.drizzle.fill": "rainy", "cloud.rain.fill": "rainy", "cloud.snow.fill": "snow", "cloud.heavyrain.fill": "rainy", "cloud.bolt.rain.fill": "thunderstorm", "plus": "add", "arrow.clockwise": "refresh", "chevron.down": "chevron-down", "chevron.up": "chevron-up", "xmark": "close", "rectangle.portrait.and.arrow.right": "log-out-outline", "house": "home-outline", "globe.europe.africa": "earth-outline", "doc.text": "document-text-outline", "person.crop.circle": "person-circle-outline", "bell": "notifications-outline", "bell.slash": "notifications-off-outline", "eye": "eye-outline", "eye.slash": "eye-off-outline", "doc.fill": "document", "paperplane.fill": "paper-plane", "info.circle": "information-circle-outline", "arrow.up.doc.fill": "cloud-upload", "circle": "ellipse-outline", "checkmark.seal.fill": "checkmark-done-circle", "xmark.circle.fill": "close-circle", "hourglass": "hourglass-outline", "airplane.departure": "airplane", "airplane.arrival": "airplane", "person.2.fill": "people", "chevron.left": "chevron-back", "cross.case.fill": "medkit", "graduationcap.fill": "school", "ellipsis.circle.fill": "ellipsis-horizontal-circle", "building.2.fill": "business", "laptopcomputer": "laptop", "leaf.fill": "leaf", "person.crop.circle.badge.plus": "person-add", "person.text.rectangle": "id-card", "camera.fill": "camera", "building.columns.fill": "business" };
export type IconName = SFSymbol | "logo.whatsapp";
export function Icon({ name, size = 17, color, weight, style }: { name: IconName; size?: number; color: string; weight?: "regular" | "medium" | "semibold" | "bold"; style?: StyleProp<ViewStyle> }) {
  if (Platform.OS === "ios" && !name.startsWith("logo.")) return <SymbolView name={name as SFSymbol} size={size} tintColor={color} weight={weight} style={[{ width: size, height: size }, style]} />;
  return <Ionicons name={(ION[name] ?? "ellipse") as any} size={size} color={color} style={style as any} />;
}

/** Bottom padding so content clears the floating tab bar. */
export function useTabInset(extra = S.xl) { const i = useSafeAreaInsets(); return Math.max(i.bottom, 12) + TAB_BAR_HEIGHT + extra; }

const APressable = Animated.createAnimatedComponent(Pressable);
/** Pressable with spring scale feedback (respects Reduce Motion). */
export function PressScale({ scaleTo = 0.97, style, children, onPressIn, onPressOut, ...p }: PressableProps & { scaleTo?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const reduce = useReducedMotion(); const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <APressable {...p} onPressIn={(e) => { if (!reduce) s.value = withSpring(scaleTo, SPRING.press); onPressIn?.(e); }} onPressOut={(e) => { s.value = withSpring(1, SPRING.press); onPressOut?.(e); }} style={[style, a]}>{children}</APressable>;
}

export function Button({ title, onPress, variant = "primary", size = "L", loading, disabled, icon, color, a11yLabel }: { title: string; onPress: () => void; variant?: "primary" | "secondary" | "plain" | "destructive"; size?: "L" | "M"; loading?: boolean; disabled?: boolean; icon?: IconName; color?: string; a11yLabel?: string }) {
  const c = useColors();
  const bg = variant === "primary" ? (color ?? c.tintFill) : variant === "secondary" ? c.fill : "transparent";
  const fg = variant === "primary" ? "#fff" : variant === "destructive" ? c.red : variant === "secondary" ? c.label : (color ?? c.tint);
  const off = disabled || loading;
  return (
    <PressScale onPress={() => { tap(); onPress(); }} disabled={off} accessibilityRole="button" accessibilityLabel={a11yLabel ?? title} accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={[{ minHeight: size === "L" ? 56 : 44, borderRadius: R.button, paddingHorizontal: S.lg, paddingVertical: S.xs, alignItems: "center", justifyContent: "center", backgroundColor: bg, opacity: disabled ? 0.4 : 1 }, curve]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>
          {!!icon && <Icon name={icon} size={17} color={fg} weight="semibold" />}
          <Text variant="headline" color={fg} numberOfLines={2} center style={{ flexShrink: 1 }}>{title}</Text>
        </View>
      )}
    </PressScale>
  );
}

export function Surface({ children, style, level = 1 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; level?: 0 | 1 | 2 }) {
  const c = useColors(); const dark = useIsDark();
  return <View style={[{ backgroundColor: c.card, borderRadius: R.card }, curve, elevation(level, dark), style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginHorizontal: S.lg, marginBottom: S.sm, minHeight: 25 }}>
      <Text variant="title3" accessibilityRole="header">{title}</Text>
      {!!action && <Pressable onPress={() => { tap(); onAction?.(); }} hitSlop={12} accessibilityRole="button"><Text variant="subhead" tone="secondary" weight="500">{action}</Text></Pressable>}
    </View>
  );
}

/** iOS inset-grouped list section. */
export function ListGroup({ header, footer, action, onAction, children, inset = 56, style }: { header?: string; footer?: string; action?: string; onAction?: () => void; children: React.ReactNode; inset?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return (
    <View style={[{ marginBottom: S.xxl }, style]}>
      {!!header && <SectionHeader title={header} action={action} onAction={onAction} />}
      <Surface level={0} style={{ marginHorizontal: S.md, overflow: "hidden" }}>
        {items.map((ch, i) => (
          <View key={i}>{ch}{i < items.length - 1 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginLeft: inset }} />}</View>
        ))}
      </Surface>
      {!!footer && <Text variant="footnote" tone="secondary" style={{ marginHorizontal: S.lg, marginTop: S.xs }}>{footer}</Text>}
    </View>
  );
}

export function IconTile({ name, color, size = 30 }: { name: IconName; color: string; size?: number }) {
  return <View style={[{ width: size, height: size, borderRadius: 8, backgroundColor: color, alignItems: "center", justifyContent: "center" }, curve]}><Icon name={name} size={size * 0.55} color="#fff" weight="semibold" /></View>;
}

export function ListRow({ title, subtitle, leading, icon, iconColor, value, onPress, chevron = !!onPress, trailing, destructive, tint, bold, a11yLabel, a11yHint, minHeight = 44 }: { title: string; subtitle?: string; leading?: React.ReactNode; icon?: IconName; iconColor?: string; value?: string; onPress?: () => void; chevron?: boolean; trailing?: React.ReactNode; destructive?: boolean; tint?: boolean; bold?: boolean; a11yLabel?: string; a11yHint?: string; minHeight?: number }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress ? () => { tap(); onPress(); } : undefined} disabled={!onPress} accessibilityRole={onPress ? "button" : "text"} accessibilityLabel={a11yLabel ?? [title, subtitle, value].filter(Boolean).join(", ")} accessibilityHint={a11yHint}
      style={({ pressed }) => ({ minHeight: subtitle ? Math.max(minHeight, 60) : Math.max(minHeight, 44), paddingHorizontal: S.md, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: S.sm, backgroundColor: pressed ? c.fill2 : "transparent" })}>
      {leading ?? (icon ? <IconTile name={icon} color={iconColor ?? c.tint} /> : null)}
      <View style={{ flex: 1, minWidth: 80 }}>
        <Text variant={bold ? "headline" : "body"} color={destructive ? c.red : tint ? c.tint : undefined} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text variant="subhead" tone="secondary" numberOfLines={2} style={{ marginTop: 1 }}>{subtitle}</Text>}
      </View>
      {!!value && <Text variant="body" tone="secondary" numberOfLines={1} ellipsizeMode="middle" style={{ flexShrink: 1, maxWidth: "60%", textAlign: "right" }} tabular>{value}</Text>}
      {trailing}
      {chevron && <Icon name="chevron.right" size={13} color={c.tertiaryLabel} weight="semibold" />}
    </Pressable>
  );
}

export const KeyValueRow = ({ k, v }: { k: string; v: string }) => <ListRow title={k} value={v} />;

export function TextField({ label, error, trailing, ...p }: TextInputProps & { label: string; error?: boolean; trailing?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ minHeight: 52, paddingHorizontal: S.md, flexDirection: "row", alignItems: "center", gap: S.xs }}>
      <TextInput placeholder={label} placeholderTextColor={error ? c.red : c.tertiaryLabel} accessibilityLabel={label} maxFontSizeMultiplier={1.6} {...p}
        style={[T.body, { flex: 1, color: c.label, minHeight: 52, paddingVertical: 0 }, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]} />
      {trailing}
    </View>
  );
}
/** Labelled field row: label left, input right (iOS Settings style). */
export function FormRow({ label, error, ...p }: TextInputProps & { label: string; error?: string }) {
  const c = useColors();
  return (
    <View style={{ paddingHorizontal: S.md, paddingVertical: 6, minHeight: 52, justifyContent: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
        <Text variant="body" color={error ? c.red : undefined} style={{ width: 110 }} numberOfLines={1}>{label}</Text>
        <TextInput placeholderTextColor={c.tertiaryLabel} accessibilityLabel={label} maxFontSizeMultiplier={1.6} {...p}
          style={[T.body, { flex: 1, color: c.label, minHeight: 40, paddingVertical: 0, textAlign: "right" }, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]} />
      </View>
      {!!error && <Text variant="footnote" tone="red" style={{ textAlign: "right" }}>{error}</Text>}
    </View>
  );
}

export function SegmentedControl({ options, value, onChange, label }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; label: string }) {
  const c = useColors(); const dark = useIsDark();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[{ flexDirection: "row", backgroundColor: c.fill, borderRadius: 10, padding: 2 }, curve]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => { select(); onChange(o.value); }} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={o.label}
            style={[{ flex: 1, minHeight: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }, on && { backgroundColor: dark ? "#636366" : "#fff", ...elevation(1, false) }]}>
            <Text variant="footnote" weight={on ? "600" : "500"} numberOfLines={2} center>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Wrapping single-select chips for longer option sets. */
export function ChipGroup({ options, value, onChange, label }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; label: string }) {
  const c = useColors();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressScale key={o.value} onPress={() => { select(); onChange(o.value); }} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={o.label}
            style={[{ minHeight: 44, paddingHorizontal: 14, borderRadius: R.round, justifyContent: "center", backgroundColor: on ? c.tintFill : c.fill }]}>
            <Text variant="subhead" weight="500" color={on ? "#fff" : c.label}>{o.label}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}

export function Skeleton({ w = "100%", h = 16, r = 8, style }: { w?: number | `${number}%`; h?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors(); const reduce = useReducedMotion(); const o = useSharedValue(0.5);
  useEffect(() => { if (!reduce) o.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true); }, [reduce]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: w, height: h, borderRadius: r, backgroundColor: c.fill }, a, style]} />;
}
export function SkeletonRows({ n = 3, leading = 40 }: { n?: number; leading?: number }) {
  return (
    <Surface level={0} style={{ marginHorizontal: S.md, marginBottom: S.xxl }}>
      <View accessible accessibilityLabel="Loading">
        {Array.from({ length: n }).map((_, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: S.sm, padding: S.md }}>
            <Skeleton w={leading} h={leading} r={leading / 2} />
            <View style={{ flex: 1, gap: 6 }}><Skeleton w="55%" h={14} /><Skeleton w="35%" h={12} /></View>
          </View>
        ))}
      </View>
    </Surface>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message?: string; action?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ alignItems: "center", paddingHorizontal: S.xxl, paddingVertical: S.x3, gap: S.xs }}>
      <Icon name={icon} size={40} color={c.tertiaryLabel} />
      <Text variant="title3" center style={{ marginTop: S.xs }}>{title}</Text>
      {!!message && <Text variant="subhead" tone="secondary" center>{message}</Text>}
      {!!action && <View style={{ marginTop: S.sm, alignSelf: "stretch" }}>{action}</View>}
    </View>
  );
}

/** Inline error. Android reads it via the live region; iOS VoiceOver gets an explicit announcement (opt out with announce={false}). */
export function InlineError({ text, announce = true }: { text?: string | null; announce?: boolean }) {
  React.useEffect(() => { if (text && announce && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(text); }, [text, announce]);
  return text ? <Text variant="footnote" tone="red" accessibilityLiveRegion="polite" style={{ marginHorizontal: S.lg, marginTop: S.xs }}>{text}</Text> : null;
}

export function HeaderIconButton({ icon, onPress, label, dot }: { icon: IconName; onPress: () => void; label: string; dot?: boolean }) {
  const c = useColors();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: c.fill }}>
      <Icon name={icon} size={17} color={c.label} weight="medium" />
      {dot && <View style={{ position: "absolute", top: 6, right: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: c.red, borderWidth: 1.5, borderColor: c.bg }} />}
    </Pressable>
  );
}

/** Bottom-pinned primary action with a soft backdrop. */
export function StickyCTA({ children, bottom }: { children: React.ReactNode; bottom?: number }) {
  const c = useColors(); const i = useSafeAreaInsets();
  return <View style={{ paddingHorizontal: S.md, paddingTop: S.sm, paddingBottom: bottom ?? Math.max(i.bottom, S.md), backgroundColor: c.bg, gap: S.xs }}>{children}</View>;
}

export function ProgressSegments({ count, index, label }: { count: number; index: number; label?: string }) {
  const c = useColors();
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label ?? `Step ${index + 1} of ${count}`} style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: count }).map((_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= index ? c.tint : c.fill }} />)}
    </View>
  );
}

/** Indeterminate progress bar (Storage uploads don't report progress). */
export function ProgressBar() {
  const c = useColors(); const x = useSharedValue(0);
  useEffect(() => { x.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, false); }, []);
  const a = useAnimatedStyle(() => ({ left: `${x.value * 70}%` as any }));
  return <View accessibilityRole="progressbar" accessibilityLabel="Uploading" style={{ height: 4, borderRadius: 2, backgroundColor: c.fill, overflow: "hidden" }}><Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: "30%", borderRadius: 2, backgroundColor: c.tint }, a]} /></View>;
}

export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const c = useColors();
  const ini = name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("") || "?";
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.tintFill, alignItems: "center", justifyContent: "center" }} accessibilityElementsHidden><Text variant={size > 48 ? "title3" : "headline"} color="#fff">{ini}</Text></View>;
}
