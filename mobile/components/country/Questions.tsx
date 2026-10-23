// Questions: existing places to get answers. How it works and the country's document page on the website (in-app
// browser), and WhatsApp with the country in the message (the same helper the Support sheet uses).
import { View } from "react-native";
import { openWeb, whatsapp } from "../../lib/api";
import { docsPath, type CountryInfo } from "../../lib/countryInfo";
import { useT } from "../../lib/i18n";
import { Group, GroupHeader, InfoRow } from "./Row";

export function Questions({ info }: { info: CountryInfo }) {
  const { t } = useT();
  return (
    <View testID="country-questions">
      <GroupHeader title={t("Questions")} />
      <Group>
        <InfoRow icon="questionmark.circle" title={t("How it works")} onPress={() => { openWeb("/how-it-works"); }} a11yHint={t("Opens the website")} testID="q-how" />
        <InfoRow icon="logo.whatsapp" title={t("Talk to us on WhatsApp")} onPress={() => { whatsapp(`Hi EZvisa, I have a question about a ${info.name} visa.`); }} testID="q-whatsapp" />
        <InfoRow icon="doc.text" title={t("Required documents on the website")} onPress={() => { openWeb(docsPath(info.slug)); }} a11yHint={t("Opens the website")} testID="q-docs" />
      </Group>
    </View>
  );
}
