// The signed-in user's own application for this country (lib/countryInfo.ts countryApp), shown before anything else:
// status, trip dates, the 5-step progress and the one next action (lib/nextAction.ts), tapping through to the
// application. A draft shows "Continue draft". With more than one open item for the country, "See all" opens the
// Applications tab.
import type { ReactNode } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import type { CountryApp } from "../../lib/countryInfo";
import { STATUS_LABEL, APP_STATUS_LABEL, employmentOf, isPaid, requirementsFor, type Application } from "../../lib/data";
import { buildChecklist } from "../../lib/checklist";
import { nextAction } from "../../lib/nextAction";
import { buildTimeline, doneCount } from "../../lib/timeline";
import { useT } from "../../lib/i18n";
import { S, R, ICON, useColors, useIsDark, card, PRESS } from "../../lib/theme";
import { Icon, PressScale, ProgressSegments, Text } from "../ui";
import { GroupHeader } from "./Row";
import { formatDay } from "../../lib/dates";

const FINISHED = ["completed", "rejected", "cancelled"];
export const tripDates = (a: Pick<Application, "entry_date" | "exit_date">, lang: string) => (a.entry_date ? [formatDay(a.entry_date, lang), a.exit_date && formatDay(a.exit_date, lang)].filter(Boolean).join(" – ") : "");

function Shell({ onPress, label, children, testID }: { onPress: () => void; label: string; children: ReactNode; testID: string }) {
  const c = useColors(); const dark = useIsDark(); const { t, rtl } = useT();
  return (
    <PressScale onPress={onPress} scaleTo={PRESS.scaleLarge} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={t("Opens the application")} testID={testID}
      style={[card(c, dark, 1), { marginHorizontal: S.gutter, padding: S.md, gap: S.sm, borderRadius: R.card }]}>
      {children}
      <Icon name={rtl ? "chevron.left" : "chevron.right"} size={ICON.sm} color={c.tertiaryLabel} weight="semibold" style={{ position: "absolute", top: S.md + S.xxs, end: S.md }} />
    </PressScale>
  );
}

export function YourApplicationCard({ state, onContinueDraft }: { state: CountryApp; onContinueDraft: () => void }) {
  const { t, lang } = useT();
  if (state.kind === "none") return null;
  const more = state.count > 1;
  const header = <GroupHeader title={t("Your application")} action={more ? t("See all") : undefined} onAction={() => router.navigate("/applications")} testID="yourapp-header" />;
  if (state.kind === "draft") {
    const step = t("Not submitted yet.");
    return (
      <View testID="country-yourapp">
        {header}
        <Shell onPress={onContinueDraft} label={[t("Draft"), step, t("Continue draft")].join(", ")} testID="yourapp-draft">
          <Text variant="callout" weight="600" tone="accent">{t("Draft")}</Text>
          <Text variant="subhead" tone="secondary">{step}</Text>
          <Text variant="body" tone="accent" weight="600">{t("Continue draft")}</Text>
        </Shell>
      </View>
    );
  }
  const a = state.app;
  const items = buildChecklist(requirementsFor(employmentOf(a)), a.documents, a.status).customer;
  const n = nextAction(a, items);
  const steps = buildTimeline(a); const done = doneCount(steps);
  const status = t(a.status === "submitted" && isPaid(a) ? "Paid" : APP_STATUS_LABEL[a.status] ?? a.status);
  const dates = tripDates(a, lang);
  const next = [t(n.title, n.vars), n.body && t(n.body)].filter(Boolean).join(" · ");
  return (
    <View testID="country-yourapp">
      {header}
      <Shell onPress={() => router.push(`/applications/${a.id}`, { withAnchor: true })} label={[status, a.reference, dates, next].filter(Boolean).join(", ")} testID="yourapp-active">
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: S.xs, paddingEnd: S.xl }}>
          <Text variant="callout" weight="600" tone={a.status === "rejected" ? "danger" : "accent"} testID="yourapp-status">{status}</Text>
          {!!dates && <Text variant="callout" tone="secondary" tabular>{`· ${dates}`}</Text>}
        </View>
        <Text variant="footnote" tone="secondary" tabular>{a.reference}</Text>
        <ProgressSegments count={steps.length} index={done} fraction={0} current={!FINISHED.includes(a.status)} label={t("{n} of {total} steps done", { n: done, total: steps.length })} />
        <Text variant="subhead" testID="yourapp-next">{next}</Text>
      </Shell>
    </View>
  );
}
