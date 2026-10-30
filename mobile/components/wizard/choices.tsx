// Answer controls drawn from the app design canvas (Destination, Nationality, City, TripPurpose, Hotel, Funding,
// Employment, Marital, Passport, NOC): one list card of radio rows, two-column grid tiles, two tall Yes / No tiles, or
// chips. Display labels, sub-labels and icons come from the question's `view`; stored values stay the contract's.
import { useMemo, useState } from "react";
import { FlatList, Platform, StyleSheet, View } from "react-native";
import { Avatar, ChoiceTile, Flag, Icon, InfoNote, ListChoice, PressScale, SearchField, SectionHeader, Text, Tick } from "../ui";
import { useColors, useIsDark, useLargeText, S, R, curve } from "../../lib/theme";
import { select } from "../../lib/haptics";
import { useT } from "../../lib/i18n";
import { PRICE_AED, SPOUSE_MULTIPLIER, maskPassport, travellerName, type Traveller, type WizardForm } from "../../lib/wizard";
import type { Opt, Question } from "../../lib/questions";

const fill = (s: string, f: WizardForm, t: (k: string) => string) =>
  s.replace("{price2}", String(PRICE_AED * SPOUSE_MULTIPLIER)).replace("{price}", String(PRICE_AED)).replace("{country}", f.destination ? t(f.destination) : "");

/** Options of a choice question as the canvas draws them (q.view.layout). Tap = answer (the screen auto-advances). */
export function OptionAnswers({ q, f, options, value, onPick }: { q: Question; f: WizardForm; options: Opt[]; value: string; onPick: (v: string) => void }) {
  const { t } = useT(); const c = useColors(); const dark = useIsDark(); const big = useLargeText();
  const v = q.view ?? {}; const layout = v.layout ?? "list";
  const label = (o: Opt) => fill(t(v.labels?.[o.value] ?? o.label), f, t);
  const sub = (o: Opt) => (v.subs?.[o.value] ? fill(t(v.subs[o.value]), f, t) : undefined);
  // Canvas yes/no: two short centred buttons when there is no sub-line (FirstVisa), tiles with the text at the top
  // when there is one (Passport). Never a tall empty tile.
  if (layout === "tiles" && !options.some((o) => sub(o))) {
    return (
      <View accessibilityRole="radiogroup" accessibilityLabel={t(q.label)} style={{ flexDirection: big ? "column" : "row", gap: 10 }} testID="option-tiles">
        {options.map((o) => { const on = value === o.value; return (
          <PressScale key={o.value} onPress={() => { select(); onPick(o.value); }} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={label(o)} testID={`choice-${o.value}`}
            style={[{ flex: big ? undefined : 1, minHeight: 52, paddingHorizontal: S.md, paddingVertical: S.sm, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.accentSoft : dark ? c.surface : c.surfaceRaised, borderWidth: on ? 1.5 : 1, borderColor: on ? c.accent : c.border }, curve]}>
            <Text variant="callout" weight="600" center>{label(o)}</Text>
          </PressScale>
        ); })}
      </View>
    );
  }
  if (layout === "grid" || layout === "tiles") {
    const tall = layout === "tiles";
    return (
      <View accessibilityRole="radiogroup" accessibilityLabel={t(q.label)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }} testID="option-tiles">
        {options.map((o) => (
          <View key={o.value} style={{ width: big ? "100%" : tall && options.length === 2 ? "48.4%" : "48.4%" }}>
            <ChoiceTile variant={tall ? "yesno" : "grid"} label={label(o)} sub={sub(o)} selected={value === o.value} onPress={() => onPick(o.value)} testID={`choice-${o.value}`}
              leading={!tall && v.icons?.[o.value] ? <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.fillSubtle, alignItems: "center", justifyContent: "center" }}><Icon name={v.icons[o.value]} size={18} color={value === o.value ? c.accent : c.textSecondary} /></View> : undefined}
              minHeight={tall ? 96 : v.subs ? 104 : 84} />
          </View>
        ))}
      </View>
    );
  }
  if (layout === "chips") {
    return (
      <View accessibilityRole="radiogroup" accessibilityLabel={t(q.label)} style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }} testID="option-chips">
        {options.map((o) => { const on = value === o.value; return (
          <PressScale key={o.value} onPress={() => { select(); onPick(o.value); }} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={label(o)} testID={`choice-${o.value}`}
            style={[{ minHeight: 44, paddingHorizontal: S.md, borderRadius: R.round, justifyContent: "center", backgroundColor: on ? c.accentSoft : c.surfaceRaised, borderWidth: on ? 1.5 : 1, borderColor: on ? c.accent : c.border }, curve]}>
            <Text variant="callout" weight={on ? "600" : "500"} color={on ? c.accent : c.label}>{label(o)}</Text>
          </PressScale>
        ); })}
      </View>
    );
  }
  return <ListChoice label={t(q.label)} value={value} onPick={onPick} options={options.map((o) => ({ value: o.value, label: label(o), sub: sub(o), icon: v.icons?.[o.value] }))} />;
}

/** Yes / No as two tall tiles (canvas: 20/600 with a 13 pt sub-line). */
export function YesNoAnswer({ q, f, value, onPick }: { q: Question; f: WizardForm; value: string; onPick: (v: "yes" | "no") => void }) {
  return <OptionAnswers q={{ ...q, view: { layout: "tiles", ...q.view } }} f={f} value={value} onPick={(v) => onPick(v as "yes" | "no")} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />;
}

/** The six most common passports, then "Other nationality" for the full visa-required list (canvas Nationality). */
export const QUICK_NATIONALITIES: [string, string][] = [["India", "Indian"], ["Pakistan", "Pakistani"], ["Egypt", "Egyptian"], ["Jordan", "Jordanian"], ["Bangladesh", "Bangladeshi"], ["Philippines", "Filipino"]];
export function NationalityGrid({ value, onPick, onOther }: { value: string; onPick: (v: string) => void; onOther: () => void }) {
  const c = useColors(); const dark = useIsDark(); const { t } = useT(); const big = useLargeText();
  const quick = QUICK_NATIONALITIES.map(([n]) => n); const other = !!value && !quick.includes(value);
  return (
    <View style={{ gap: 10 }} testID="nationality-grid">
      <View accessibilityRole="radiogroup" accessibilityLabel={t("Nationality")} style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {QUICK_NATIONALITIES.map(([n, d]) => (
          <View key={n} style={{ width: big ? "100%" : "48.4%" }}>
            <ChoiceTile variant="grid" label={t(d)} selected={value === n} onPress={() => onPick(n)} leading={<Flag country={n} size={28} />} testID={`nationality-${n}`} />
          </View>
        ))}
      </View>
      <PressScale onPress={() => { select(); onOther(); }} accessibilityRole="button" accessibilityLabel={other ? `${t("Other nationality")}, ${t(value)}` : t("Other nationality")} testID="nationality-other"
        style={[{ minHeight: 56, borderRadius: R.tile, paddingHorizontal: S.md, flexDirection: "row", alignItems: "center", gap: S.sm, backgroundColor: other ? c.accentSoft : dark ? c.surface : c.surfaceRaised, borderWidth: other ? 1.5 : 1, borderColor: other ? c.accent : c.border }, curve]}>
        {other && <Flag country={value} size={28} />}
        <Text variant="row" style={{ flex: 1 }}>{other ? t(value) : t("Other nationality")}</Text>
        <Text variant="note" tone="secondary">{t("All visa-required countries")}</Text>
      </PressScale>
      <InfoNote text={t("GCC and EU passports don't need a Schengen visa, so they aren't on this list.")} />
    </View>
  );
}

/** One country row inside the grouped list card (first and last rows round the card's corners). */
function CountryRow({ name, selected, onPress, first, last }: { name: string; selected: boolean; onPress: () => void; first: boolean; last: boolean }) {
  const c = useColors(); const dark = useIsDark(); const { t } = useT();
  return (
    <View style={{ backgroundColor: dark ? c.surface : c.surfaceRaised, borderColor: c.border, borderLeftWidth: 1, borderRightWidth: 1, borderTopWidth: first ? 1 : 0, borderBottomWidth: last ? 1 : 0,
      borderTopLeftRadius: first ? R.card : 0, borderTopRightRadius: first ? R.card : 0, borderBottomLeftRadius: last ? R.card : 0, borderBottomRightRadius: last ? R.card : 0, overflow: "hidden" }}>
      <PressScale onPress={() => { select(); onPress(); }} scaleTo={0.99} accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected} accessibilityLabel={t(name)} testID={`country-${name}`}
        style={{ minHeight: 54, paddingHorizontal: S.md, flexDirection: "row", alignItems: "center", gap: S.sm, backgroundColor: selected ? c.accentSoft : "transparent" }}>
        <Flag country={name} size={32} />
        <Text variant="row" weight={selected ? "600" : undefined} style={{ flex: 1 }}>{t(name)}</Text>
        {selected ? <Tick /> : <Icon name="chevron.right" size={13} color={c.textTertiary} weight="semibold" style={{ transform: [{ scaleX: 1 }] }} />}
      </PressScale>
      {!last && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginStart: S.md + 32 + S.sm }} />}
    </View>
  );
}

type Item = { kind: "header"; key: string; title: string } | { kind: "row"; key: string; name: string; first: boolean; last: boolean };
/** Searchable country list (canvas Destination, OtherNationality): "Popular" then "All N countries", one card each. */
export function CountryAnswer({ names, value, onPick, searchPlaceholder, header, searchAll, popular, allTitle }: {
  names: string[]; value: string; onPick: (n: string) => void; searchPlaceholder: string; header: React.ReactElement; searchAll?: string[]; popular?: string[]; allTitle?: string;
}) {
  const { t } = useT(); const [q, setQ] = useState("");
  const items = useMemo((): Item[] => {
    const s = q.trim().toLowerCase();
    const rows = (key: string, list: string[]): Item[] => list.map((n, i) => ({ kind: "row", key: `${key}:${n}`, name: n, first: i === 0, last: i === list.length - 1 }));
    if (s) {
      const pool = [...new Set([...names, ...(searchAll ?? [])])];
      const hits = pool.filter((n) => n.toLowerCase().includes(s) || t(n).toLowerCase().includes(s));
      return hits.length ? [{ kind: "header", key: "h:m", title: t("Matches") }, ...rows("m", hits)] : [];
    }
    const pop = (popular ?? []).filter((n) => names.includes(n));
    const all = [...names].sort((x, y) => t(x).localeCompare(t(y)));
    return [
      ...(pop.length ? [{ kind: "header" as const, key: "h:p", title: t("Popular") }, ...rows("p", pop)] : []),
      { kind: "header", key: "h:a", title: allTitle ?? t("All countries") }, ...rows("a", all),
    ];
  }, [q, names, searchAll, popular, allTitle, t]);
  return (
    <FlatList data={items} keyExtractor={(i) => i.key} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" initialNumToRender={18} maxToRenderPerBatch={14} windowSize={7} removeClippedSubviews={Platform.OS === "android"}
      contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: S.xl }}
      ListHeaderComponent={<View style={{ gap: S.md, marginBottom: S.sm }}>{header}<SearchField value={q} onChangeText={setQ} placeholder={t(searchPlaceholder)} testID="country-search" /></View>}
      ListEmptyComponent={<Text variant="subhead" tone="secondary" center style={{ marginTop: S.xl }}>{t("No country found.")}</Text>}
      renderItem={({ item }) => item.kind === "header"
        ? <View style={{ marginTop: S.md }}><SectionHeader title={item.title} /></View>
        : <CountryRow name={item.name} selected={item.name === value} onPress={() => onPick(item.name)} first={item.first} last={item.last} />} />
  );
}

/** "Who is travelling?" (canvas Traveller): one tile per saved traveller (initials, name, nationality · passport · valid to),
 *  then "Someone else". Tap = answer. */
export function TravellerTiles({ travellers, value, onPick, someoneElse, someoneElseSub }: { travellers: Traveller[]; value?: string | null; onPick: (id: string) => void; someoneElse?: string; someoneElseSub?: string }) {
  const c = useColors(); const { t } = useT();
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel={t("Who is travelling?")} testID="traveller-rows">
      {travellers.map((x) => {
        const year = x.passportExpiry ? x.passportExpiry.slice(0, 4) : "";
        const sub = [x.nationality ? t(x.nationality) : "", x.passportNumber ? `${t("Passport")} ${maskPassport(x.passportNumber)}` : "", year ? t("valid to {y}", { y: year }) : ""].filter(Boolean).join(" · ");
        return <ChoiceTile key={x.id} label={travellerName(x)} sub={sub} selected={value === x.id} onPress={() => onPick(x.id)} leading={<Avatar name={travellerName(x)} size={40} />} testID={`traveller-${x.id}`} />;
      })}
      <ChoiceTile label={someoneElse ?? t("Someone else")} sub={someoneElseSub ?? t("I'll ask for nationality and name next.")} selected={value === "none"} onPress={() => onPick("none")} testID="traveller-none"
        leading={<View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={18} color={c.textSecondary} /></View>} />
    </View>
  );
}
