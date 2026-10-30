// "When are you travelling?": one screen for departure + return (Fixed dates range calendar or Flexible window).
// Writes the same form keys as before (travelStartDate / travelEndDate -> entry_date / exit_date) and datesFlexible
// (kept in the application's wizard answers JSON). No schema change.
import React, { useMemo, useState } from "react";
import { ScrollView, View, Pressable, I18nManager } from "react-native";
import { Text, Icon } from "../ui";
import { useT } from "../../lib/i18n";
import { select } from "../../lib/haptics";
import { S, R, useColors } from "../../lib/theme";
import { earliestDeparture, iso, type WizardForm } from "../../lib/wizard";

/** Calendar palette from the theme tokens, so the picker follows dark mode like the rest of the wizard. */
function usePalette() {
  const c = useColors();
  return { BLUE: c.accentFill, FILL: c.accentMuted, PAST: c.textDisabled, TRACK: c.fill, BORDER: c.border, INK: c.label, WHITE: c.surface, SOFT: c.accentSoft, ON: c.onAccent, SHADOW: c.shadow };
}
const DAY = 86400000;
const parse = (s?: string) => (s ? (([y, m, d]) => new Date(y, m - 1, d))(s.split("-").map(Number)) : undefined);
const addDays = (s: string, n: number) => { const d = parse(s)!; return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
export const stayDays = (a?: string, b?: string) => (a && b ? Math.round((parse(b)!.getTime() - parse(a)!.getTime()) / DAY) + 1 : 0);
// Schengen counting: entry and exit days both count, so "1 week" = entry + 6 = 7 days (chip, summary and stored dates agree).
const DURS = [[7, "1 week"], [14, "2 weeks"], [21, "3 weeks"], [30, "1 month"]] as const;

export function useDateFmt() {
  const { lang } = useT(); const loc = lang === "ar" ? "ar-u-nu-latn" : "en-GB";
  return { loc, short: (s: string) => parse(s)!.toLocaleDateString(loc, { day: "numeric", month: "short" }) };
}

export function DatesAnswer({ f, patch }: { f: WizardForm; patch: (p: Partial<WizardForm>) => void }) {
  const P = usePalette();
  const { t } = useT();
  const flexible = f.datesFlexible === "yes";
  // Canvas: Flexible is the default for a new trip; saved exact dates open on "I have exact dates".
  React.useEffect(() => { if (!f.datesFlexible) patch({ datesFlexible: f.travelStartDate ? "no" : "yes" }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const seg = (on: boolean, label: string, v: "no" | "yes") => (
    <Pressable key={v} onPress={() => { select(); patch({ datesFlexible: v }); }} accessibilityRole="tab" accessibilityState={{ selected: on }} aria-selected={on} accessibilityLabel={label}
      style={{ flex: 1, minHeight: 36, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: on ? P.WHITE : "transparent", ...(on ? { shadowColor: P.SHADOW, shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null) }}>
      <Text variant="subhead" weight="600" color={on ? P.BLUE : P.INK}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: S.md }}>
      <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: P.TRACK, borderRadius: 11, padding: 2 }} testID="dates-mode">
        {seg(!flexible, t("I have exact dates"), "no")}{seg(flexible, t("Flexible"), "yes")}
      </View>
      {flexible ? <Flexible f={f} patch={patch} /> : <Fixed f={f} patch={patch} />}
    </View>
  );
}

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  const P = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on, selected: on }} aria-checked={on} aria-selected={on} accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 36, paddingHorizontal: S.md, borderRadius: R.round, alignItems: "center", justifyContent: "center", backgroundColor: on ? P.BLUE : P.WHITE, borderWidth: on ? 0 : 1, borderColor: P.BORDER, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <Text variant="subhead" weight="600" numberOfLines={1} color={on ? P.ON : P.INK}>{label}</Text>
    </Pressable>
  );
}

function Fixed({ f, patch }: { f: WizardForm; patch: (p: Partial<WizardForm>) => void }) {
  const P = usePalette();
  const { t } = useT(); const { loc } = useDateFmt();
  const [w, setW] = useState(0); const cell = w ? Math.floor(w / 7) : 44;
  const min = iso(earliestDeparture()); const todayS = iso(new Date());
  const start = f.travelStartDate, end = f.travelEndDate;
  const months = useMemo(() => { const n = earliestDeparture(); return Array.from({ length: 13 }, (_, i) => new Date(n.getFullYear(), n.getMonth() + i, 1)); }, []);
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(loc, { weekday: "narrow" })), [loc]); // Mon-first
  const tapDay = (d: string) => {
    if (d < min) return; select();
    if (!start || (start && end) || d <= start) patch({ travelStartDate: d, travelEndDate: "" });
    else patch({ travelEndDate: d });
  };
  const long = (d?: string) => (d ? parse(d)!.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" }) : "—");
  const n = stayDays(start, end);
  const cellBox = (k: string, v: string, testID: string) => (
    <View style={{ flex: 1, gap: 2, paddingVertical: S.sm, paddingHorizontal: S.sm }} accessible accessibilityLabel={`${k}: ${v}`} testID={testID}>
      <Text variant="caption" tone="secondary">{k}</Text><Text variant="callout" weight="600" numberOfLines={1}>{v}</Text>
    </View>
  );
  return (
    <View style={{ gap: S.md }}>
      <View style={{ flexDirection: "row", backgroundColor: P.WHITE, borderRadius: R.tile, borderWidth: 1, borderColor: P.BORDER }} testID="dates-exact-summary">
        {cellBox(t("Departure"), long(start), "dates-departure")}
        <View style={{ width: 1, backgroundColor: P.BORDER }} />
        {cellBox(t("Return"), long(end), "dates-return")}
        <View style={{ width: 1, backgroundColor: P.BORDER }} />
        {cellBox(t("Stay"), n > 0 && end ? t(n === 1 ? "1 day" : "{n} days", { n }) : "—", "dates-stay")}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }} accessibilityRole="radiogroup" accessibilityLabel={t("Trip length")} testID="date-quickpicks">
        {DURS.map(([n, l]) => { const v = start ? addDays(start, n - 1) : ""; return <Chip key={n} on={!!start && end === v} label={t(l)} onPress={() => { if (!start) { select(); const s = min; patch({ travelStartDate: s, travelEndDate: addDays(s, n - 1) }); return; } select(); patch({ travelEndDate: v }); }} />; })}
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 380, borderRadius: R.tile, backgroundColor: P.WHITE, overflow: "hidden" }}>
        <ScrollView nestedScrollEnabled stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", backgroundColor: P.WHITE, borderBottomWidth: 1, borderBottomColor: P.BORDER, paddingVertical: S.xs }}>
            {weekdays.map((d, i) => <Text key={i} variant="caption" tone="secondary" weight="600" style={{ width: cell, textAlign: "center" }}>{d}</Text>)}
          </View>
          {months.map((m) => {
            const lead = (m.getDay() + 6) % 7; const dim = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
            const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => iso(new Date(m.getFullYear(), m.getMonth(), i + 1)))];
            return (
              <View key={m.toISOString()} style={{ paddingTop: S.md }}>
                <Text variant="headline" weight="600" style={{ paddingHorizontal: S.sm, marginBottom: S.xs, textAlign: I18nManager.isRTL ? "right" : "left" }}>{m.toLocaleDateString(loc, { month: "long", year: "numeric" })}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {cells.map((d, i) => {
                    if (!d) return <View key={`e${i}`} style={{ width: cell, height: 44 }} />;
                    const past = d < min; const isS = d === start, isE = d === end; const inR = !!start && !!end && d > start && d < end;
                    const edge = isS || isE; const band = (inR || (edge && !!start && !!end && start !== end));
                    return (
                      <Pressable key={d} disabled={past} onPress={() => tapDay(d)} accessibilityRole="button" accessibilityState={{ disabled: past, selected: edge }} aria-pressed={edge} aria-disabled={past}
                        accessibilityLabel={parse(d)!.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" })}
                        style={{ width: cell, height: 44, alignItems: "center", justifyContent: "center" }}>
                        {band && <View style={{ position: "absolute", top: 4, bottom: 4, start: isS ? cell / 2 : 0, end: isE ? cell / 2 : 0, backgroundColor: P.FILL }} />}
                        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: edge ? P.BLUE : "transparent", borderWidth: d === todayS && !edge ? 1 : 0, borderColor: P.BLUE }}>
                          <Text variant="subhead" weight={edge ? "600" : "500"} color={edge ? P.ON : past ? P.PAST : P.INK}>{parse(d)!.getDate()}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function Flexible({ f, patch }: { f: WizardForm; patch: (p: Partial<WizardForm>) => void }) {
  const P = usePalette();
  const { t } = useT(); const { loc } = useDateFmt();
  const min = iso(earliestDeparture());
  // Eight months from this one; a month that ends before the earliest departure (15 days out) is "too soon".
  const months = useMemo(() => { const n = new Date(); return Array.from({ length: 8 }, (_, i) => new Date(n.getFullYear(), n.getMonth() + i, 1)); }, []);
  const key = (d: Date) => iso(d).slice(0, 7);
  const tooSoon = (m: Date) => iso(new Date(m.getFullYear(), m.getMonth() + 1, 0)) < min;
  const [win, setWin] = useState<[string, string] | null>(() => (f.travelStartDate ? [f.travelStartDate.slice(0, 7), (f.travelEndDate || f.travelStartDate).slice(0, 7)] : null));
  const [stay, setStay] = useState(() => Math.max(2, stayDays(f.travelStartDate, f.travelEndDate) || 10));
  const apply = (w: [string, string], n: number) => {
    const first = `${w[0]}-01`; const dep = first < min ? min : first;
    patch({ travelStartDate: dep, travelEndDate: addDays(dep, n - 1) });
  };
  /** One month, or two next to each other (tapping the neighbour of a single month joins it). */
  const pickMonth = (k: string) => {
    select();
    const next = (a: string) => { const [y, m] = a.split("-").map(Number); return iso(new Date(y, m, 1)).slice(0, 7); };
    let w: [string, string] = [k, k];
    if (win && win[0] === win[1] && next(win[0]) === k) w = [win[0], k];
    else if (win && win[0] === win[1] && next(k) === win[0]) w = [k, win[0]];
    setWin(w); apply(w, stay);
  };
  const step = (d: number) => { const n = Math.min(90, Math.max(2, stay + d)); if (n === stay) return; select(); setStay(n); if (win) apply(win, n); };
  const monthName = (k: string) => { const [y, m] = k.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString(loc, { month: "long" }); };
  const btn = (d: number, label: string, glyph: string) => (
    <Pressable onPress={() => step(d)} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: P.BORDER, backgroundColor: P.WHITE, alignItems: "center", justifyContent: "center" }}>
      <Text variant="headline" color={P.BLUE}>{glyph}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: S.lg }}>
      <View style={{ gap: S.sm }}>
        <Text variant="optionSm" weight="600" accessibilityRole="header">{t("How long?")}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: P.WHITE, borderRadius: R.tile, borderWidth: 1, borderColor: P.BORDER, paddingHorizontal: S.sm, paddingVertical: S.sm }}
          accessibilityRole="adjustable" accessibilityLabel={t("Stay length")} accessibilityValue={{ text: t("{n} days", { n: stay }) }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]} onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)} testID="flex-stay">
          {btn(-1, t("Fewer days"), "−")}
          <View style={{ alignItems: "center" }}>
            <Text variant="resultTitle" accessibilityLiveRegion="polite">{t("{n} days", { n: stay })}</Text>
            <Text variant="caption" tone="secondary">{t("Up to 90")}</Text>
          </View>
          {btn(1, t("More days"), "+")}
        </View>
      </View>
      <View style={{ gap: S.sm }}>
        <View style={{ gap: 2 }}>
          <Text variant="optionSm" weight="600" accessibilityRole="header">{t("Which month?")}</Text>
          <Text variant="note" tone="secondary">{t("Pick one, or two next to each other")}</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }} accessibilityRole="radiogroup" testID="flex-months">
          {months.map((m) => {
            const k = key(m); const soon = tooSoon(m); const on = !!win && k >= win[0] && k <= win[1];
            const label = m.toLocaleDateString(loc, { month: "short", year: "numeric" });
            return (
              <Pressable key={k} disabled={soon} onPress={() => pickMonth(k)} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: soon }} aria-checked={on}
                accessibilityLabel={soon ? `${label}, ${t("too soon")}` : label}
                style={({ pressed }) => ({ width: "23.5%", minHeight: 56, borderRadius: R.button, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
                  backgroundColor: on ? P.BLUE : P.WHITE, borderWidth: on ? 0 : 1, borderColor: P.BORDER, opacity: soon ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                <Text variant="callout" weight="600" color={on ? P.ON : P.INK} numberOfLines={1}>{m.toLocaleDateString(loc, { month: "short" })}</Text>
                <Text variant="caption" color={on ? P.ON : P.PAST} numberOfLines={1}>{soon ? t("too soon") : String(m.getFullYear())}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {!!win && (
        <View style={{ flexDirection: "row", gap: S.xs, alignItems: "flex-start", backgroundColor: P.SOFT, borderRadius: R.tile, padding: S.md }} testID="flex-summary">
          <Icon name="calendar" size={16} color={P.BLUE} />
          <Text variant="note" style={{ flex: 1 }}>{t("{n} days, {months}. We confirm exact dates before booking.", { n: stay, months: win[0] === win[1] ? monthName(win[0]) : t("{a} or {b}", { a: monthName(win[0]), b: monthName(win[1]) }) })}</Text>
        </View>
      )}
    </View>
  );
}
