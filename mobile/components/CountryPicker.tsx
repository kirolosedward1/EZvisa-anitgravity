import { PressScale } from "./ui";
// Searchable country list (ISO 3166, circle flags) in a sheet. Used for the phone calling code.
import { useMemo, useState } from "react";
import { FlatList, Modal, Platform, Pressable, View, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flag, Icon, Text } from "./ui";
import { Field } from "./AuthForm";
import { CircleButton } from "./flow";
import { useColors, S, R, T, curve } from "../lib/theme";
import { WORLD } from "../lib/world";
import { PHONE_COUNTRIES, nationalDigits, formatNational, placeholderFor, toE164 } from "../lib/phone";
import { select } from "../lib/haptics";
import { useT } from "../lib/i18n";

export function CountrySheet({ visible, title, onClose, onPick, selected, selectedName, showDial, names, searchPlaceholder = "Search country or code" }: { visible: boolean; title: string; onClose: () => void; onPick: (iso2: string, name: string) => void; selected?: string; selectedName?: string; showDial?: boolean; names?: string[]; searchPlaceholder?: string }) {
  const c = useColors(); const insets = useSafeAreaInsets(); const [q, setQ] = useState(""); const { t: tr } = useT();
  const list = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^\+/, "");
    const base = names ? names.map((n) => WORLD.find((w) => w.name === n) ?? { name: n, iso2: n, dial: 0 }) : showDial ? PHONE_COUNTRIES : WORLD;
    // Matches the name (English or Arabic), the ISO code (AE / ARE-style prefixes) or the calling code.
    return t ? base.filter((w) => w.name.toLowerCase().includes(t) || tr(w.name).includes(q.trim()) || String(w.dial).startsWith(t) || w.iso2.toLowerCase().startsWith(t)) : base;
  }, [q, showDial, names, tr]);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined} onRequestClose={onClose} transparent={false}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: Platform.OS === "ios" ? S.md : insets.top + S.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, minHeight: 44 }}>
          <Text variant="headline" accessibilityRole="header">{title}</Text>
          <CircleButton icon="xmark" label="Close" onPress={onClose} />
        </View>
        <View style={{ paddingHorizontal: S.lg, paddingVertical: S.sm }}>
          <Field placeholder={searchPlaceholder} value={q} onChangeText={setQ} autoCorrect={false} autoFocus={Platform.OS !== "web"} returnKeyType="search" trailing={<Icon name="magnifyingglass" size={16} color={c.secondaryLabel} />} />
        </View>
        <FlatList data={list} keyExtractor={(w) => w.iso2} keyboardShouldPersistTaps="handled" initialNumToRender={20} maxToRenderPerBatch={12} windowSize={7} removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: insets.bottom + S.lg }}
          ListEmptyComponent={<Text variant="subhead" tone="secondary" center style={{ marginTop: S.xl }}>{tr("No country found.")}</Text>}
          renderItem={({ item: w }) => {
            const on = selectedName ? w.name === selectedName : w.iso2 === selected;
            return (
              <PressScale onPress={() => { select(); onPick(w.iso2, w.name); setQ(""); }} accessibilityRole="button" accessibilityState={{ selected: on }} aria-selected={on} accessibilityLabel={showDial ? `${w.name}, plus ${w.dial}` : w.name}
                style={({ pressed }) => [{ minHeight: 52, flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.xs, opacity: pressed ? 0.6 : 1 }]}>
                <Flag country={w.name} size={28} />
                <Text variant="body" style={{ flex: 1 }}>{tr(w.name)}</Text>
                {showDial && <Text variant="body" tone="secondary" tabular>+{w.dial}</Text>}
                {on && <Icon name="checkmark" size={15} color={c.tint} weight="bold" />}
              </PressScale>
            );
          }} />
      </View>
    </Modal>
  );
}

/** Phone input: compact calling-code picker (UAE default; UAE, GCC, then A to Z) and a number formatted as you type.
 *  A leading 0 after the code is dropped. onChange gets the formatted national part and the E.164 value (or "" when invalid). */
export function PhoneField({ country, local, onChange, error, autoFocus }: { country: string; local: string; onChange: (iso2: string, local: string, full: string) => void; error?: boolean; autoFocus?: boolean }) {
  const c = useColors(); const [open, setOpen] = useState(false); const { t } = useT();
  const w = WORLD.find((x) => x.iso2 === country) ?? WORLD.find((x) => x.iso2 === "AE")!;
  const emit = (iso: string, raw: string) => { const d = nationalDigits(iso, raw); onChange(iso, formatNational(iso, d), toE164(iso, d) ?? ""); };
  return (
    <View style={{ flexDirection: "row", alignItems: "stretch", backgroundColor: c.card, borderRadius: R.input, minHeight: 56, overflow: "hidden", borderWidth: 1, borderColor: error ? c.red : c.separator, direction: "ltr" } as any}>
      <PressScale onPress={() => { select(); setOpen(true); }} accessibilityRole="button" accessibilityLabel={`${t("Country code")} ${t(w.name)}, +${w.dial}`} testID="phone-country"
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: S.xs, paddingHorizontal: S.md, minWidth: 44, opacity: pressed ? 0.6 : 1, borderRightWidth: 1, borderRightColor: c.separator })}>
        <Flag country={w.name} size={22} />
        <Text variant="body" tabular>+{w.dial}</Text>
        <Icon name="chevron.down" size={11} color={c.secondaryLabel} weight="semibold" />
      </PressScale>
      <TextInput value={local} onChangeText={(v) => emit(w.iso2, v)} autoFocus={autoFocus} testID="phone-input"
        placeholder={placeholderFor(w.iso2)} placeholderTextColor={c.secondaryLabel} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" accessibilityLabel={t("Phone number")}
        style={[T.body, { flex: 1, color: c.label, paddingHorizontal: S.md, minHeight: 56, textAlign: "left" }, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]} />
      <CountrySheet visible={open} title={t("Country code")} showDial selected={w.iso2} onClose={() => setOpen(false)} onPick={(iso) => { setOpen(false); emit(iso, local); }} />
    </View>
  );
}
