import React, { useEffect, useState } from "react";
import { I18nManager, Platform, Pressable, PressableProps, View, ViewStyle, StyleProp, TextInput, TextInputProps, ActivityIndicator, StyleSheet, AccessibilityInfo } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, useReducedMotion, Easing } from "react-native-reanimated";
import { SymbolView, SFSymbol } from "expo-symbols";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, useIsDark, T, S, R, HIT, ICON, curve, elevation, card, SPRING, PRESS, DUR, TAB_BAR_HEIGHT, type Level } from "../../lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useShake } from "../../lib/motion";
import { tap, select } from "../../lib/haptics";
import { Text } from "./Text";
import { useT } from "../../lib/i18n";
import { Glass } from "./Glass";

const ION: Record<string, string> = { "chevron.up.chevron.down": "chevron-expand", "lightbulb.fill": "bulb", "wifi.slash": "cloud-offline", "alarm.fill": "alarm", "arrow.up.circle.fill": "cloud-upload", "exclamationmark.circle.fill": "alert-circle", "exclamationmark": "alert", "calendar.badge.plus": "calendar", "house.fill": "home", "globe.europe.africa.fill": "earth", "doc.text.fill": "document-text", "person.crop.circle.fill": "person-circle", "bubble.left.and.bubble.right.fill": "chatbubbles", "chevron.right": "chevron-forward", "checkmark": "checkmark", "checkmark.circle.fill": "checkmark-circle", "airplane": "airplane", "bed.double.fill": "bed", "envelope.fill": "mail", "phone.fill": "call", "calendar": "calendar", "creditcard.fill": "card", "clock.fill": "time", "shield.checkered": "shield-checkmark", "doc.on.doc.fill": "documents", "list.bullet.clipboard.fill": "clipboard", "pencil.and.list.clipboard": "create", "map.fill": "map", "magnifyingglass": "search", "arrow.up.right.square": "share-outline", "exclamationmark.triangle.fill": "warning", "tray": "file-tray-outline", "person.badge.key.fill": "key", "wand.and.stars": "sparkles", "safari.fill": "compass", "questionmark.circle.fill": "help-circle", "questionmark.circle": "help-circle-outline", "lock.fill": "lock-closed", "sparkles": "sparkles", "person.fill": "person", "briefcase.fill": "briefcase", "eurosign.circle.fill": "cash", "star.fill": "star", "bolt.fill": "flash", "arrow.right": "arrow-forward", "logo.whatsapp": "logo-whatsapp", "bell.fill": "notifications", "sun.max.fill": "sunny", "moon.stars.fill": "moon", "cloud.sun.fill": "partly-sunny", "cloud.moon.fill": "cloudy-night", "cloud.fill": "cloud", "cloud.fog.fill": "cloud", "cloud.drizzle.fill": "rainy", "cloud.rain.fill": "rainy", "cloud.snow.fill": "snow", "cloud.heavyrain.fill": "rainy", "cloud.bolt.rain.fill": "thunderstorm", "plus": "add", "minus": "remove", "arrow.clockwise": "refresh", "chevron.down": "chevron-down", "chevron.up": "chevron-up", "xmark": "close", "rectangle.portrait.and.arrow.right": "log-out-outline", "house": "home-outline", "globe.europe.africa": "earth-outline", "doc.text": "document-text-outline", "person.crop.circle": "person-circle-outline", "bell": "notifications-outline", "bell.slash": "notifications-off-outline", "eye": "eye-outline", "eye.slash": "eye-off-outline", "doc.fill": "document", "paperplane.fill": "paper-plane", "info.circle": "information-circle-outline", "arrow.up.doc.fill": "cloud-upload", "circle": "ellipse-outline", "checkmark.seal.fill": "checkmark-done-circle", "xmark.circle.fill": "close-circle", "hourglass": "hourglass-outline", "airplane.departure": "airplane", "airplane.arrival": "airplane", "person.2.fill": "people", "chevron.left": "chevron-back", "cross.case.fill": "medkit", "graduationcap.fill": "school", "ellipsis.circle.fill": "ellipsis-horizontal-circle", "building.2.fill": "business", "laptopcomputer": "laptop", "leaf.fill": "leaf", "person.crop.circle.badge.plus": "person-add", "person.text.rectangle": "id-card", "camera.fill": "camera", "building.columns.fill": "business", "fork.knife": "restaurant", "bag.fill": "bag-handle", "square.and.arrow.up": "share-outline", "pencil": "pencil", "trash": "trash-outline", "faceid": "scan", "photo.on.rectangle": "images", "doc.viewfinder": "scan-outline", "clock": "time-outline", "dollarsign.circle": "cash-outline", "powerplug.fill": "flash-outline", "phone.badge.waveform.fill": "call", "globe": "globe-outline", "arrow.counterclockwise": "refresh", "character.bubble": "language", "applelogo": "logo-apple", "lock.shield.fill": "shield", "creditcard": "card-outline", "airplane.circle.fill": "airplane", "list.bullet": "list", "square.grid.2x2": "grid-outline" };
export type IconName = SFSymbol | "logo.whatsapp";
export function Icon({ name, size = 17, color, weight, style }: { name: IconName; size?: number; color: string; weight?: "regular" | "medium" | "semibold" | "bold"; style?: StyleProp<ViewStyle> }) {
  if (Platform.OS === "ios" && !name.startsWith("logo.")) return <SymbolView name={name as SFSymbol} size={size} tintColor={color} weight={weight} style={[{ width: size, height: size }, style]} />;
  return <Ionicons name={(ION[name] ?? "ellipse") as any} size={size} color={color} style={style as any} />;
}

/** Forward chevron (row disclosure): mirrored in Arabic so it points to the reading direction's end. */
export function Chevron({ size = ICON.sm, color, weight = "semibold" }: { size?: number; color?: string; weight?: "regular" | "medium" | "semibold" | "bold" }) {
  const c = useColors(); const { rtl } = useT();
  return <Icon name="chevron.right" size={size} color={color ?? c.tertiaryLabel} weight={weight} style={(rtl || I18nManager.isRTL) ? { transform: [{ scaleX: -1 }] } : undefined} />;
}

/** Bottom padding so content clears the floating tab bar. */
export function useTabInset(extra = S.xl) { const i = useSafeAreaInsets(); return Math.max(i.bottom, 12) + TAB_BAR_HEIGHT + extra; }

const APressable = Animated.createAnimatedComponent(Pressable);
/** The one pressed state: spring scale to 0.97 + dim (and an optional 1pt lift for cards). Reduce Motion: dim only. */
export function PressScale({ scaleTo = PRESS.scale, lift, style: style0, children, onPressIn, onPressOut, ...p }: Omit<PressableProps, "style"> & { scaleTo?: number; lift?: boolean; style?: StyleProp<ViewStyle> | ((s: { pressed: boolean }) => StyleProp<ViewStyle>); children?: React.ReactNode }) {
  const style = typeof style0 === "function" ? style0({ pressed: false }) : style0; // feedback comes from the shared press animation
  const reduce = useReducedMotion(); const s = useSharedValue(0);
  const base = (StyleSheet.flatten(style)?.opacity as number | undefined) ?? 1; // keep e.g. the disabled 0.4 (the press animation used to override it)
  const a = useAnimatedStyle(() => ({ opacity: base * (1 - (1 - PRESS.dim) * s.value), transform: reduce ? [] : [{ scale: 1 - (1 - scaleTo) * s.value }, { translateY: lift ? PRESS.lift * s.value : 0 }] }));
  return <APressable {...p} onPressIn={(e) => { s.value = withSpring(1, SPRING.press); onPressIn?.(e); }} onPressOut={(e) => { s.value = withSpring(0, SPRING.press); onPressOut?.(e); }} style={[style, a]}>{children}</APressable>;
}

export function Button({ title, onPress, variant = "primary", size = "L", loading, disabled, icon, color, a11yLabel }: { title: string; onPress: () => void; variant?: "primary" | "secondary" | "plain" | "destructive"; size?: "L" | "M"; loading?: boolean; disabled?: boolean; icon?: IconName; color?: string; a11yLabel?: string }) {
  const c = useColors(); const dark = useIsDark();
  // Primary: brand-blue pill (a `color` keeps a coloured one, e.g. WhatsApp). Secondary: outlined. Plain: a blue text link.
  const bg = variant === "primary" ? (color ?? c.primaryFill) : variant === "secondary" ? c.surface : "transparent";
  const fg = variant === "primary" ? (color ? "#fff" : c.onPrimary) : variant === "destructive" ? c.red : variant === "secondary" ? c.label : (color ?? c.tint);
  const off = disabled || loading; const [down, setDown] = useState(false);
  const fill = variant === "primary" && !color && down ? c.primaryPressed : bg;
  return (
    <PressScale onPress={() => { tap(); onPress(); }} onPressIn={() => setDown(true)} onPressOut={() => setDown(false)} scaleTo={0.98} disabled={off} accessibilityRole="button" accessibilityLabel={a11yLabel ?? title} accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={[{ minHeight: size === "L" ? 48 : HIT, borderRadius: R.button, paddingHorizontal: S.lg, paddingVertical: S.xs, alignItems: "center", justifyContent: "center", backgroundColor: fill, opacity: disabled ? 0.4 : 1 },
        variant === "secondary" && { borderWidth: 1, borderColor: c.border }, variant === "primary" && !color && !off && !dark && ({ boxShadow: "0px 6px 16px rgba(4,54,220,0.22)" } as ViewStyle), curve]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>
          {!!icon && <Icon name={icon} size={ICON.md} color={fg} weight="semibold" />}
          <Text variant="headline" weight="600" color={fg} numberOfLines={2} center style={{ flexShrink: 1 }}>{title}</Text>
        </View>
      )}
    </PressScale>
  );
}

/** Card surface from the tokens: E0 = grouped list background (no shadow, safe in long lists), E1+ = raised card with hairline + layered shadow. */
export function Surface({ children, style, level = 1 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; level?: Level }) {
  const c = useColors(); const dark = useIsDark();
  return <View style={[card(c, dark, level), style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginHorizontal: S.lg, marginBottom: S.sm, minHeight: S.xl }}>
      <Text variant="overline" tone="secondary" accessibilityRole="header" style={{ flexShrink: 1 }}>{title}</Text>
      {!!action && <PressScale onPress={() => { tap(); onAction?.(); }} hitSlop={12} accessibilityRole="button"><Text variant="subhead" tone="accent" weight="600">{action}</Text></PressScale>}
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

/** Neutral icon tile (restrained palette): neutral fill, label-coloured symbol. Only destructive red and brand WhatsApp keep their colour. */
export function IconTile({ name, color, size = 32 }: { name: IconName; color: string; size?: number }) {
  const c = useColors(); const keep = color === c.red || color === c.whatsapp;
  return <View style={[{ width: size, height: size, borderRadius: R.sm, backgroundColor: c.fillSubtle, alignItems: "center", justifyContent: "center" }, curve]}><Icon name={name} size={ICON.md - 1} color={keep ? color : c.label} weight="regular" /></View>;
}

export function ListRow({ title, subtitle, leading, icon, iconColor, value, onPress, onLongPress, chevron = !!onPress, trailing, destructive, tint, bold, a11yLabel, a11yHint, minHeight = 44 }: { title: string; subtitle?: string; leading?: React.ReactNode; icon?: IconName; iconColor?: string; value?: string; onPress?: () => void; onLongPress?: () => void; chevron?: boolean; trailing?: React.ReactNode; destructive?: boolean; tint?: boolean; bold?: boolean; a11yLabel?: string; a11yHint?: string; minHeight?: number }) {
  const c = useColors();
  return (
    <PressScale onPress={onPress ? () => { tap(); onPress(); } : undefined} onLongPress={onLongPress ? () => { tap(); onLongPress(); } : undefined} disabled={!onPress && !onLongPress} scaleTo={onPress ? PRESS.scale : 1} accessibilityRole={onPress ? "button" : "text"} accessibilityLabel={a11yLabel ?? [title, subtitle, value].filter(Boolean).join(", ")} accessibilityHint={a11yHint}
      style={{ minHeight: subtitle ? Math.max(minHeight, 64) : Math.max(minHeight, 52), paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", alignItems: "center", gap: S.sm }}>
      {leading ?? (icon ? <IconTile name={icon} color={iconColor ?? c.tint} /> : null)}
      <View style={{ flex: 1, minWidth: 80 }}>
        <Text variant={bold ? "headline" : "body"} color={destructive ? c.red : tint ? c.tint : undefined} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text variant="subhead" tone="secondary" numberOfLines={2}>{subtitle}</Text>}
      </View>
      {!!value && <Text variant="body" tone="secondary" numberOfLines={1} ellipsizeMode="middle" style={{ flexShrink: 1, maxWidth: "60%", textAlign: "right" }} tabular>{value}</Text>}
      {trailing}
      {chevron && <Chevron />}
    </PressScale>
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
    <View style={{ paddingHorizontal: S.md, paddingVertical: S.xs, minHeight: 52, justifyContent: "center" }}>
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
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[{ flexDirection: "row", backgroundColor: c.fill, borderRadius: R.round, padding: 3 }, curve]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressScale key={o.value} onPress={() => { select(); onChange(o.value); }} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={o.label}
            style={[{ flex: 1, minHeight: 36, borderRadius: R.round, alignItems: "center", justifyContent: "center", paddingHorizontal: S.xs }, on && { backgroundColor: dark ? "#636366" : c.surface, ...elevation(1, false) }]}>
            <Text variant="footnote" weight={on ? "600" : "500"} color={on ? c.label : c.textSecondary} numberOfLines={2} center>{o.label}</Text>
          </PressScale>
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
            style={[{ minHeight: 36, paddingHorizontal: S.md, borderRadius: R.round, justifyContent: "center", backgroundColor: on ? c.accentSoft : c.surface, borderWidth: on ? 1.5 : 1, borderColor: on ? c.accent : c.border }]}>
            <Text variant="subhead" weight={on ? "600" : "500"} color={on ? c.accent : c.label}>{o.label}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}

/** Skeleton block with a soft travelling shimmer (static when Reduce Motion is on). Compose these to mirror the real layout. */
export function Skeleton({ w = "100%", h = 16, r = R.sm, style }: { w?: number | `${number}%`; h?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors(); const dark = useIsDark(); const reduce = useReducedMotion(); const x = useSharedValue(-1);
  useEffect(() => { if (!reduce) x.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false); }, [reduce]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: `${x.value * 100}%` as any }] }));
  const hi = dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.65)";
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: w, height: h, borderRadius: r, backgroundColor: c.fill, overflow: "hidden" }, curve, style]}>
      {!reduce && <Animated.View style={[StyleSheet.absoluteFill, a]}><LinearGradient colors={["transparent", hi, "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} /></Animated.View>}
    </View>
  );
}
export function SkeletonRows({ n = 3, leading = 40 }: { n?: number; leading?: number }) {
  return (
    <Surface level={0} style={{ marginHorizontal: S.md, marginBottom: S.xxl }}>
      <View accessible accessibilityLabel="Loading">
        {Array.from({ length: n }).map((_, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: S.sm, padding: S.md }}>
            <Skeleton w={leading} h={leading} r={leading / 2} />
            <View style={{ flex: 1, gap: S.xs }}><Skeleton w="55%" h={14} /><Skeleton w="35%" h={12} /></View>
          </View>
        ))}
      </View>
    </Surface>
  );
}

export function EmptyState({ icon, title, message, action, mascot }: { icon: IconName; title: string; message?: string; action?: React.ReactNode; /** Globi instead of the icon (empty lists, nothing-to-do states) */ mascot?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ alignItems: "center", paddingHorizontal: S.xxl, paddingVertical: S.x3, gap: S.xs }}>
      {mascot ?? <Icon name={icon} size={40} color={c.tertiaryLabel} />}
      <Text variant="title3" center style={{ marginTop: S.xs }}>{title}</Text>
      {!!message && <Text variant="subhead" tone="secondary" center>{message}</Text>}
      {!!action && <View style={{ marginTop: S.sm, alignSelf: "stretch" }}>{action}</View>}
    </View>
  );
}

/** Inline error. Android reads it via the live region; iOS VoiceOver gets an explicit announcement (opt out with announce={false}). */
export function InlineError({ text, announce = true }: { text?: string | null; announce?: boolean }) {
  React.useEffect(() => { if (text && announce && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(text); }, [text, announce]);
  return text ? <Shake on={text}><Text variant="footnote" tone="red" accessibilityLiveRegion="polite" style={{ marginHorizontal: S.lg, marginTop: S.xs }}>{text}</Text></Shake> : null;
}
/** Shakes its children horizontally whenever `on` changes to a new truthy value (no motion with Reduce Motion). */
export function Shake({ on, children, style }: { on: unknown; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const x = useShake(on); const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

export function HeaderIconButton({ icon, onPress, label, dot }: { icon: IconName; onPress: () => void; label: string; dot?: boolean }) {
  const c = useColors(); const dark = useIsDark();
  return (
    <PressScale onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={[{ width: HIT, height: HIT, borderRadius: R.round, alignItems: "center", justifyContent: "center" }, elevation(1, dark)]}>
      <Glass radius={R.round} style={StyleSheet.absoluteFill} />
      <Icon name={icon} size={ICON.md} color={c.label} weight="medium" />
      {dot && <View style={{ position: "absolute", top: S.xs, end: S.xs, width: 8, height: 8, borderRadius: R.round, backgroundColor: c.red, borderWidth: 1.5, borderColor: c.bg }} />}
    </PressScale>
  );
}

/** Bottom-pinned primary action with a soft backdrop. */
export function StickyCTA({ children, bottom }: { children: React.ReactNode; bottom?: number }) {
  const c = useColors(); const dark = useIsDark(); const i = useSafeAreaInsets();
  // Floating glass dock: the page scrolls underneath, a soft fade keeps the buttons legible over content.
  return (
    <View style={{ paddingHorizontal: S.md, paddingBottom: bottom ?? Math.max(i.bottom, S.md) }}>
      <LinearGradient pointerEvents="none" colors={[c.bg + "00", c.bg]} style={{ position: "absolute", left: 0, right: 0, top: -S.x3, height: S.x3 }} />
      <View style={[{ borderRadius: R.sheet, position: "relative" }, elevation(3, dark)]}>
        <Glass radius={R.sheet} strong style={StyleSheet.absoluteFill} />
        <View style={{ padding: S.xs + 2, gap: S.xs }}>{children}</View>
      </View>
    </View>
  );
}

/** Segmented progress; the current segment fills with a spring (instant with Reduce Motion). `fraction` = progress inside the current segment.
 *  current=false: no step is in progress (a finished case), so the segment at `index` stays empty. */
export function ProgressSegments({ count, index, label, fraction = 1, current = true }: { count: number; index: number; label?: string; fraction?: number; current?: boolean }) {
  const c = useColors();
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label ?? `Step ${index + 1} of ${count}`} style={{ flexDirection: "row", gap: S.xxs }}>
      {Array.from({ length: count }).map((_, i) => <Seg key={i} v={i < index ? 1 : i === index && current ? Math.max(0.08, fraction) : 0} />)}
    </View>
  );
}
function Seg({ v }: { v: number }) {
  const c = useColors(); const reduce = useReducedMotion(); const w = useSharedValue(v);
  useEffect(() => { w.value = reduce ? v : withSpring(v, SPRING.enter); }, [v, reduce]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));
  return <View style={{ flex: 1, height: S.xxs, borderRadius: R.xs, backgroundColor: c.fill, overflow: "hidden" }}><Animated.View style={[{ height: S.xxs, borderRadius: R.xs, backgroundColor: c.accent }, a]} /></View>;
}

/** Indeterminate progress bar (Storage uploads don't report progress). */
/** Indeterminate sweep, or a filled bar when `value` (0-1) is known, e.g. bytes sent during an upload. */
export function ProgressBar({ value, label = "Uploading" }: { value?: number; label?: string }) {
  const c = useColors(); const x = useSharedValue(0); const reduce = useReducedMotion();
  const known = value != null;
  useEffect(() => {
    if (known) x.value = reduce ? value ?? 0 : withTiming(value ?? 0, { duration: DUR.fast });
    else x.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [known, value, reduce, x]);
  const a = useAnimatedStyle(() => (known ? { left: 0, width: `${x.value * 100}%` as any } : { left: `${x.value * 70}%` as any, width: "30%" as any }));
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={known ? { min: 0, max: 100, now: Math.round((value ?? 0) * 100) } : undefined} style={{ height: S.xxs, borderRadius: R.xs, backgroundColor: c.fill, overflow: "hidden" }}><Animated.View style={[{ position: "absolute", top: 0, bottom: 0, borderRadius: R.xs, backgroundColor: c.accent }, a]} /></View>;
}

/** The profile photo (lib/avatar.ts) when there is one, else the initials. */
export function Avatar({ name, size = 56, uri }: { name: string; size?: number; uri?: string | null }) {
  const c = useColors();
  const ini = name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("") || "?";
  const box = { width: size, height: size, borderRadius: size / 2, backgroundColor: c.fill, borderWidth: 1, borderColor: c.hairline, alignItems: "center" as const, justifyContent: "center" as const, overflow: "hidden" as const };
  if (uri) return <View style={box} accessibilityElementsHidden><Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" accessibilityIgnoresInvertColors /></View>;
  return <View style={box} accessibilityElementsHidden><Text variant={size > 48 ? "title3" : "headline"}>{ini}</Text></View>;
}
