// Where the visa appointment happens: the provider and its Dubai / Abu Dhabi addresses (lib/visaCentres.ts, copied
// from the website), each with Apple Maps. No timing tips: they change and the app can't keep them current.
import { Linking, View } from "react-native";
import type { VisaCentre as Centre } from "../../lib/visaCentres";
import { mapsUrl } from "../../lib/visaCentres";
import { useT } from "../../lib/i18n";
import { S, HIT, ICON, useColors } from "../../lib/theme";
import { Icon, PressScale, Text } from "../ui";
import { Group, GroupHeader, START } from "./Row";

function Address({ city, address }: { city: string; address: string }) {
  const { t } = useT(); const c = useColors();
  return (
    <View style={{ paddingHorizontal: S.md, paddingVertical: S.sm, gap: S.xxs }}>
      <View accessible accessibilityLabel={`${city}, ${address}`}>
        <Text variant="headline" style={START}>{city}</Text>
        <Text variant="subhead" tone="secondary" style={START}>{address}</Text>
      </View>
      <PressScale onPress={() => { Linking.openURL(mapsUrl(address)).catch(() => {}); }} accessibilityRole="link" accessibilityLabel={`${t("Open in Maps")}, ${city}`}
        style={{ minHeight: HIT, flexDirection: "row", alignItems: "center", gap: S.xs, alignSelf: "flex-start" }}>
        <Icon name="map.fill" size={ICON.md} color={c.accent} />
        <Text variant="body" tone="accent" weight="600">{t("Open in Maps")}</Text>
      </PressScale>
    </View>
  );
}

export function VisaCentre({ centre }: { centre: Centre }) {
  const { t } = useT();
  return (
    <View testID="country-centre">
      <GroupHeader title={t("Visa centre")} />
      <Text variant="body" style={[START, { marginHorizontal: S.gutter, marginBottom: S.xs }]}>{centre.provider}</Text>
      <Group inset={S.md} footer={t("EZvisa tells you when and where your appointment is.")}>
        <Address city={t("Dubai")} address={centre.dubaiAddress} />
        <Address city={t("Abu Dhabi")} address={centre.abuDhabiAddress} />
      </Group>
    </View>
  );
}
