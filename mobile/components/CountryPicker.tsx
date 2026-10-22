import { PressScale } from "./ui";
// Searchable country list (ISO 3166, circle flags) in a bottom sheet (iOS page sheet: swipe down to close; Android:
// hardware back closes it). Used for the phone calling code and the wizard's long lists (destination). Search matches
// partial words, Arabic names and short names (lib/search.ts); names are shown in the app language.
import { useMemo, useState } from "react";
import { FlatList, Modal, Platform, Pressable, View, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flag, Icon, Text } from "./ui";
import { Field } from "./AuthForm";
import { CircleButton } from "./flow";
import { useColors, S, R, T, curve } from "../lib/theme";
import { WORLD } from "../lib/world";
import { select } from "../lib/haptics";
import { searchCountries } from "../lib/search";
import { useT } from "../lib/i18n";

export function CountrySheet({ visible, title, onClose, onPick, selected, selectedName, showDial, names, searchPlaceholder = "Search country or code" }: { visible: boolean; title: string; onClose: () => void; onPick: (iso2: string, name: string) => void; selected?: string; selectedName?: string; showDial?: boolean; names?: string[]; searchPlaceholder?: string }) {
  const c = useColors(); const insets = useSafeAreaInsets(); const [q, setQ] = useState(""); const { t } = useT();
  const list = useMemo(() => {
    const s = q.trim().replace(/^\+/, "");
    const base = names ? names.map((n) => WORLD.find((w) => w.name === n) ?? { name: n, iso2: n, dial: 0 }) : showDial ? WORLD.filter((w) => w.dial > 0) : WORLD;
    if (!s) return base;
    const byName = searchCountries(base.map((w) => w.name), s);
    const extra = showDial ? base.filter((w) => !byName.includes(w.name) && (String(w.dial).startsWith(s) || w.iso2.toLowerCase() === s.toLowerCase())) : [];
    return [...byName.map((n) => base.find((w) => w.name === n)!), ...extra];
  }, [q, showDial, names]);
  const close = () => { setQ(""); onClose(); };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined} onRequestClose={close} transparent={false}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: Platform.OS === "ios" ? S.md : insets.top + S.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, minHeight: 44 }}>
          <Text variant="headline" accessibilityRole="header">{title}</Text>
          <CircleButton icon="xmark" label={t("Close")} onPress={close} />
        </View>
        <View style={{ paddingHorizontal: S.lg, paddingVertical: S.sm }}>
          <Field placeholder={t(searchPlaceholder)} value={q} onChangeText={setQ} autoCorrect={false} autoFocus={Platform.OS !== "web"} returnKeyType="search" trailing={<Icon name="magnifyingglass" size={16} color={c.secondaryLabel} />} />
        </View>
        <FlatList data={list} keyExtractor={(w) => w.iso2} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets initialNumToRender={20} maxToRenderPerBatch={12} windowSize={7} removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: insets.bottom + S.lg }}
          ListEmptyComponent={<Text variant="subhead" tone="secondary" center style={{ marginTop: S.xl }}>{t("No country found.")}</Text>}
          renderItem={({ item: w }) => {
            const on = selectedName ? w.name === selectedName : w.iso2 === selected;
            return (
              <PressScale onPress={() => { select(); onPick(w.iso2, w.name); setQ(""); }} accessibilityRole="button" accessibilityState={{ selected: on }} aria-selected={on} accessibilityLabel={showDial ? `${t(w.name)}, plus ${w.dial}` : t(w.name)}
                style={({ pressed }) => [{ minHeight: 52, flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.xs, opacity: pressed ? 0.6 : 1 }]}>
                <Flag country={w.name} size={28} />
                <Text variant="body" style={{ flex: 1 }}>{t(w.name)}</Text>
                {showDial && <Text variant="body" tone="secondary" tabular>+{w.dial}</Text>}
                {on && <Icon name="checkmark" size={15} color={c.tint} weight="bold" />}
              </PressScale>
            );
          }} />
      </View>
    </Modal>
  );
}

/** Phone input with a calling-code button (defaults to +971). */
export function PhoneField({ country, local, onChange, error }: { country: string; local: string; onChange: (iso2: string, local: string, full: string) => void; error?: boolean }) {
  const c = useColors(); const [open, setOpen] = useState(false);
  const w = WORLD.find((x) => x.iso2 === country) ?? WORLD.find((x) => x.iso2 === "AE")!;
  const full = (iso: string, l: string) => { const d = WORLD.find((x) => x.iso2 === iso)?.dial ?? 971; return l.trim() ? `+${d} ${l.trim()}` : ""; };
  return (
    <View style={{ flexDirection: "row", alignItems: "stretch", backgroundColor: c.card, borderRadius: R.input, minHeight: 56, overflow: "hidden", borderWidth: 1, borderColor: error ? c.red : c.separator }}>
      <PressScale onPress={() => { select(); setOpen(true); }} accessibilityRole="button" accessibilityLabel={`Country code ${w.name}, plus ${w.dial}. Change`}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: S.xs, paddingHorizontal: S.md, minWidth: 44, opacity: pressed ? 0.6 : 1, borderRightWidth: 1, borderRightColor: c.separator })}>
        <Flag country={w.name} size={22} />
        <Text variant="body" tabular>+{w.dial}</Text>
        <Icon name="chevron.down" size={11} color={c.secondaryLabel} weight="semibold" />
      </PressScale>
      <TextInput value={local} onChangeText={(v) => { const l = v.replace(/[^\d\s-]/g, ""); onChange(w.iso2, l, full(w.iso2, l)); }}
        placeholder="50 123 4567" placeholderTextColor={c.secondaryLabel} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" accessibilityLabel="Phone number"
        style={[T.body, { flex: 1, color: c.label, paddingHorizontal: S.md, minHeight: 56 }, Platform.OS === "web" && ({ outlineStyle: "none" } as any), error && { color: c.label }]} />
      <CountrySheet visible={open} title="Country code" showDial selected={w.iso2} onClose={() => setOpen(false)} onPick={(iso) => { setOpen(false); onChange(iso, local, full(iso, local)); }} />
    </View>
  );
}
