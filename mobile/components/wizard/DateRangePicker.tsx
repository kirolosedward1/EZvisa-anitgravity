// One date-range picker for the trip (departure + return). Pure React Native, no extra native module, so it works the
// same in Expo Go and on every SDK 57 target. The month grid divides the measured width by 7, so it fills 390 and 430 pt
// phones without clipping (and 320 pt ones with 40 pt cells). Values in and out are "YYYY-MM-DD"; display uses the
// phone's locale (lib/locale.ts), including the first day of the week.
import { useMemo, useState } from "react";
import { I18nManager, Pressable, View } from "react-native";
import { Icon, PressScale, Text } from "../ui";
import { useColors, S, R, curve, HIT } from "../../lib/theme";
import { select } from "../../lib/haptics";
import { useT } from "../../lib/i18n";
import { useDateLocale } from "../../lib/locale";
import { addMonthsYm, monthGrid, monthOf, todayIso, type IsoDate } from "../../lib/dates";
import { PRESETS, presetEnd, tapDay, type RangeEnd } from "../../lib/dateRange";

type Props = {
  start: string; end: string; onChange: (start: string, end: string) => void;
  /** Earliest selectable departure (website: today + 15). */
  min: IsoDate;
  startError?: string; endError?: string;
  /** Under the errors, e.g. a shortcut to fix the passport expiry. */
  footer?: React.ReactNode;
  testID?: string;
};

export function DateRangePicker({ start, end, onChange, min, startError, endError, footer, testID = "date-range" }: Props) {
  const c = useColors(); const { t, rtl } = useT(); const L = useDateLocale();
  const isRTL = rtl || I18nManager.isRTL;
  const [editing, setEditing] = useState<RangeEnd>(start && !end ? "end" : "start");
  const [ym, setYm] = useState(monthOf(start || min));
  const [w, setW] = useState(0);
  const today = todayIso();
  const firstYm = monthOf(start && start < min ? start : min), lastYm = addMonthsYm(monthOf(min), 24);
  const grid = useMemo(() => monthGrid(ym, L.firstWeekday), [ym, L.firstWeekday]);
  const order = Array.from({ length: 7 }, (_, i) => (L.firstWeekday - 1 + i) % 7);
  const cell = w ? Math.floor(w / 7) : 0; const cellH = Math.min(cell, 48); const dot = Math.max(0, Math.min(cell, cellH) - 4);

  const pick = (d: IsoDate) => { select(); const r = tapDay(d, start, end, editing); setEditing(r.editing); onChange(r.start, r.end); };
  const tile = (which: RangeEnd, label: string, value: string, err?: string) => {
    const on = editing === which;
    return (
      <PressScale onPress={() => { select(); setEditing(which); if (value) setYm(monthOf(value)); }} accessibilityRole="button" accessibilityState={{ selected: on }}
        accessibilityLabel={`${t(label)}, ${value ? L.full(value) : t("not set")}`} accessibilityHint={t("Pick on the calendar")} testID={`${testID}-${which}`}
        style={[{ flex: 1, minHeight: 64, borderRadius: R.tile, paddingHorizontal: S.sm, paddingVertical: S.xs, justifyContent: "center", gap: S.xxs, backgroundColor: c.card,
          borderWidth: 1.5, borderColor: err ? c.red : on ? c.accent : "transparent" }, curve]}>
        <Text variant="caption" weight="600" color={err ? c.red : on ? c.accent : c.secondaryLabel}>{t(label)}</Text>
        <Text variant="headline" weight={value ? "600" : "400"} color={value ? c.label : c.tertiaryLabel} numberOfLines={2}>{value ? L.medium(value) : t("Select")}</Text>
      </PressScale>
    );
  };
  const errs = [startError, endError].filter((x, i, a): x is string => !!x && a.indexOf(x) === i);

  return (
    <View style={{ gap: S.md }} testID={testID}>
      <View style={{ flexDirection: "row", gap: S.xs }}>
        {tile("start", "Departure", start, startError)}
        {tile("end", "Return", end, endError)}
      </View>
      {errs.length > 0 ? (
        <View style={{ gap: S.xxs }} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="question-error">
          {errs.map((e) => (
            <View key={e} style={{ flexDirection: "row", gap: S.xxs, alignItems: "flex-start" }}>
              <Icon name="exclamationmark.circle.fill" size={14} color={c.red} style={{ marginTop: 2 }} />
              <Text variant="footnote" tone="red" weight="500" style={{ flex: 1 }}>{t(e)}</Text>
            </View>
          ))}
          {footer}
        </View>
      ) : start && !end ? <Text variant="footnote" tone="secondary">{t("Now pick your return date.")}</Text> : null}

      {!!start && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }} accessibilityRole="radiogroup" accessibilityLabel={t("Trip length")} testID="date-quickpicks">
          {PRESETS.map((p) => {
            const v = presetEnd(start, p); const on = end === v;
            return (
              <PressScale key={p.label} onPress={() => { select(); setEditing("start"); onChange(start, v); }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${t(p.label)}, ${L.full(v)}`}
                style={{ flexGrow: 1, flexBasis: 0, minWidth: 72, minHeight: HIT, paddingHorizontal: S.xs, borderRadius: R.round, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.accentFill : c.card }}>
                <Text variant="subhead" weight="600" numberOfLines={1} color={on ? c.onAccent : c.label}>{t(p.label)}</Text>
              </PressScale>
            );
          })}
        </View>
      )}

      <View style={[{ borderRadius: R.card, backgroundColor: c.card, paddingHorizontal: S.xs, paddingBottom: S.xs }, curve]}>
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: HIT + S.xs }}>
          <MonthArrow dir={-1} disabled={ym <= firstYm} label={t("Previous month")} rtl={isRTL} onPress={() => setYm(addMonthsYm(ym, -1))} />
          <Text variant="headline" center style={{ flex: 1 }} accessibilityRole="header" accessibilityLiveRegion="polite" testID={`${testID}-month`}>{L.month(ym)}</Text>
          <MonthArrow dir={1} disabled={ym >= lastYm} label={t("Next month")} rtl={isRTL} onPress={() => setYm(addMonthsYm(ym, 1))} />
        </View>
        <View onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))}>
          <View style={{ flexDirection: "row" }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {order.map((i) => <Text key={i} variant="caption" tone="secondary" center maxFontSizeMultiplier={1.2} style={{ flex: 1, paddingVertical: S.xxs }}>{L.weekdays[i].narrow}</Text>)}
          </View>
          {cell > 0 && grid.map((row, r) => (
            <View key={r} style={{ flexDirection: "row" }}>
              {row.map((d, i) => {
                if (!d) return <View key={i} style={{ width: cell, height: cellH }} />;
                const isStart = d === start, isEnd = d === end, inside = !!start && !!end && d > start && d < end;
                const disabled = d < min; const sel = isStart || isEnd;
                const band = !!start && !!end && start < end && (inside || (isStart && !isEnd) || (isEnd && !isStart));
                // The band joins the two circles; it runs to the cell's far edge (which side flips in RTL).
                const lead = isStart ? (isRTL ? "right" : "left") : isEnd ? (isRTL ? "left" : "right") : null;
                return (
                  <Pressable key={d} disabled={disabled} onPress={() => pick(d)} testID={`day-${d}`}
                    accessibilityRole="button" accessibilityState={{ disabled, selected: sel }}
                    accessibilityLabel={`${L.full(d)}${isStart ? `, ${t("Departure")}` : isEnd ? `, ${t("Return")}` : ""}`}
                    style={{ width: cell, height: cellH, alignItems: "center", justifyContent: "center" }}>
                    {band && <View style={{ position: "absolute", top: (cellH - dot) / 2, height: dot, left: 0, right: 0, ...(lead && { [lead]: "50%" }), backgroundColor: c.accentSoft }} />}
                    <View style={{ width: dot, height: dot, borderRadius: R.round, alignItems: "center", justifyContent: "center", backgroundColor: sel ? c.accentFill : "transparent",
                      borderWidth: d === today && !sel ? 1 : 0, borderColor: c.separator }}>
                      <Text variant="body" tabular maxFontSizeMultiplier={1.25} weight={sel ? "700" : "400"} color={sel ? c.onAccent : disabled ? c.tertiaryLabel : c.label}
                        style={disabled && { opacity: 0.55 }}>{L.day(d)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function MonthArrow({ dir, disabled, label, onPress, rtl }: { dir: 1 | -1; disabled: boolean; label: string; onPress: () => void; rtl: boolean }) {
  const c = useColors();
  return (
    <PressScale onPress={() => { select(); onPress(); }} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} hitSlop={4}
      style={{ width: HIT, height: HIT, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.3 : 1, transform: [{ scaleX: rtl ? -1 : 1 }] }}>
      <Icon name={dir < 0 ? "chevron.left" : "chevron.right"} size={17} color={c.accent} weight="semibold" />
    </PressScale>
  );
}
