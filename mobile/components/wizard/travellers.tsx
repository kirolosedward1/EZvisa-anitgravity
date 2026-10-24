// Saved-traveller rows: the "Who is travelling?" question in the wizard and the spouse picker in Continue application.
// One row per saved traveller (flag, name, nationality · masked passport, You / Spouse chip) and a last "Someone else" row.
import { View } from "react-native";
import { Flag, Icon, PressScale, Text } from "../ui";
import { useColors, S, R, curve } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { select } from "../../lib/haptics";
import { maskPassport, travellerName, type Traveller } from "../../lib/wizard";

export function TravellerRow({ title, subtitle, country, chip, onPress, testID }: { title: string; subtitle?: string; country?: string; chip?: string; onPress: () => void; testID?: string }) {
  const c = useColors();
  return (
    <PressScale onPress={() => { select(); onPress(); }} accessibilityRole="button" accessibilityLabel={[title, subtitle, chip].filter(Boolean).join(", ")} testID={testID}
      style={({ pressed }) => [{ minHeight: 60, borderRadius: R.lg, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", alignItems: "center", gap: S.sm, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }, curve]}>
      {country ? <Flag country={country} size={28} /> : (
        <View style={{ width: 28, height: 28, borderRadius: R.round, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><Icon name="person.crop.circle" size={16} color={c.secondaryLabel} /></View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" weight="600" color={c.label}>{title}</Text>
        {!!subtitle && <Text variant="footnote" tone="secondary">{subtitle}</Text>}
      </View>
      {!!chip && <View style={{ paddingHorizontal: S.xs, paddingVertical: S.xxs, borderRadius: R.round, backgroundColor: c.accentSoft }}><Text variant="caption" weight="600" color={c.accent}>{chip}</Text></View>}
      <Icon name="chevron.right" size={13} color={c.tertiaryLabel} weight="semibold" />
    </PressScale>
  );
}

/** `onPick(id)` with a traveller id, or "none" for "Someone else". */
export function TravellerRows({ travellers, onPick, someoneElse, testID = "traveller" }: { travellers: Traveller[]; onPick: (id: string) => void; someoneElse?: string; testID?: string }) {
  const { t } = useT();
  const chip = (x: Traveller) => (x.relationship === "self" ? t("You") : x.relationship === "spouse" ? t("Spouse") : undefined);
  return (
    <View style={{ gap: S.xs }} testID={`${testID}-rows`}>
      {travellers.map((x) => (
        <TravellerRow key={x.id} title={travellerName(x)} subtitle={[x.nationality ? t(x.nationality) : "", maskPassport(x.passportNumber)].filter(Boolean).join(" · ")} country={x.nationality} chip={chip(x)} onPress={() => onPick(x.id)} testID={`${testID}-${x.id}`} />
      ))}
      <TravellerRow title={someoneElse ?? t("Someone else")} onPress={() => onPick("none")} testID={`${testID}-none`} />
    </View>
  );
}
