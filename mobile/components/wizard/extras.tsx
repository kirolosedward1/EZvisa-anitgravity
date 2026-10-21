// Wizard helpers (WIZARD-IDEAS.md top 8): route preview, document checklist, prefill offer.
// Content only from existing definitions: answers, PRICE_AED, the website upload checklist (lib/data.ts REQS).
import { useState } from "react";
import { View, Modal, ScrollView } from "react-native";
import { Text, Icon, Flag, Button } from "../ui";
import { PressScale } from "../ui";
import { useColors, S, R, curve } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { PRICE_AED } from "../../lib/config";
import type { Requirement } from "../../lib/data";

const Card = ({ children, testID }: { children: React.ReactNode; testID?: string }) => {
  const c = useColors();
  return <View testID={testID} style={[{ borderRadius: R.card, backgroundColor: c.card, padding: S.md, gap: S.sm }, curve]}>{children}</View>;
};

/** Shown once destination, nationality and residence are known. */
export function RoutePreview({ destination, nationality, residence, left }: { destination: string; nationality: string; residence: string; left: number }) {
  const { t, rtl } = useT(); const arrow = rtl ? "←" : "→";
  const row = (country: string, text: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}><Flag country={country} size={24} /><Text variant="subhead" style={{ flex: 1 }}>{text}</Text></View>
  );
  return (
    <Card testID="route-preview">
      <View accessible accessibilityLabel={`${t(nationality)} → ${t(destination)}. ${t("Resident in {c}", { c: t(residence) })}. ${t("{n} questions left", { n: left })}. ${PRICE_AED} AED`} style={{ gap: S.sm }}>
        {row(nationality, `${t(nationality)} ${arrow} ${t(destination)}`)}
        {row(residence, t("Resident in {c}", { c: t(residence) }))}
        <Text variant="footnote" tone="secondary" tabular>{t("{n} questions left", { n: left })} · {PRICE_AED} AED</Text>
      </View>
    </Card>
  );
}

/** Header button + sheet with the website's upload checklist. */
export function DocsButton({ reqs }: { reqs: Requirement[] }) {
  const c = useColors(); const { t } = useT(); const [open, setOpen] = useState(false);
  return (
    <>
      <PressScale onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t("Documents you'll need")} hitSlop={4} testID="docs-button"
        style={{ width: 44, height: 44, borderRadius: R.round, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
        <Icon name="doc.text" size={16} color={c.label} />
      </PressScale>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: S.lg, paddingBottom: S.sm }}>
            <Text variant="title2" accessibilityRole="header" style={{ flex: 1 }}>{t("Documents you'll need")}</Text>
            <Button title={t("Done")} variant="plain" size="M" onPress={() => setOpen(false)} />
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.xl, gap: S.xs }}>
            <Text variant="subhead" tone="secondary" style={{ marginBottom: S.xs }}>{t("Upload after you submit.")}</Text>
            {reqs.map((r) => (
              <View key={r.id} accessible accessibilityLabel={`${t(r.title)}${r.provided_by_ezvisa ? `, ${t("Prepared by EZvisa")}` : ""}`}
                style={[{ minHeight: 56, borderRadius: R.tile, backgroundColor: c.card, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", alignItems: "center", gap: S.sm }, curve]}>
                <Icon name={r.provided_by_ezvisa ? "checkmark.seal.fill" : "doc.fill"} size={16} color={r.provided_by_ezvisa ? c.accent : c.secondaryLabel} />
                <View style={{ flex: 1, gap: S.xxs }}>
                  <Text variant="body" weight="500">{t(r.title)}</Text>
                  {!!r.description && <Text variant="footnote" tone="secondary">{t(r.description)}</Text>}
                </View>
                {r.provided_by_ezvisa && <Text variant="caption" weight="600" color={c.accent}>{t("Prepared by EZvisa")}</Text>}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

/** Offer to reuse answers from the user's last application. Nothing changes until they tap "Use". */
export function PrefillOffer({ name, onUse, onDismiss }: { name: string; onUse: () => void; onDismiss: () => void }) {
  const { t } = useT();
  return (
    <Card testID="prefill-offer">
      <Text variant="headline">{t("Use details from your last application?")}</Text>
      <Text variant="subhead" tone="secondary">{name}</Text>
      <View style={{ flexDirection: "row", gap: S.sm }}>
        <View style={{ flex: 1 }}><Button title={t("Not now")} variant="secondary" size="M" onPress={onDismiss} /></View>
        <View style={{ flex: 1 }}><Button title={t("Use")} size="M" onPress={onUse} /></View>
      </View>
    </Card>
  );
}
