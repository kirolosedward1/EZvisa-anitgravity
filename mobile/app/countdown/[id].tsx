// Trip countdown (canvas TripCountdown): once the file is ready, the days to departure and a "Before you fly"
// checklist kept on this phone. The trip-day reminders (a week and a day before) come from lib/reminders.ts.
import { useCallback, useEffect, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, EmptyState, HeaderIconButton, InfoNote, QuestionHeader, Skeleton, Text, Button, Flag } from "../../components/ui";
import { Checklist } from "../../components/status/AppointmentDay";
import { useColors, S, R } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { getApplication, type Application } from "../../lib/data";
import { formatDetailDate } from "../../lib/dates";
import { daysUntil } from "../../components/status/StatusCards";
import { tap } from "../../lib/haptics";
import { cachedApplication } from "../../lib/appsCache";

export const BEFORE_YOU_FLY = ["Passport with the visa, collected", "Travel insurance certificate", "Flight tickets (the reservation in your file is not a ticket)",
  "Hotel confirmation", "The printed EZvisa file (border officers may ask)", "Euros or a travel card"] as const;

export default function Countdown() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors(); const insets = useSafeAreaInsets(); const { t, lang } = useT();
  const [a, setA] = useState<Application | null>(() => cachedApplication(id)); /* shown at once, then the full row */ const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => { try { setErr(null); setA(await getApplication(id!)); } catch (e: any) { setErr(e?.message ?? String(e)); } }, [id]);
  useEffect(() => { load(); }, [load]);
  const close = () => { tap(); if (router.canGoBack()) router.back(); else router.replace(`/applications/${id}`, { withAnchor: true }); };
  const header = (
    <View style={{ paddingTop: Platform.OS === "ios" ? S.sm : insets.top + S.xs, paddingHorizontal: S.gutter - S.xxs, flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52 }}>
      <HeaderIconButton icon="xmark" label={t("Close")} onPress={close} testID="countdown-close" />
      <Text variant="headline">{t("Your trip")}</Text>
      <View style={{ width: 44 }} />
    </View>
  );
  if (err) return <View style={{ flex: 1, backgroundColor: c.bg }}>{header}<EmptyState icon="exclamationmark.triangle.fill" title={t("Couldn't load")} message={t(err)} action={<Button title={t("Retry")} variant="secondary" onPress={load} />} /></View>;
  if (!a) return <View style={{ flex: 1, backgroundColor: c.bg }}>{header}<View style={{ padding: S.gutter, gap: S.md }}><Skeleton h={160} r={R.card} /><Skeleton h={260} r={R.card} /></View></View>;
  const country = a.countries?.name ?? "";
  const n = daysUntil(a.entry_date);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} testID="countdown">
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: Math.max(insets.bottom, S.lg) + S.lg, gap: S.lg }}>
        <QuestionHeader question={n === 0 ? t("You fly today. Have a great trip.") : t("Almost time to go.")} pose="travel" />
        <Card padded>
          <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
            <Flag country={country} size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="callout" tone="secondary">{[t(country), a.entry_date && formatDetailDate(a.entry_date, lang)].filter(Boolean).join(" · ")}</Text>
              <Text variant="pageTitle" accessibilityRole="header">{n != null ? (n === 1 ? t("1 day") : t("{n} days", { n })) : t("Dates to confirm")}</Text>
            </View>
          </View>
        </Card>
        <Checklist storeKey={`ezvisa.fly.${a.id}`} items={BEFORE_YOU_FLY} header={(i, total) => t("Before you fly · {i} of {n}", { i, n: total })} />
        <InfoNote icon="airplane" text={t("Arrive at the airport 3 hours before an international flight. Keep the visa page and the EZvisa file in your hand luggage.")} />
      </ScrollView>
    </View>
  );
}
