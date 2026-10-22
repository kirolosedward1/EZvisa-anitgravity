import { PressScale } from "../ui";
// Answer controls for the one-question-per-screen wizard: big tappable choices, Yes / No tiles, a field that opens the
// searchable bottom-sheet picker for long lists, a fixed (read-only) value row, native date pickers (iOS inline calendar / wheel, Android dialog, web date input) and the website's
// "additional countries" editor. All controls are VoiceOver-labelled and grow with Dynamic Type (no fixed heights).
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Flag, Icon, Text, Button } from "../ui";
import { useColors, useIsDark, S, R, curve, ICON } from "../../lib/theme";
import { select } from "../../lib/haptics";
import { useT } from "../../lib/i18n";
import { SCHENGEN, iso, type WizardForm } from "../../lib/wizard";
import type { Opt } from "../../lib/questions";
import { Note } from "./fields";
import { CountrySheet } from "../CountryPicker";

const parse = (s: string) => (s ? new Date(s + "T12:00:00") : undefined);
export const useFmtDate = () => {
  const { lang } = useT();
  return (s: string) => (s ? parse(s)!.toLocaleDateString(lang === "ar" ? "ar" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");
};

/** One big answer row. Selected = brand fill + check. */
export function AnswerRow({ label, selected, onPress, country, testID }: { label: string; selected?: boolean; onPress: () => void; country?: string; testID?: string }) {
  const c = useColors();
  return (
    <PressScale onPress={() => { select(); onPress(); }} accessibilityRole="radio" accessibilityState={{ checked: !!selected }} aria-checked={!!selected} accessibilityLabel={label} testID={testID}
      style={({ pressed }) => [{ minHeight: 60, borderRadius: R.tile, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", alignItems: "center", gap: S.sm,
        backgroundColor: selected ? c.tintFill : c.card, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }, curve]}>
      {!!country && <Flag country={country} size={32} />}
      <Text variant="headline" weight={selected ? "600" : "500"} color={selected ? c.onTint : c.label} style={{ flex: 1 }}>{label}</Text>
      <View style={{ width: 24, height: 24, borderRadius: R.round, borderWidth: selected ? 0 : 1.5, borderColor: c.tertiaryLabel, backgroundColor: selected ? "rgba(255,255,255,0.25)" : "transparent", alignItems: "center", justifyContent: "center" }}>
        {selected && <Icon name="checkmark" size={ICON.sm} color="#fff" weight="bold" />}
      </View>
    </PressScale>
  );
}

/** Short lists: one big tap row per option. `flags`: the options are countries, each row shows its own flag. */
export function ChoiceList({ label, options, value, onPick, flags }: { label: string; options: Opt[]; value: string; onPick: (v: string) => void; flags?: boolean }) {
  const { t } = useT();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: S.xs }}>
      {options.map((o) => <AnswerRow key={o.value} label={t(o.label)} selected={value === o.value} country={flags ? o.value : undefined} onPress={() => onPick(o.value)} testID={`answer-${o.value}`} />)}
    </View>
  );
}

/** Two large Yes / No tiles. */
export function YesNoTiles({ label, value, onPick }: { label: string; value: string; onPick: (v: "yes" | "no") => void }) {
  const c = useColors(); const { t } = useT();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", gap: S.sm }}>
      {(["yes", "no"] as const).map((v) => {
        const on = value === v;
        return (
          <PressScale key={v} onPress={() => { select(); onPick(v); }} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={v === "yes" ? t("Yes") : t("No")}
            style={({ pressed }) => [{ flex: 1, minHeight: 120, borderRadius: R.card, alignItems: "center", justifyContent: "center", gap: S.xs, padding: S.md,
              backgroundColor: on ? c.tintFill : c.card, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, curve]}>
            <Icon name={v === "yes" ? "checkmark.circle.fill" : "xmark.circle.fill"} size={ICON.xl} color={on ? "#fff" : c.secondaryLabel} />
            <Text variant="title3" color={on ? c.onTint : c.label}>{v === "yes" ? t("Yes") : t("No")}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}

/** Long lists: a large field showing the answer; tapping opens the searchable bottom sheet. Picking closes it. */
export function SheetAnswer({ label, names, value, onPick, placeholder, searchPlaceholder, error }: { label: string; names: string[]; value: string; onPick: (n: string) => void; placeholder: string; searchPlaceholder: string; error?: boolean }) {
  const c = useColors(); const { t } = useT(); const [open, setOpen] = useState(false);
  return (
    <>
      <PressScale onPress={() => { select(); setOpen(true); }} accessibilityRole="button" accessibilityLabel={`${label}, ${value ? t(value) : t("not set")}`} accessibilityHint={t("Opens a searchable list")} testID="sheet-field"
        style={({ pressed }) => [{ minHeight: 64, borderRadius: R.tile, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", alignItems: "center", gap: S.sm, backgroundColor: c.card,
          borderWidth: error ? 1.5 : 0, borderColor: c.red, opacity: pressed ? 0.8 : 1 }, curve]}>
        {value ? <Flag country={value} size={32} /> : <Icon name="magnifyingglass" size={18} color={c.secondaryLabel} />}
        <Text variant="headline" weight={value ? "600" : "400"} color={value ? c.label : c.secondaryLabel} style={{ flex: 1 }}>{value ? t(value) : t(placeholder)}</Text>
        <Icon name="chevron.up.chevron.down" size={14} color={c.secondaryLabel} />
      </PressScale>
      <CountrySheet visible={open} title={label} names={names} selectedName={value} searchPlaceholder={searchPlaceholder}
        onClose={() => setOpen(false)} onPick={(_, name) => { setOpen(false); onPick(name); }} />
    </>
  );
}

/** A value the user can't change (e.g. Country of Residence: United Arab Emirates). Not a control. */
export function FixedValue({ label, value }: { label: string; value: string }) {
  const c = useColors(); const { t } = useT();
  return (
    <View accessible accessibilityLabel={`${label}: ${t(value)}`} testID="fixed-value"
      style={{ minHeight: 52, borderRadius: R.tile, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", alignItems: "center", gap: S.sm, backgroundColor: c.fill }}>
      <View style={{ flex: 1, gap: S.xxs }}>
        <Text variant="footnote" tone="secondary">{label}</Text>
        <Text variant="body" weight="600">{t(value)}</Text>
      </View>
      <Icon name="lock.fill" size={14} color={c.secondaryLabel} />
    </View>
  );
}

/** Native date answer. iOS: inline calendar or wheel on the screen. Android: system dialog. Web: <input type=date>.
 *  `onDraft` reports the date the picker currently shows, so Continue can accept it without an extra tap. */
export function DateAnswer({ label, value, onChange, min, max, style, placeholder, defaultDate }: { label: string; value: string; onChange: (v: string) => void; min?: string; max?: string; style: "calendar" | "wheel"; placeholder?: string; defaultDate?: string }) {
  const c = useColors(); const dark = useIsDark(); const fmt = useFmtDate(); const { t, lang } = useT();
  const [open, setOpen] = useState(false); const [w, setW] = useState(0);
  const minD = min ? parse(min) : undefined, maxD = max ? parse(max) : undefined;
  const now = new Date();
  const clamp = (d: Date) => (maxD && d > maxD ? maxD : minD && d < minD ? minD : d);
  const initial = parse(value) ?? clamp((defaultDate && parse(defaultDate)) || now);
  // iOS wheel: the wheel itself is the answer, so an empty answer takes the date the wheel starts on.
  useEffect(() => { if (Platform.OS === "ios" && style === "wheel" && !value) onChange(iso(initial)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const box = (
    <View style={[{ minHeight: 60, borderRadius: R.tile, backgroundColor: c.card, paddingHorizontal: S.md, flexDirection: "row", alignItems: "center", gap: S.sm }, curve]}>
      <Icon name="calendar" size={18} color={c.tint} />
      <Text variant="headline" weight={value ? "600" : "400"} color={value ? c.label : c.secondaryLabel} style={{ flex: 1, paddingVertical: S.sm }}>{value ? fmt(value) : t(placeholder ?? "Select date")}</Text>
    </View>
  );
  if (Platform.OS === "web") return (
    <View>
      {box}
      {/* @ts-ignore react-native-web renders a DOM input */}
      <input type="date" value={value} min={min} max={max} onChange={(e: any) => e.target.value && onChange(e.target.value)} aria-label={label}
        style={{ position: "absolute", inset: 0, opacity: 0, border: "none", background: "transparent", width: "100%", height: "100%", cursor: "pointer", colorScheme: dark ? "dark" : "light" }} />
    </View>
  );
  if (Platform.OS === "android") return (
    <>
      <PressScale onPress={() => { select(); setOpen(true); }} accessibilityRole="button" accessibilityLabel={`${label}, ${value ? fmt(value) : t("not set")}`} accessibilityHint={t("Opens a date picker")}>{box}</PressScale>
      {open && <DateTimePicker value={initial} mode="date" minimumDate={minD} maximumDate={maxD} onChange={(e, d) => { setOpen(false); if (e.type === "set" && d) onChange(iso(d)); }} />}
    </>
  );
  return (
    <View style={{ gap: S.md }}>
      <Text variant="title2" weight="600" center color={value ? c.label : c.secondaryLabel} accessibilityLiveRegion="polite" testID="date-value">{value ? fmt(value) : t(placeholder ?? "Select date")}</Text>
      {style === "wheel" ? (
        // UIDatePicker keeps its intrinsic width unless given a number: measure the row and centre the wheel in it (no card).
        <View onLayout={(ev) => setW(Math.round(ev.nativeEvent.layout.width))} style={{ alignSelf: "stretch", alignItems: "center" }}>
          {w > 0 && <DateTimePicker key={`${w}-${dark}-${lang}`} value={initial} mode="date" display="spinner" minimumDate={minD} maximumDate={maxD} accentColor={c.tint} textColor={c.label} themeVariant={dark ? "dark" : "light"}
            locale={lang === "ar" ? "ar" : "en"} onChange={(_, d) => d && onChange(iso(d))} accessibilityLabel={label} style={{ width: w, height: 216, alignSelf: "center" }} />}
        </View>
      ) : (
      // Inline calendar: like the wheel, UIDatePicker only fills its box when given explicit numbers, so measure the card
      // and size the calendar to it (height follows the width; 6 week rows always fit), centred with even padding.
      <View onLayout={(ev) => setW(Math.round(ev.nativeEvent.layout.width))} style={[{ alignSelf: "stretch", alignItems: "center", borderRadius: R.card, backgroundColor: c.card, overflow: "hidden", paddingVertical: S.xs }, curve]}>
        {w > 0 && <DateTimePicker key={`${w}-${dark}-${lang}`} value={initial} mode="date" display="inline" minimumDate={minD} maximumDate={maxD} accentColor={c.tint} themeVariant={dark ? "dark" : "light"}
          locale={lang === "ar" ? "ar" : "en"} onChange={(_, d) => d && onChange(iso(d))} accessibilityLabel={label} style={{ width: w - S.md, height: Math.round(Math.min(w - S.md, 400) * 0.94), alignSelf: "center" }} />}
      </View>
      )}
    </View>
  );
}

/** The website's "Additional Countries to Visit" editor (country, arrival, departure; same checks and messages). */
export function AdditionalCountries({ f, onChange }: { f: WizardForm; onChange: (v: WizardForm["additionalCountries"]) => void }) {
  const c = useColors(); const { t } = useT(); const fmt = useFmtDate();
  const [nc, setNc] = useState(""); const [na, setNa] = useState(""); const [nd, setNd] = useState(""); const [err, setErr] = useState("");
  const added = f.additionalCountries;
  const addable = SCHENGEN.filter((n) => !added.some((a) => a.country === n) && n !== f.destination);
  const todayIso = iso(new Date());
  const dayAfter = (s: string) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + 1); return iso(d); };
  const add = () => {
    if (!nc || !na || !nd) return;
    if (nd <= na) { setErr(t("Departure date must be after arrival date")); return; }
    if (added.some((a) => a.country === nc)) { setErr(t("{c} is already added to your itinerary", { c: t(nc) })); return; }
    onChange([...added, { country: nc, arrivalDate: na, departureDate: nd }]); setNc(""); setNa(""); setNd(""); setErr("");
  };
  return (
    <View style={{ gap: S.md }}>
      {added.map((a) => (
        <View key={a.country} style={[{ flexDirection: "row", alignItems: "center", gap: S.sm, padding: S.md, borderRadius: R.tile, backgroundColor: c.card }, curve]}>
          <Flag country={a.country} size={32} />
          <View style={{ flex: 1 }}>
            <Text variant="headline">{t(a.country)}</Text>
            <Text variant="subhead" tone="secondary">{fmt(a.arrivalDate)} → {fmt(a.departureDate)}</Text>
          </View>
          <PressScale onPress={() => { select(); onChange(added.filter((x) => x.country !== a.country)); }} accessibilityRole="button" accessibilityLabel={t("Remove {c}", { c: t(a.country) })}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Icon name="xmark" size={16} color={c.secondaryLabel} weight="semibold" /></PressScale>
        </View>
      ))}
      {!nc ? (
        <View style={{ gap: S.xs }}>
          <Text variant="footnote" tone="secondary" weight="600">{t("Add a country")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }}>
            {addable.map((n) => (
              <PressScale key={n} onPress={() => { select(); setNc(n); setErr(""); }} accessibilityRole="button" accessibilityLabel={t("Add {c}", { c: t(n) })}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: S.xs, minHeight: 44, paddingHorizontal: S.sm, borderRadius: R.round, backgroundColor: c.card, opacity: pressed ? 0.7 : 1 })}>
                <Flag country={n} size={22} /><Text variant="subhead" weight="500">{t(n)}</Text>
              </PressScale>
            ))}
          </View>
        </View>
      ) : (
        <View style={[{ gap: S.sm, padding: S.md, borderRadius: R.card, backgroundColor: c.fill2 }, curve]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
            <Flag country={nc} size={28} /><Text variant="headline" style={{ flex: 1 }}>{t(nc)}</Text>
            <PressScale onPress={() => { setNc(""); setNa(""); setNd(""); setErr(""); }} accessibilityRole="button" accessibilityLabel={t("Cancel")} style={{ minHeight: 44, justifyContent: "center" }}><Text variant="subhead" tone="tint" weight="600">{t("Cancel")}</Text></PressScale>
          </View>
          <Text variant="footnote" tone="secondary" weight="600">{t("Arrival Date")}</Text>
          <DateAnswer label={t("Arrival Date")} value={na} style="calendar" placeholder="Select arrival date" min={f.travelStartDate || todayIso} max={f.travelEndDate || undefined}
            onChange={(v) => { setNa(v); setErr(""); if (nd && v && nd <= v) { setNd(""); setErr(t("Departure date must be after arrival date")); } }} />
          {!!na && <>
            <Text variant="footnote" tone="secondary" weight="600">{t("Departure Date")}</Text>
            <DateAnswer label={t("Departure Date")} value={nd} style="calendar" placeholder="Select departure date" min={dayAfter(na)} max={f.travelEndDate || undefined}
              onChange={(v) => { if (na && v <= na) { setErr(t("Departure date must be after arrival date")); return; } setErr(""); setNd(v); }} />
          </>}
          {!!err && <Note tone="red" icon="exclamationmark.circle.fill"><Text variant="subhead" tone="red">{err}</Text></Note>}
          <Button title={t("Add Country")} icon="plus" variant="secondary" disabled={!nc || !na || !nd || !!err} onPress={add} />
        </View>
      )}
    </View>
  );
}
