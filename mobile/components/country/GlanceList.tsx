// "At a glance": only facts that hold for every Schengen country and the visa centre from the website's mapping
// (hidden when the country is not mapped). Nothing else is claimed.
import { View } from "react-native";
import type { CountryInfo } from "../../lib/countryInfo";
import { useT } from "../../lib/i18n";
import { PressScale, Text } from "../ui";
import { GlobiPose } from "../globi/GlobiPose";
import { useColors, useLargeText, S, R, curve } from "../../lib/theme";
import { VISA_FEE_EUR } from "../../config/pricing";

/** Canvas Country.dc.html: three fact tiles (stay, embassy fee, decision), then Globi's tip about the visa centre.
 *  Facts are the Schengen rules every country shares; the fee is the standard adult fee kept in config/pricing.ts. */
export function GlanceList({ info, onCentre }: { info: CountryInfo; onCentre: () => void }) {
  const c = useColors(); const { t } = useT(); const big = useLargeText();
  const tiles: [string, string][] = [[t("Stay"), t("90 days")], [t("Embassy fee"), `€${VISA_FEE_EUR}`], [t("Decision"), t("~15 days")]];
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
          {info.provider ? t("Appointments at {p} in Dubai or Abu Dhabi. Apply between 6 months and 15 days before you travel.", { p: info.provider.provider }) : t("Apply between 6 months and 15 days before you travel.")}
        </Text>
      </PressScale>
    </View>
  );
}
