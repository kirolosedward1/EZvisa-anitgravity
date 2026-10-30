// Shared components drawn in the app design canvas ("EZvisa app with Globi"). Values come from the canvas artboards:
// cards 16 pt corners with a hairline, buttons 52 pt with 14 pt corners, speech bubbles 18 pt with a 6 pt tail corner,
// selected = 1.5 pt brand-blue border on a 6 % blue fill, one accent only, no gradients, maximum weight 600.
import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useColors, useIsDark, useLargeText, S, R, HIT, SPRING, DUR, curve } from "../../lib/theme";
import { useReducedMotion } from "../../lib/motion";
import { useT } from "../../lib/i18n";
import { select, tap } from "../../lib/haptics";
import { Text } from "./Text";
import { Button, HeaderIconButton, Icon, ListRow, PressScale, type IconName } from "./core";
import { GlobiPose, GLOBI_SIZE, type GlobiPose as Pose } from "../globi/GlobiPose";

// ---------------------------------------------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------------------------------------------

/** White card, 16 pt corners, hairline border (dark: elevated grey). `padded` adds the canvas 16 pt inset. */
export function Card({ children, padded = false, style, testID }: { children: React.ReactNode; padded?: boolean; style?: StyleProp<ViewStyle>; testID?: string }) {
  const c = useColors(); const dark = useIsDark();
  return <View testID={testID} style={[{ backgroundColor: dark ? c.surface : c.surfaceRaised, borderRadius: R.card, borderWidth: 1, borderColor: c.border, overflow: "hidden" }, padded && { padding: S.md }, curve, style]}>{children}</View>;
}

/** Speech bubble: white, hairline, 18 pt corners with the 6 pt tail corner at the bottom on Globi's side (start). */
export function Bubble({ children, tail = true, style }: { children: React.ReactNode; tail?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors(); const dark = useIsDark();
  return (
    <View style={[{ backgroundColor: dark ? c.surface : c.surfaceRaised, borderWidth: 1, borderColor: c.border, borderRadius: R.bubble, paddingHorizontal: S.md, paddingVertical: 14, gap: 6 }, tail && { borderBottomStartRadius: R.bubbleTail }, curve, style]}>
      {children}
    </View>
  );
}

/** Globi's negative margins so the art (which has room around it in the clip) sits close to the bubble, as drawn. */
const bleed = (size: number): ViewStyle => {
  const k = size / GLOBI_SIZE.question; // canvas at 124: -10 top, -14 end, -18 bottom, -22 start
  return { marginTop: -10 * k, marginEnd: -14 * k, marginBottom: -18 * k, marginStart: -22 * k };
};

/**
 * The question as the screen title, inside Globi's speech bubble (canvas rule: no description line under a question).
 * Tapping Globi opens the "why I ask" sheet when `onGlobiPress` is given. At accessibility text sizes Globi moves
 * above the bubble so the question can wrap freely.
 */
export function QuestionHeader({ question, pose, chip, line, onGlobiPress, size = GLOBI_SIZE.question, titleRef, testID }: {
  question: string; pose: Pose; chip?: React.ReactNode; /** Rare second line (e.g. Status bubble copy); never a description. */ line?: string;
  onGlobiPress?: () => void; size?: number; titleRef?: React.Ref<any>; testID?: string;
}) {
  const big = useLargeText(); const { t } = useT();
  const g = big ? Math.round(size * 0.75) : size;
  return (
    <View style={{ flexDirection: big ? "column" : "row", alignItems: big ? "flex-start" : "flex-end", gap: 6 }} testID={testID ?? "question-header"}>
      <GlobiPose pose={pose} size={g} style={bleed(g)} onPress={onGlobiPress} accessibilityLabel={onGlobiPress ? t("Why Globi asks this") : undefined} />
      <Bubble style={{ flex: big ? undefined : 1, alignSelf: big ? "stretch" : undefined }}>
        {chip}
        <Text ref={titleRef} variant="question" accessibilityRole="header" testID="question-title">{question}</Text>
        {!!line && <Text variant="callout" tone="secondary">{line}</Text>}
      </Bubble>
    </View>
  );
}

/** Small Globi beside a 14 pt bubble line (Travellers, Help, Status, Book appointment). */
export function GlobiLine({ pose, text, children, size = GLOBI_SIZE.info }: { pose: Pose; text?: string; children?: React.ReactNode; size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
      <GlobiPose pose={pose} size={size} style={{ margin: -5 * (size / GLOBI_SIZE.info) }} />
      <Bubble style={{ flex: 1, paddingVertical: S.sm }}>{!!text && <Text variant="callout">{text}</Text>}{children}</Bubble>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Header and progress
// ---------------------------------------------------------------------------------------------------------------

/**
 * Wizard header: round back button, segmented progress with a label under each segment (active label in blue), and a
 * right slot (WhatsApp help, "Save", close). `index` is the current segment, `fraction` how far through it.
 */
export function StepHeader({ steps, index, fraction, onBack, backLabel, right, a11yLabel }: {
  steps: string[]; index: number; fraction: number; onBack?: () => void; backLabel?: string; right?: React.ReactNode; a11yLabel: string;
}) {
  const c = useColors(); const { t, rtl } = useT();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs, paddingHorizontal: S.gutter - S.xxs }}>
      {onBack ? <HeaderIconButton icon={rtl ? "chevron.right" : "chevron.left"} label={backLabel ?? t("Back")} onPress={onBack} testID="step-back" /> : <View style={{ width: HIT }} />}
      <View accessible accessibilityRole="progressbar" accessibilityLabel={a11yLabel} style={{ flex: 1, flexDirection: "row", gap: S.xxs }} testID="step-header">
        {steps.map((label, i) => (
          <View key={label} style={{ flex: 1, gap: 6 }}>
            <Segment v={i < index ? 1 : i === index ? Math.max(0.04, Math.min(1, fraction)) : 0} />
            <Text variant="caption" weight="600" color={i === index ? c.accent : c.textSecondary} numberOfLines={1} maxFontSizeMultiplier={1.2}>{label}</Text>
          </View>
        ))}
      </View>
      {right ?? <View style={{ width: HIT }} />}
    </View>
  );
}
function Segment({ v }: { v: number }) {
  const c = useColors(); const reduce = useReducedMotion(); const w = useSharedValue(v);
  useEffect(() => { w.value = reduce ? v : withSpring(v, SPRING.enter); }, [v, reduce]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));
  return <View style={{ height: S.xxs, borderRadius: 2, backgroundColor: c.border, overflow: "hidden" }}><Animated.View style={[{ height: S.xxs, borderRadius: 2, backgroundColor: c.accent }, a]} /></View>;
}

// ---------------------------------------------------------------------------------------------------------------
// Rows and controls
// ---------------------------------------------------------------------------------------------------------------

/** 44 × 28 switch (canvas): brand blue when on. A real accessibility switch with its own label. */
export function Switch({ value, onValueChange, label, disabled }: { value: boolean; onValueChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const c = useColors(); const reduce = useReducedMotion(); const x = useSharedValue(value ? 1 : 0);
  useEffect(() => { x.value = reduce ? (value ? 1 : 0) : withTiming(value ? 1 : 0, { duration: DUR.fast }); }, [value, reduce]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 16 }] }));
  return (
    <PressScale onPress={() => { select(); onValueChange(!value); }} disabled={disabled} scaleTo={1} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value, disabled }} aria-checked={value}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} style={{ opacity: disabled ? 0.4 : 1 }}>
      <View style={{ width: 44, height: 28, borderRadius: 14, padding: 2, backgroundColor: value ? c.primaryFill : c.border }}>
        <Animated.View style={[{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF", ...({ boxShadow: "0px 1px 3px rgba(0,0,0,0.18)" } as ViewStyle) }, thumb]} />
      </View>
    </PressScale>
  );
}

/** List row: label, optional sub-label and value, then a chevron (when tappable) or a switch. */
export function Row({ label, sub, value, icon, onPress, switchValue, onSwitch, destructive, tint, a11yLabel, testID }: {
  label: string; sub?: string; value?: string; icon?: IconName; onPress?: () => void;
  switchValue?: boolean; onSwitch?: (v: boolean) => void; destructive?: boolean; tint?: boolean; a11yLabel?: string; testID?: string;
}) {
  const sw = onSwitch !== undefined;
  return (
    <View testID={testID}>
      <ListRow title={label} subtitle={sub} value={value} icon={icon} onPress={sw ? undefined : onPress} chevron={!sw && !!onPress} destructive={destructive} tint={tint} a11yLabel={a11yLabel}
        trailing={sw ? <Switch value={!!switchValue} onValueChange={onSwitch!} label={label} /> : undefined} minHeight={50} />
    </View>
  );
}

/** Rows in one card with inset separators (canvas list card). */
export function RowGroup({ header, footer, children, inset = S.md }: { header?: string; footer?: string; children: React.ReactNode; inset?: number }) {
  const c = useColors();
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return (
    <View style={{ gap: S.xs }}>
      {!!header && <Text variant="note" weight="600" tone="secondary" accessibilityRole="header" style={{ paddingHorizontal: S.xxs }}>{header}</Text>}
      <Card>{items.map((ch, i) => <View key={i}>{ch}{i < items.length - 1 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginStart: inset }} />}</View>)}</Card>
      {!!footer && <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: S.xxs }}>{footer}</Text>}
    </View>
  );
}

/**
 * Selectable tile. `yesno` = tall Yes / No tile (20/600, sub-label 13), `option` = full-width option (16/500),
 * `grid` = two-column grid tile (15/500). Selected: 1.5 pt blue border on a 6 % blue fill.
 */
export function ChoiceTile({ label, sub, selected, onPress, variant = "option", icon, leading, trailing, minHeight, a11yLabel, testID }: {
  label: string; sub?: string; selected: boolean; onPress: () => void; variant?: "yesno" | "option" | "grid";
  icon?: IconName; leading?: React.ReactNode; trailing?: React.ReactNode; minHeight?: number; a11yLabel?: string; testID?: string;
}) {
  const c = useColors(); const dark = useIsDark();
  const h = minHeight ?? (variant === "yesno" ? 96 : variant === "grid" ? 84 : 64);
  return (
    <PressScale onPress={() => { select(); onPress(); }} accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected} accessibilityLabel={a11yLabel ?? [label, sub].filter(Boolean).join(", ")} testID={testID}
      style={[{ minHeight: h, borderRadius: R.tile, padding: variant === "yesno" ? 16 : 14, backgroundColor: selected ? c.accentSoft : dark ? c.surface : c.surfaceRaised, borderWidth: selected ? 1.5 : 1, borderColor: selected ? c.accent : c.border,
        flexDirection: variant === "option" ? "row" : "column", alignItems: variant === "option" ? "center" : "flex-start", justifyContent: variant === "grid" ? "space-between" : "flex-start", gap: variant === "option" ? S.sm : 6 }, curve]}>
      {leading ?? (icon ? <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.fillSubtle, alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={18} color={selected ? c.accent : c.textSecondary} /></View> : null)}
      <View style={{ flex: variant === "option" ? 1 : undefined, gap: 2 }}>
        <Text variant={variant === "yesno" ? "tile" : variant === "grid" ? "optionSm" : "option"} weight={selected && variant === "option" ? "600" : undefined}>{label}</Text>
        {!!sub && <Text variant={variant === "grid" ? "footnote" : "note"} tone="secondary" weight={variant === "grid" ? "500" : undefined}>{sub}</Text>}
      </View>
      {trailing ?? (variant === "option" && selected ? <Tick /> : null)}
    </PressScale>
  );
}
/** Filled blue tick circle (selected row / tile). */
export function Tick({ size = 22 }: { size?: number }) {
  const c = useColors();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.primaryFill, alignItems: "center", justifyContent: "center" }}><Icon name="checkmark" size={size * 0.55} color={c.onPrimary} weight="bold" /></View>;
}

export type ListOption = { value: string; label: string; sub?: string; icon?: IconName };
/** Single-choice list in one card (canvas radio list): rows 56 pt, selected row tinted with a tick. Tap = answer. */
export function ListChoice({ options, value, onPick, label, testID }: { options: ListOption[]; value: string; onPick: (v: string) => void; label: string; testID?: string }) {
  const c = useColors();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} testID={testID}>
      <Card>
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <View key={o.value}>
              <PressScale onPress={() => { select(); onPick(o.value); }} scaleTo={0.99} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={[o.label, o.sub].filter(Boolean).join(", ")}
                testID={`choice-${o.value}`} style={{ minHeight: o.sub ? 64 : 56, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", alignItems: "center", gap: S.sm, backgroundColor: on ? c.accentSoft : "transparent" }}>
                {!!o.icon && <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.fillSubtle, alignItems: "center", justifyContent: "center" }}><Icon name={o.icon} size={18} color={on ? c.accent : c.textSecondary} /></View>}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="row" weight={on ? "600" : undefined}>{o.label}</Text>
                  {!!o.sub && <Text variant="note" tone="secondary">{o.sub}</Text>}
                </View>
                {on && <Tick />}
              </PressScale>
              {i < options.length - 1 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator }} />}
            </View>
          );
        })}
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Buttons, chips, notes
// ---------------------------------------------------------------------------------------------------------------

type BtnProps = { title: string; onPress: () => void; icon?: IconName; loading?: boolean; disabled?: boolean; a11yLabel?: string; testID?: string };
/** Primary action: 52 pt, brand blue, 16/600 white. */
export function PrimaryButton(p: BtnProps) { return <View testID={p.testID}><Button {...p} variant="primary" /></View>; }
/** Secondary action: 52 pt white with a hairline. `whatsapp` shows the green WhatsApp dot (canvas). `compact` = 44 pt. */
export function SecondaryButton({ whatsapp, compact, ...p }: BtnProps & { whatsapp?: boolean; compact?: boolean }) {
  const c = useColors();
  if (!whatsapp) return <View testID={p.testID}><Button {...p} variant="secondary" size={compact ? "M" : "L"} /></View>;
  return (
    <PressScale onPress={() => { tap(); p.onPress(); }} disabled={p.disabled} accessibilityRole="button" accessibilityLabel={p.a11yLabel ?? p.title} testID={p.testID} scaleTo={0.98}
      style={[{ minHeight: compact ? HIT : 52, borderRadius: R.button, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: S.lg, opacity: p.disabled ? 0.4 : 1 }, curve]}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.whatsapp }} />
      <Text variant="button">{p.title}</Text>
    </PressScale>
  );
}

/** Small pill above a question ("Someone else", "From your profile", "Optional", "Last question"). */
export function Chip({ label, tone = "accent" }: { label: string; tone?: "accent" | "neutral" }) {
  const c = useColors();
  return <View style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: R.round, backgroundColor: tone === "accent" ? c.accentSoft : c.fill }}><Text variant="footnote" weight="600" color={tone === "accent" ? c.accent : c.textSecondary}>{label}</Text></View>;
}

/** Info note (13 pt). neutral = white card with an info icon; info = blue tint; success = green; later = amber "To get later". */
export function InfoNote({ tone = "neutral", text, children, icon }: { tone?: "neutral" | "info" | "success" | "later"; text?: string; children?: React.ReactNode; icon?: IconName }) {
  const c = useColors(); const dark = useIsDark();
  const fg = tone === "info" ? c.accent : tone === "success" ? c.success : tone === "later" ? c.warning : c.textSecondary;
  const bg = tone === "info" ? c.accentSoft : tone === "success" ? c.successSoft : tone === "later" ? c.warningSoft : dark ? c.surface : c.surfaceRaised;
  const ic: IconName = icon ?? (tone === "neutral" ? "info.circle" : tone === "later" ? "exclamationmark.circle.fill" : "checkmark.circle.fill");
  return (
    <View accessible style={[{ flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: R.input, backgroundColor: bg }, tone === "neutral" && { borderWidth: 1, borderColor: c.border }, curve]}>
      <Icon name={ic} size={16} color={fg} />
      <View style={{ flex: 1 }}>{!!text && <Text variant="note" color={fg} weight={tone === "later" ? "600" : undefined}>{text}</Text>}{children}</View>
    </View>
  );
}


