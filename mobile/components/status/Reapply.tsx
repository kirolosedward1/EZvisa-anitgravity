// Apply again (canvas Reapply): what carries over from a finished application before the wizard opens. The wizard's own
// "Use details from your last application?" offer then fills the answers; new dates and a fresh bank statement are asked.
import { View } from "react-native";
import { router } from "expo-router";
import { SheetScaffold, PrimaryButton, SecondaryButton, RowGroup, Row, InfoNote, Text } from "../ui";
import { useT } from "../../lib/i18n";
import { useFmtDate } from "../wizard/answers";
import { EMPLOYMENT, label as optLabel } from "../../lib/wizard";
import type { Application } from "../../lib/data";
import { travellersLine } from "./StatusCards";
import { tap } from "../../lib/haptics";
import { S } from "../../lib/theme";

export function ReapplySheet({ a, visible, onClose }: { a: Application; visible: boolean; onClose: () => void }) {
  const { t } = useT(); const fmt = useFmtDate();
  const w = (a.notes?.wizard ?? {}) as Record<string, string | undefined>;
  const country = a.countries?.name ?? a.destination_country ?? "";
  const emp = (w.employmentStatus || a.notes?.employmentStatus || "") as string;
  const go = (params: Record<string, string>) => { tap(); onClose(); setTimeout(() => router.push({ pathname: "/apply", params }), 250); };
  return (
    <SheetScaffold visible={visible} onClose={onClose} pose="passport" bubble title={t("Start from your {c} application?", { c: t(country) })} line={t("I will carry everything over.")} testID="reapply-sheet"
      actions={<>
        <PrimaryButton title={t("Start with these details")} onPress={() => go({ to: country })} testID="reapply-start" />
        <SecondaryButton title={t("Start from scratch")} onPress={() => go({})} />
      </>}>
      <View style={{ gap: S.sm }}>
        <RowGroup header={t("Carried over")}>
          <Row label={t("Travellers")} value={travellersLine(a, t("and"))} />
          {!!w.passportExpiry && <Row label={t("Passport")} value={t("valid to {d}", { d: fmt(w.passportExpiry) })} />}
          {!!emp && <Row label={t("Employment")} value={t(optLabel(EMPLOYMENT, emp))} />}
          <Row label={t("Destination")} value={t(country)} />
          <Row label={t("Dates")} value={t("Choose new")} />
        </RowGroup>
        <InfoNote tone="later" text={t("Bank statements must be from the last 3 months, so I will ask for a new one.")} />
        <Text variant="caption" tone="secondary">{t("You can change anything before you pay.")}</Text>
      </View>
    </SheetScaffold>
  );
}
