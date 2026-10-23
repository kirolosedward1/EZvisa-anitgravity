// Rows and groups for the country screen: iOS inset-grouped lists whose text always wraps (never clipped at the
// largest Dynamic Type size). At large text the value moves under the label instead of sharing the line.
import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, PressScale, Surface, Text, type IconName } from "../ui";
import { useColors, useLargeText, S, ICON, HIT, PRESS } from "../../lib/theme";
import { useT } from "../../lib/i18n";

/** Section title (an accessibility header) above a group, with an optional trailing action. */
export function GroupHeader({ title, action, onAction, testID }: { title: string; action?: string; onAction?: () => void; testID?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: S.sm, marginHorizontal: S.gutter, marginBottom: S.xs }} testID={testID}>
      <Text variant="title3" accessibilityRole="header" style={{ flex: 1 }}>{title}</Text>
      {!!action && (
        <PressScale onPress={onAction} accessibilityRole="button" style={{ minHeight: HIT, justifyContent: "flex-end" }}>
          <Text variant="subhead" tone="accent" weight="600">{action}</Text>
        </PressScale>
      )}
    </View>
  );
}

/** Inset-grouped card with hairline separators (kept in dark mode by the E0 surface border). */
export function Group({ children, footer, inset = S.gutter + ICON.lg + S.sm, style }: { children: React.ReactNode; footer?: string; inset?: number; style?: object }) {
  const c = useColors();
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return (
    <View style={style}>
      <Surface level={0} style={{ marginHorizontal: S.gutter, overflow: "hidden" }}>
        {items.map((ch, i) => (
          <View key={i}>{ch}{i < items.length - 1 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginStart: inset }} />}</View>
        ))}
      </Surface>
      {!!footer && <Text variant="footnote" tone="secondary" style={{ marginHorizontal: S.gutter + S.md, marginTop: S.xs }}>{footer}</Text>}
    </View>
  );
}

/** One row: SF Symbol in the accent colour, label, optional subtitle, optional value (end-aligned, wrapping).
 *  VoiceOver reads it as one element ("Stay, up to 90 days in any 180 days"). A row without onPress has no chevron. */
export function InfoRow({ icon, title, subtitle, value, onPress, a11yHint, testID }: { icon?: IconName; title: string; subtitle?: string; value?: string; onPress?: () => void; a11yHint?: string; testID?: string }) {
  const c = useColors(); const large = useLargeText(); const { rtl } = useT();
  const stack = large || (value?.length ?? 0) > 28; // a long value reads better under its label than squeezed beside it
  const label = [title, subtitle, value].filter(Boolean).join(", ");
  return (
    <PressScale onPress={onPress} disabled={!onPress} scaleTo={onPress ? PRESS.scaleLarge : 1}
      accessible accessibilityRole={onPress ? "button" : "text"} accessibilityLabel={label} accessibilityHint={a11yHint} testID={testID}
      style={{ minHeight: HIT + S.xs, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", alignItems: stack ? "flex-start" : "center", gap: S.sm }}>
      {!!icon && <View style={{ width: ICON.lg, alignItems: "center", paddingTop: stack ? S.xxs / 2 : 0 }}><Icon name={icon} size={ICON.md} color={c.accent} weight="medium" /></View>}
      <View style={{ flex: 1, flexDirection: stack ? "column" : "row", alignItems: stack ? "stretch" : "center", gap: stack ? S.xxs / 2 : S.sm }}>
        <View style={{ flexShrink: 1, flexGrow: stack ? 0 : 1 }}>
          <Text variant="body">{title}</Text>
          {!!subtitle && <Text variant="subhead" tone="secondary">{subtitle}</Text>}
        </View>
        {!!value && (stack ? <Text variant="subhead" tone="secondary">{value}</Text>
          : <View style={{ flexShrink: 1, maxWidth: "62%", alignItems: "flex-end" }}><Text variant="body" tone="secondary">{value}</Text></View>)}
      </View>
      {!!onPress && <Icon name={rtl ? "chevron.left" : "chevron.right"} size={ICON.sm} color={c.tertiaryLabel} weight="semibold" style={{ alignSelf: "center" }} />}
    </PressScale>
  );
}
