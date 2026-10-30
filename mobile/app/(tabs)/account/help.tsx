// Help (canvas Help, ReportProblem): Globi's line, a search over the FAQ (lib/faq.ts, the website's answers), the
// questions as an accordion, contact (WhatsApp, email) and "Report a problem", which opens an email with the app
// version and device filled in. No documents, passport details or logs are attached.
import { useState } from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import { RowGroup, Row, Text, GlobiLine, SearchField, useTabInset } from "../../../components/ui";
import { FaqList } from "../../../components/FaqList";
import { useColors, S } from "../../../lib/theme";
import { useT } from "../../../lib/i18n";
import { FAQ } from "../../../lib/faq";
import { EMAIL } from "../../../lib/config";
import { whatsapp, email as mailSupport } from "../../../lib/api";
import { track } from "../../../lib/analytics";

export default function Help() {
  const c = useColors(); const pb = useTabInset(); const { t, lang } = useT();
  const [q, setQ] = useState("");
  const L = lang === "ar" ? "ar" : "en";
  const needle = q.trim().toLowerCase();
  const list = needle ? FAQ.filter((f) => `${f.q[L]} ${f.a[L]}`.toLowerCase().includes(needle)) : FAQ;
  const report = () => {
    const v = `${Constants.expoConfig?.version ?? ""}`;
    const body = [t("What happened?"), "", "", "—", `App ${v}`, `${Platform.OS} ${String(Platform.Version)}`].join("\n");
    Linking.openURL(`mailto:${EMAIL}?subject=${encodeURIComponent("EZvisa app: report a problem")}&body=${encodeURIComponent(body)}`).catch(() => {});
  };
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: pb, gap: S.xl }} testID="help">
      <Stack.Screen options={{ title: t("Help") }} />
      <GlobiLine pose="phone" text={t("Ask me anything, or message the team.")} />
      <SearchField value={q} onChangeText={setQ} placeholder={t("Search help")} testID="help-search" />
      <View style={{ gap: S.xs }}>
        <Text variant="note" weight="600" tone="secondary" accessibilityRole="header">{t("Common questions")}</Text>
        <FaqList list={list} empty={t("No answer matches. Ask the team on WhatsApp.")} />
      </View>
      <RowGroup header={t("Contact")}>
        <Row label="WhatsApp" sub={t("Fastest")} icon="logo.whatsapp" onPress={() => { track("whatsapp_handoff", { screen: "help" }); whatsapp(); }} testID="help-whatsapp" />
        <Row label={t("Email")} icon="envelope.fill" value={EMAIL} onPress={mailSupport} />
      </RowGroup>
      <RowGroup footer={t("Opens an email with the app version and your phone model. No documents or passport details are included.")}>
        <Row label={t("Report a problem")} icon="exclamationmark.triangle.fill" onPress={report} testID="help-report" />
      </RowGroup>
    </ScrollView>
  );
}
