// Form controls that mirror the website wizard (components/apply/*): uppercase labels, 56pt inputs,
// selects (native pickers), searchable country comboboxes, date inputs, Yes/No toggle buttons, checkbox, info notes.
import { useState } from "react";
import { ActionSheetIOS, Modal, Platform, Pressable, TextInput, View, type TextInputProps } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flag, Icon, Text, type IconName } from "../ui";
import { CountrySheet } from "../CountryPicker";
import { useColors, useIsDark, S, R, T, ICON } from "../../lib/theme";
import { select } from "../../lib/haptics";
import { useT } from "../../lib/i18n";

const H = 56;
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => (s ? new Date(s + "T12:00:00") : undefined);
export const fmtShort = (s: string) => (s ? parse(s)!.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
const ord = (n: number) => (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th");
/** date-fns "PPP", as the web's date picker shows it: "November 18th, 2026". */
export const fmtLong = (s: string) => { if (!s) return ""; const d = parse(s)!; return `${d.toLocaleDateString("en-US", { month: "long" })} ${d.getDate()}${ord(d.getDate())}, ${d.getFullYear()}`; };

/** Uppercase field label, like the web's labelStyles. */
export function Label({ children, nativeID }: { children: string; nativeID?: string }) {
  return <Text variant="caption" tone="secondary" weight="600" nativeID={nativeID} style={{ textTransform: "uppercase", letterSpacing: 0.8, marginBottom: S.xs }}>{children}</Text>;
}
/** Small red message under a field. */
export function FieldError({ text }: { text?: string }) {
  if (!text) return null;
  return <Text variant="footnote" tone="red" style={{ marginTop: S.xxs }} accessibilityLiveRegion="polite">{text}</Text>;
}
const boxStyle = (c: ReturnType<typeof useColors>, error?: boolean) => ({
  minHeight: H, borderRadius: R.input, borderWidth: 1, borderColor: error ? c.red : c.separator, backgroundColor: c.card, paddingHorizontal: S.md,
});

/** Labelled block: label, control, optional message. */
export function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <View><Label>{label}</Label>{children}<FieldError text={error} /></View>;
}

export function Input({ error, style, ...p }: TextInputProps & { error?: boolean }) {
  const c = useColors();
  return (
    <TextInput placeholderTextColor={c.secondaryLabel} {...p}
      style={[T.body, boxStyle(c, error), { color: c.label, paddingVertical: S.sm }, Platform.OS === "web" && ({ outlineStyle: "none" } as any), style]} />
  );
}
export function TextArea({ error, rows = 3, ...p }: TextInputProps & { error?: boolean; rows?: number }) {
  return <Input multiline textAlignVertical="top" error={error} style={{ minHeight: Math.max(H, rows * 26 + 24), paddingTop: S.sm }} {...p} />;
}

type Opt = { value: string; label: string };
/** <select>: iOS action sheet, Android dialog spinner, web <select>. The visible box always matches the web input. */
export function SelectField({ label, value, options, placeholder, onChange, error, disabled }: { label: string; value: string; options: Opt[]; placeholder: string; onChange: (v: string) => void; error?: boolean; disabled?: boolean }) {
  const c = useColors();
  const cur = options.find((o) => o.value === value);
  const box = (
    <View style={[boxStyle(c, error), { flexDirection: "row", alignItems: "center", gap: S.xs, opacity: disabled ? 0.5 : 1 }]}>
      <Text variant="body" style={{ flex: 1, paddingVertical: S.sm }} color={cur ? c.label : c.secondaryLabel}>{cur?.label ?? placeholder}</Text>
      <Icon name="chevron.down" size={13} color={c.secondaryLabel} weight="semibold" />
    </View>
  );
  if (Platform.OS === "ios") {
    const open = () => {
      select();
      ActionSheetIOS.showActionSheetWithOptions({ title: label, options: [...options.map((o) => o.label), "Cancel"], cancelButtonIndex: options.length, tintColor: c.tint },
        (i) => { if (i < options.length) onChange(options[i].value); });
    };
    return <Pressable disabled={disabled} onPress={open} accessibilityRole="button" accessibilityLabel={`${label}, ${cur?.label ?? "not selected"}`} accessibilityHint="Opens a list">{box}</Pressable>;
  }
  // Android/web: a transparent native picker on top of the styled box receives the tap.
  return (
    <View>
      {box}
      <Picker selectedValue={value} enabled={!disabled} onValueChange={(v) => { if (v !== "") onChange(String(v)); }} accessibilityLabel={label} prompt={label}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0, width: "100%", height: "100%" } as any}>
        <Picker.Item label={placeholder} value="" enabled={false} />
        {options.map((o) => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
      </Picker>
    </View>
  );
}

/** Searchable country combobox (web Popover + Command): flag, name, ⌃⌄; opens a sheet with search. */
export function CountryField({ label, value, names, placeholder, searchPlaceholder, onChange, error }: { label: string; value: string; names?: string[]; placeholder: string; searchPlaceholder: string; onChange: (name: string) => void; error?: boolean }) {
  const c = useColors(); const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => { select(); setOpen(true); }} accessibilityRole="combobox" accessibilityLabel={`${label}, ${value || "not selected"}`} accessibilityHint="Opens a searchable list"
        style={({ pressed }) => [boxStyle(c, error), { flexDirection: "row", alignItems: "center", gap: S.xs, opacity: pressed ? 0.7 : 1 }]}>
        {!!value && <Flag country={value} size={22} />}
        <Text variant="body" weight={value ? "500" : "400"} style={{ flex: 1, paddingVertical: S.sm }} color={value ? c.label : c.secondaryLabel}>{value || placeholder}</Text>
        <Icon name="chevron.up.chevron.down" size={13} color={c.secondaryLabel} />
      </Pressable>
      <CountrySheet visible={open} title={label.replace(/ \*$/, "")} names={names} searchPlaceholder={searchPlaceholder} selectedName={value}
        onClose={() => setOpen(false)} onPick={(_, name) => { setOpen(false); onChange(name); }} />
    </>
  );
}

/** Date input: iOS sheet with the inline calendar, Android dialog, web <input type=date>. */
export function DateField({ label, value, onChange, min, max, placeholder = "Select date", error, disabled }: { label: string; value: string; onChange: (v: string) => void; min?: string; max?: string; placeholder?: string; error?: boolean; disabled?: boolean }) {
  const c = useColors(); const dark = useIsDark(); const insets = useSafeAreaInsets(); const { t } = useT();
  const [open, setOpen] = useState(false);
  const minD = min ? parse(min) : undefined, maxD = max ? parse(max) : undefined;
  const now = new Date();
  const initial = parse(value) ?? (maxD && maxD < now ? maxD : minD && minD > now ? minD : now);
  const [draft, setDraft] = useState(initial);
  const box = (
    <View style={[boxStyle(c, error), { flexDirection: "row", alignItems: "center", gap: S.xs, opacity: disabled ? 0.5 : 1 }]}>
      <Text variant="body" style={{ flex: 1, paddingVertical: S.sm }} color={value ? c.label : c.secondaryLabel}>{value ? fmtLong(value) : placeholder}</Text>
      <Icon name="calendar" size={16} color={c.secondaryLabel} />
    </View>
  );
  if (Platform.OS === "web") return (
    <View>
      {box}
      {/* @ts-ignore react-native-web renders a DOM input */}
      <input type="date" value={value} min={min} max={max} disabled={disabled} onChange={(e: any) => e.target.value && onChange(e.target.value)} aria-label={label}
        style={{ position: "absolute", inset: 0, opacity: 0, border: "none", background: "transparent", width: "100%", height: "100%", cursor: "pointer", colorScheme: dark ? "dark" : "light" }} />
    </View>
  );
  return (
    <>
      <Pressable disabled={disabled} onPress={() => { select(); setDraft(initial); setOpen(true); }} accessibilityRole="button" accessibilityLabel={`${label}, ${value ? fmtLong(value) : "not set"}`} accessibilityHint="Opens a date picker">{box}</Pressable>
      {Platform.OS === "android" && open && <DateTimePicker value={initial} mode="date" minimumDate={minD} maximumDate={maxD} onChange={(e, d) => { setOpen(false); if (e.type === "set" && d) onChange(iso(d)); }} />}
      {Platform.OS === "ios" && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={() => setOpen(false)} accessibilityLabel={t("Close date picker")} accessibilityRole="button" />
          <View style={{ backgroundColor: c.bg, borderTopStartRadius: R.sheet, borderTopEndRadius: R.sheet, paddingBottom: insets.bottom + S.sm, paddingHorizontal: S.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 52 }}>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}><Text variant="body" tone="secondary">Cancel</Text></Pressable>
              <Text variant="headline" accessibilityRole="header">{label.replace(/ \*$/, "")}</Text>
              <Pressable onPress={() => { setOpen(false); onChange(iso(draft)); }} accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "flex-end" }}><Text variant="body" tone="tint" weight="600">Done</Text></Pressable>
            </View>
            <DateTimePicker value={draft} mode="date" display="inline" minimumDate={minD} maximumDate={maxD} accentColor={c.tint} themeVariant={dark ? "dark" : "light"} onChange={(_, d) => d && setDraft(d)} />
          </View>
        </Modal>
      )}
    </>
  );
}

/** The web's Yes / No toggle buttons (h-12, active = brand fill). */
export function YesNoToggle({ label, value, onChange, error }: { label: string; value: string; onChange: (v: "yes" | "no") => void; error?: boolean }) {
  const c = useColors();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", gap: S.sm }}>
      {(["yes", "no"] as const).map((v) => {
        const on = value === v;
        return (
          <Pressable key={v} onPress={() => { select(); onChange(v); }} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={v === "yes" ? "Yes" : "No"}
            style={({ pressed }) => ({ flex: 1, minHeight: 48, borderRadius: R.input, alignItems: "center", justifyContent: "center", borderWidth: 1,
              borderColor: on ? c.tintFill : error ? c.red : c.separator, backgroundColor: on ? c.tintFill : c.card, opacity: pressed ? 0.75 : 1 })}>
            <Text variant="subhead" weight={on ? "600" : "500"} color={on ? c.onTint : c.secondaryLabel}>{v === "yes" ? "Yes" : "No"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Checkbox({ label, value, onChange, icon, iconColor }: { label: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName; iconColor?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={() => { select(); onChange(!value); }} accessibilityRole="checkbox" accessibilityState={{ checked: value }} aria-checked={value} accessibilityLabel={label}
      style={{ flexDirection: "row", alignItems: "center", gap: S.xs, minHeight: 44 }}>
      <View style={{ width: 20, height: 20, borderRadius: R.xs, borderWidth: 1.5, borderColor: value ? c.whatsapp : c.tertiaryLabel, backgroundColor: value ? c.whatsapp : "transparent", alignItems: "center", justifyContent: "center" }}>
        {value && <Icon name="checkmark" size={S.sm} color={c.onAccent} weight="bold" />}
      </View>
      {!!icon && <Icon name={icon} size={ICON.sm + 1} color={iconColor ?? (icon === "logo.whatsapp" ? c.whatsapp : c.secondaryLabel)} />}
      <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>{label}</Text>
    </Pressable>
  );
}

/** Tinted info box (web: emerald / amber / blue / red notes). */
export function Note({ tone, children, icon = "info.circle" }: { tone: "green" | "amber" | "blue" | "red"; children: React.ReactNode; icon?: IconName }) {
  const c = useColors();
  const col = tone === "green" ? c.green : tone === "amber" ? c.orange : tone === "red" ? c.red : c.tint;
  const bg = { green: c.successSoft, amber: c.warningSoft, blue: c.accentSoft, red: c.dangerSoft }[tone];
  return (
    <View style={{ flexDirection: "row", gap: S.xs, padding: S.sm, borderRadius: R.input, borderWidth: 1, borderColor: col + "40", backgroundColor: bg, alignItems: "flex-start" }}>
      <Icon name={icon} size={17} color={col} style={{ marginTop: S.none }} />
      <View style={{ flex: 1 }}>{typeof children === "string" ? <Text variant="subhead" tone="secondary">{children}</Text> : children}</View>
    </View>
  );
}

/** Grouped box (web: p-6 bg-muted/20 rounded-2xl border). */
export function Group({ children, tone }: { children: React.ReactNode; tone?: "red" }) {
  const c = useColors();
  return <View style={{ gap: S.lg, padding: S.md, borderRadius: R.tile, borderWidth: 1, borderColor: tone === "red" ? c.red + "40" : c.separator, backgroundColor: tone === "red" ? c.red + "0D" : c.fill2 }}>{children}</View>;
}
export function Divider() { const c = useColors(); return <View style={{ height: 1, backgroundColor: c.separator, marginVertical: S.xs }} />; }
