import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useColors, useIsDark, T, S } from "../lib/theme";
import { IconTile, IconName, Text } from "./ui";
import { select } from "../lib/haptics";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => (s ? new Date(s + "T12:00:00") : undefined);
const fmt = (s: string) => (s ? parse(s)!.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

/** Grouped-list date row: native compact picker on iOS, dialog on Android, <input type=date> on web. */
export function DateRow({ label, value, onChange, min, max, icon, error }: { label: string; value: string; onChange: (v: string) => void; min?: Date; max?: Date; icon?: IconName; error?: string }) {
  const c = useColors(); const dark = useIsDark();
  const [open, setOpen] = useState(false);
  const current = parse(value) ?? min ?? new Date();
  const lead = icon ? <IconTile name={icon} color={c.tint} /> : null;
  const title = (
    <View style={{ flex: 1 }}>
      <Text variant="body" color={error ? c.red : undefined}>{label}</Text>
      {!!error && <Text variant="footnote" tone="red">{error}</Text>}
    </View>
  );
  const row = { minHeight: 52, paddingHorizontal: S.md, flexDirection: "row" as const, alignItems: "center" as const, gap: S.sm };
  if (Platform.OS === "web") return (
    <View style={row}>
      {lead}{title}
      {/* @ts-ignore react-native-web renders a DOM input */}
      <input type="date" value={value} min={min ? iso(min) : undefined} max={max ? iso(max) : undefined} onChange={(e: any) => onChange(e.target.value)} aria-label={label}
        style={{ border: "none", background: c.fill, color: c.label, borderRadius: 8, padding: "6px 10px", fontSize: 15, fontFamily: "inherit", colorScheme: dark ? "dark" : "light" }} />
    </View>
  );
  return (
    <View>
      <Pressable onPress={() => { select(); setOpen(!open); }} accessibilityRole="button" accessibilityLabel={`${label}, ${value ? fmt(value) : "not set"}`} style={row}>
        {lead}{title}
        {Platform.OS === "ios" ? (
          <DateTimePicker value={current} mode="date" display="compact" minimumDate={min} maximumDate={max} accentColor={c.tint} themeVariant={dark ? "dark" : "light"} onChange={(_, d) => d && onChange(iso(d))} />
        ) : (
          <Text variant="body" color={value ? c.tint : c.tertiaryLabel} style={T.body}>{value ? fmt(value) : "Select"}</Text>
        )}
      </Pressable>
      {Platform.OS === "android" && open && (
        <DateTimePicker value={current} mode="date" minimumDate={min} maximumDate={max} onChange={(e, d) => { setOpen(false); if (e.type === "set" && d) onChange(iso(d)); }} />
      )}
    </View>
  );
}
