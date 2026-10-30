// "At a glance": only facts that hold for every Schengen country and the visa centre from the website's mapping
// (hidden when the country is not mapped). Nothing else is claimed.
import { View } from "react-native";
import type { CountryInfo } from "../../lib/countryInfo";
import { useT } from "../../lib/i18n";
import { PressScale, Text } from "../ui";
import { GlobiPose } from "../globi/GlobiPose";
import { useColors, useLargeText, S, R, curve } from "../../lib/theme";

/** Canvas Country.dc.html: two fact tiles (stay 90/180, when to apply), then Globi's tip about the visa centre.
 *  Facts are the Schengen rules every country shares, worded as the owner set them. */
export function GlanceList({ info, onCentre }: { info: CountryInfo; onCentre: () => void }) {
  const c = useColors(); const { t } = useT(); const big = useLargeText();
  // Owner's short copy: two tiles, stay and when to apply (no fee tile).
  const tiles: [string, string][] = [[t("Stay"), "90/180"], [t("When to apply"), t("1–5 months before")]];
  return (
    <View testID="country-glance" style={{ gap: S.md, paddingHorizontal: S.gutter }}>
      <View style={{ flexDirection: big ? "column" : "row", gap: S.xs }}>
        {tiles.map(([k, v]) => (
          <View key={k} style={[{ flex: big ? undefined : 1, borderRadius: 14, padding: S.sm, backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border, gap: 2 }, curve]} accessible accessibilityLabel={`${k}, ${v}`}>
            <Text variant="caption" weight="600" tone="secondary" style={{ textTransform: "uppercase", letterSpacing: 0.3 }}>{k}</Text>
            <Text variant="title3" tabular>{v}</Text>
          </View>
        ))}
      </View>
      <PressScale onPress={info.provider ? onCentre : undefined} disabled={!info.provider} accessibilityRole={info.provider ? "button" : "text"} scaleTo={0.99} testID="glance-centre"
        style={[{ flexDirection: "row", alignItems: "center", gap: S.sm, padding: S.sm, borderRadius: R.card, backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border }, curve]}>
        <GlobiPose pose="destination" size={47} style={{ margin: -4 }} />
        <Text variant="callout" style={{ flex: 1 }}>
          {info.provider ? t("Appointments at {p} in Dubai or Abu Dhabi. Apply 1 to 5 months before you travel.", { p: info.provider.provider }) : t("Apply 1 to 5 months before you travel.")}
        </Text>
      </PressScale>
    </View>
  );
}
