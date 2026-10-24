// "At a glance": only facts that hold for every Schengen country, the visa centre from the website's mapping (hidden
// when the country is not mapped) and what EZvisa does (prepares the file in 1–2 days). Nothing else is claimed.
import { View } from "react-native";
import type { CountryInfo } from "../../lib/countryInfo";
import { useT } from "../../lib/i18n";
import { Group, GroupHeader, InfoRow } from "./Row";

export function GlanceList({ info, onCentre }: { info: CountryInfo; onCentre: () => void }) {
  const { t } = useT();
  return (
    <View testID="country-glance">
      <GroupHeader title={t("At a glance")} />
      <Group>
        <InfoRow stacked icon="calendar" title={t("Stay")} value={t("Up to 90 days in any 180 days")} testID="glance-stay" />
        <InfoRow stacked icon="clock" title={t("When to apply")} value={t("Between 6 months and 15 days before you travel")} testID="glance-when" />
        {info.provider && <InfoRow stacked icon="building.2.fill" title={t("Visa centre")} value={t("{p}, Dubai and Abu Dhabi", { p: info.provider.provider })}
          onPress={onCentre} a11yHint={t("Shows the addresses")} testID="glance-centre" />}
        <InfoRow stacked icon="checkmark.seal.fill" title="EZvisa" value={t("We prepare your file in 1–2 days. Embassy fees are paid at your appointment.")} testID="glance-ezvisa" />
      </Group>
    </View>
  );
}
