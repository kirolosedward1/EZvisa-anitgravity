import { PressScale } from "../ui";
// Answer controls for the one-question-per-screen wizard: big tappable choices, Yes / No tiles, an inline searchable
// country list, native date pickers (iOS inline calendar / wheel, Android dialog, web date input) and the website's
// "additional countries" editor. All controls are VoiceOver-labelled and grow with Dynamic Type (no fixed heights).
import { useEffect, useMemo, useState } from "react";
import { FlatList, Platform, Pressable, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Flag, Icon, Text, Button, SearchField } from "../ui";
import { useColors, useIsDark, S, R, curve, ICON } from "../../lib/theme";
import { select } from "../../lib/haptics";
import { useT } from "../../lib/i18n";
import { SCHENGEN, iso, type WizardForm } from "../../lib/wizard";
import type { Opt } from "../../lib/questions";
import { Note, formatListDate } from "./fields";

const parse = (s: string) => (s ? new Date(s + "T12:00:00") : undefined);
/** Saved-traveller rows and the sheet's date fields share this. */
export const useFmtDate = () => {
  const { lang } = useT();
  return (s: string) => formatListDate(s, lang);
};

/** One answer row: white with a hairline; selected = thin blue outline, soft blue tint and a blue check. */
export function AnswerRow({ label, selected, onPress, country, testID }: { label: string; selected?: boolean; onPress: () => void; country?: string; testID?: string }) {
  const c = useColors();
  return (
    <PressScale onPress={() => { select(); onPress(); }} accessibilityRole="radio" accessibilityState={{ checked: !!selected }} aria-checked={!!selected} accessibilityLabel={label} testID={testID}
      style={({ pressed }) => [{ minHeight: 52, borderRadius: R.lg, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", alignItems: "center", gap: S.sm,
        backgroundColor: selected ? c.accentSoft : c.surface, borderWidth: selected ? 1.5 : 1, borderColor: selected ? c.accent : c.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }, curve]}>
      {!!country && <Flag country={country} size={28} />}
      <Text variant="body" weight={selected ? "600" : "500"} color={c.label} style={{ flex: 1 }}>{label}</Text>
      <View style={{ width: 22, height: 22, borderRadius: R.round, borderWidth: selected ? 0 : 1.5, borderColor: c.border, backgroundColor: selected ? c.accent : "transparent", alignItems: "center", justifyContent: "center" }}>
        {selected && <Icon name="checkmark" size={ICON.xs + 1} color={c.onAccent} weight="bold" />}
      </View>
    </PressScale>
  );
}

export function ChoiceList({ label, options, value, onPick, flag }: { label: string; options: Opt[]; value: string; onPick: (v: string) => void; flag?: string }) {
  const { t } = useT();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: S.xs }}>
      {options.map((o) => <AnswerRow key={o.value} label={t(o.label)} selected={value === o.value} country={flag} onPress={() => onPick(o.value)} />)}
    </View>
  );
}

/** Yes / No as two answer rows (same look as every other choice). */
export function YesNoTiles({ label, value, onPick }: { label: string; value: string; onPick: (v: "yes" | "no") => void }) {
  const { t } = useT();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: S.xs }}>
      {(["yes", "no"] as const).map((v) => <AnswerRow key={v} label={v === "yes" ? t("Yes") : t("No")} selected={value === v} onPress={() => onPick(v)} />)}
    </View>
  );
}

/** Inline searchable country list (flags). Fills the remaining screen; picking auto-advances. */
/** `searchAll`: a wider list that typing also searches (nationality: the full visa-required list behind "Other nationality"). */
export function CountryList({ names, value, onPick, searchPlaceholder, header, searchAll }: { names: string[]; value: string; onPick: (n: string) => void; searchPlaceholder: string; header: React.ReactElement; searchAll?: string[] }) {
  const { t } = useT(); const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const known = value && (names.includes(value) || searchAll?.includes(value));
    const base = known ? [value, ...names.filter((n) => n !== value)] : names;
    if (!s) return base;
    const pool = searchAll ? [...base.filter((n) => !searchAll.includes(n) ? false : true), ...searchAll.filter((n) => !base.includes(n))] : base;
    return pool.filter((n) => n.toLowerCase().includes(s) || t(n).toLowerCase().includes(s));
  }, [q, names, value, t, searchAll]);
  return (
    <FlatList data={list} keyExtractor={(n) => n} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" initialNumToRender={14} maxToRenderPerBatch={12} windowSize={7} removeClippedSubviews={Platform.OS === "android"}
      contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.xl, gap: S.xs }}
      ListHeaderComponent={<View style={{ gap: S.md, marginBottom: S.xs }}>
        {header}
        {(names.length > 1 || !!searchAll) && <SearchField value={q} onChangeText={setQ} placeholder={t(searchPlaceholder)} />}
      </View>}
      ListEmptyComponent={<Text variant="subhead" tone="secondary" center style={{ marginTop: S.xl }}>{t("No country found.")}</Text>}
      renderItem={({ item }) => <AnswerRow label={t(item)} country={item === "Other" || item === "Other nationality" ? undefined : item} selected={item === value} onPress={() => onPick(item)} />} />
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
          <Text variant="footnote" tone="secondary" weight="600">{t("Arrival date")}</Text>
          <DateAnswer label={t("Arrival date")} value={na} style="calendar" placeholder={t("Select arrival date")} min={f.travelStartDate || todayIso} max={f.travelEndDate || undefined}
            onChange={(v) => { setNa(v); setErr(""); if (nd && v && nd <= v) { setNd(""); setErr(t("Departure date must be after arrival date")); } }} />
          {!!na && <>
            <Text variant="footnote" tone="secondary" weight="600">{t("Departure date")}</Text>
            <DateAnswer label={t("Departure date")} value={nd} style="calendar" placeholder={t("Select departure date")} min={dayAfter(na)} max={f.travelEndDate || undefined}
              onChange={(v) => { if (na && v <= na) { setErr(t("Departure date must be after arrival date")); return; } setErr(""); setNd(v); }} />
          </>}
          {!!err && <Note tone="red" icon="exclamationmark.circle.fill"><Text variant="subhead" tone="red">{err}</Text></Note>}
          <Button title={t("Add country")} icon="plus" variant="secondary" disabled={!nc || !na || !nd || !!err} onPress={add} />
        </View>
      )}
    </View>
  );
}
