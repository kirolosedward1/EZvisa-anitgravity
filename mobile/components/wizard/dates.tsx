// "When are you travelling?": one screen for departure + return (Fixed dates range calendar or Flexible window).
// Writes the same form keys as before (travelStartDate / travelEndDate -> entry_date / exit_date) and datesFlexible
// (kept in the application's wizard answers JSON). No schema change.
import React, { useMemo, useState } from "react";
import { ScrollView, View, Pressable, I18nManager } from "react-native";
import { Text, Icon } from "../ui";
import { useT } from "../../lib/i18n";
import { select } from "../../lib/haptics";
import { S, R, useColors, useIsDark } from "../../lib/theme";
import { earliestDeparture, iso, type WizardForm } from "../../lib/wizard";

/** Calendar palette from the theme tokens, so the picker follows dark mode like the rest of the wizard. */
function usePalette() {
  const c = useColors(); const dark = useIsDark();
  return { BLUE: c.accentFill, FILL: c.accentSoft, PAST: c.tertiaryLabel, TRACK: c.fill, BORDER: c.border, INK: c.label, WHITE: c.surface, SOFT: dark ? c.fillSubtle : "#F2F5FF", ON: c.onAccent };
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

/** Summary bar shown above Continue on the dates screen. */
export function DatesSummary({ f, patch }: { f: WizardForm; patch?: (p: Partial<WizardForm>) => void }) {
  const P = usePalette();
  const { t } = useT(); const { short } = useDateFmt();
  if (!f.travelStartDate) return null;
  const n = stayDays(f.travelStartDate, f.travelEndDate);
  const text = f.travelEndDate && n > 0 ? `${short(f.travelStartDate)} – ${short(f.travelEndDate)} · ${t(n === 1 ? "1 day" : "{n} days", { n })}` : `${short(f.travelStartDate)} – ${t("Select return date")}`;
  const flex = f.datesFlexible === "yes" && !!patch;
  const body = (<>
      <Icon name="calendar" size={15} color={P.BLUE} />
      <Text variant="subhead" weight="600" color={P.BLUE} style={{ flex: 1 }}>{text}</Text>
      {flex && <Text variant="subhead" weight="600" color={P.BLUE}>{t("Edit")}</Text>}
    </>);
  const st = { flexDirection: "row" as const, alignItems: "center" as const, gap: S.xs, backgroundColor: P.SOFT, borderRadius: R.tile, paddingHorizontal: S.md, paddingVertical: S.sm, marginBottom: S.sm };
  if (flex) return (
    // Flexible: shows the exact entry/exit dates that will be saved; tap to switch to Fixed with them prefilled.
    <Pressable testID="dates-summary" onPress={() => { select(); patch!({ datesFlexible: "no" }); }} accessibilityRole="button" accessibilityLabel={`${text}, ${t("Edit exact dates")}`}
      style={({ pressed }) => [st, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>{body}</Pressable>
  );
  return <View testID="dates-summary" accessible accessibilityLabel={text} style={st}>{body}</View>;
}

export function DatesAnswer({ f, patch }: { f: WizardForm; patch: (p: Partial<WizardForm>) => void }) {
  const P = usePalette();
  const { t } = useT();
  const flexible = f.datesFlexible === "yes";
  React.useEffect(() => { if (!f.datesFlexible) patch({ datesFlexible: "no" }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const seg = (on: boolean, label: string, v: "no" | "yes") => (
    <Pressable key={v} onPress={() => { select(); patch({ datesFlexible: v }); }} accessibilityRole="tab" accessibilityState={{ selected: on }} aria-selected={on} accessibilityLabel={label}
      style={{ flex: 1, minHeight: 36, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: on ? P.WHITE : "transparent", ...(on ? { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null) }}>
      <Text variant="subhead" weight="600" color={on ? P.BLUE : P.INK}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: S.md }}>
      <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: P.TRACK, borderRadius: 11, padding: 2 }} testID="dates-mode">
        {seg(!flexible, t("Fixed dates"), "no")}{seg(flexible, t("Flexible"), "yes")}
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
  return (
    <View style={{ gap: S.md }}>
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
                <Text variant="headline" weight="700" style={{ paddingHorizontal: S.sm, marginBottom: S.xs, textAlign: I18nManager.isRTL ? "right" : "left" }}>{m.toLocaleDateString(loc, { month: "long", year: "numeric" })}</Text>
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
                          <Text variant="subhead" weight={edge ? "700" : "500"} color={edge ? P.ON : past ? P.PAST : P.INK}>{parse(d)!.getDate()}</Text>
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
  const months = useMemo(() => { const n = earliestDeparture(); return Array.from({ length: 12 }, (_, i) => new Date(n.getFullYear(), n.getMonth() + i, 1)); }, []);
  const key = (d: Date) => iso(d).slice(0, 7);
  const [win, setWin] = useState<[string, string] | null>(() => (f.travelStartDate ? [f.travelStartDate.slice(0, 7), (f.travelEndDate || f.travelStartDate).slice(0, 7)] : null));
  const [stay, setStay] = useState(() => Math.max(1, stayDays(f.travelStartDate, f.travelEndDate) || 7));
  const apply = (w: [string, string], n: number) => {
    const first = `${w[0]}-01`; const dep = first < min ? min : first;
    const [ey, em] = w[1].split("-").map(Number); const winEnd = iso(new Date(ey, em, 0));
    let ret = addDays(dep, n - 1); if (ret > winEnd && winEnd > dep) ret = winEnd;
    patch({ travelStartDate: dep, travelEndDate: ret === dep ? addDays(dep, 1) : ret });
  };
  const pickMonth = (k: string) => {
    select();
    const w: [string, string] = !win || win[0] !== win[1] || k < win[0] ? [k, k] : [win[0], k];
    setWin(w); apply(w, stay);
  };
  const step = (d: number) => { const n = Math.min(90, Math.max(2, stay + d)); if (n === stay) return; select(); setStay(n); if (win) apply(win, n); };
  return (
    <View style={{ gap: S.md }}>
      <Text variant="subhead" weight="600" tone="secondary">{t("Travel anytime between")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.xs }} accessibilityRole="radiogroup">
        {months.map((m) => { const k = key(m); const on = !!win && k >= win[0] && k <= win[1]; return <Chip key={k} on={on} label={m.toLocaleDateString(loc, { month: "short", year: "numeric" })} onPress={() => pickMonth(k)} />; })}
      </ScrollView>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: P.WHITE, borderRadius: R.tile, paddingHorizontal: S.md, paddingVertical: S.sm }}>
        <Text variant="body" weight="600">{t("Stay length")}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
          <Pressable onPress={() => step(-1)} accessibilityRole="button" accessibilityLabel={t("Fewer days")} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: P.BORDER, alignItems: "center", justifyContent: "center" }}><Text variant="headline" color={P.BLUE}>−</Text></Pressable>
          <Text variant="body" weight="700" style={{ minWidth: 64, textAlign: "center" }} accessibilityLiveRegion="polite">{t("{n} days", { n: stay })}</Text>
          <Pressable onPress={() => step(1)} accessibilityRole="button" accessibilityLabel={t("More days")} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: P.BORDER, alignItems: "center", justifyContent: "center" }}><Text variant="headline" color={P.BLUE}>+</Text></Pressable>
        </View>
      </View>
      <Text variant="footnote" tone="secondary">{t("We'll use the first possible day in your window. You can change to exact dates any time before documents.")}</Text>
      {!!f.travelStartDate && <Pressable onPress={() => { select(); patch({ datesFlexible: "no" }); }} accessibilityRole="button"><Text variant="subhead" weight="600" color={P.BLUE}>{t("Adjust exact dates")}</Text></Pressable>}
    </View>
  );
}
