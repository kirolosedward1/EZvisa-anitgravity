// Proof of funds for countries that have a rule in lib/funds.ts (copied from the website's calculator). Countries
// without a rule show nothing: no estimate. The section stays hidden until the owner confirms the numbers
// (FUNDS_CONFIRMED); the web preview can show it for review with window.__PREVIEW_FUNDS__ (never set in the app).
import { useState } from "react";
import { Platform, View } from "react-native";
import type { CountryInfo } from "../../lib/countryInfo";
import { FUNDS_CONFIRMED, TRIP_DAYS, fundsTotal } from "../../lib/funds";
import { openWeb } from "../../lib/api";
import { useT } from "../../lib/i18n";
import { select } from "../../lib/haptics";
import { S, R, HIT, ICON, useColors, curve } from "../../lib/theme";
import { Icon, PressScale, Text, type IconName } from "../ui";
import { Group, GroupHeader, InfoRow } from "./Row";

export const fundsVisible = () => FUNDS_CONFIRMED || (Platform.OS === "web" && !!(globalThis as any).__PREVIEW_FUNDS__);

/** Money in the rule's currency, with the reading language's digits (Arabic-Indic in Arabic). */
export const money = (n: number, currency: string, lang: string) =>
  new Intl.NumberFormat(lang === "ar" ? "ar" : "en", { style: "currency", currency, minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);

function StepButton({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled: boolean }) {
  const c = useColors();
  return (
    <PressScale onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
      style={[{ width: HIT, height: HIT, borderRadius: R.round, backgroundColor: c.fill, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : 1 }, curve]}>
      <Icon name={icon} size={ICON.md} color={c.label} weight="semibold" />
    </PressScale>
  );
}

/** Trip length stepper. VoiceOver: one adjustable element (swipe up/down), the buttons are hidden from it. */
function Stepper({ days, setDays }: { days: number; setDays: (n: number) => void }) {
  const { t, lang } = useT();
  const fmt = (n: number) => new Intl.NumberFormat(lang === "ar" ? "ar" : "en").format(n);
  const label = t(days === 1 ? "{n} day" : "{n} days", { n: fmt(days) });
  const set = (n: number) => { const v = Math.min(TRIP_DAYS.max, Math.max(TRIP_DAYS.min, n)); if (v !== days) { select(); setDays(v); } };
  return (
    <View accessible accessibilityRole="adjustable" accessibilityLabel={t("Trip length")} accessibilityValue={{ text: label }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]} onAccessibilityAction={(e) => set(days + (e.nativeEvent.actionName === "increment" ? 1 : -1))}
      style={{ paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: S.sm }} testID="funds-stepper">
      <View style={{ flex: 1, minWidth: S.x6 * 1.5 }}>
        <Text variant="body">{t("Trip length")}</Text>
        <Text variant="headline" tabular testID="funds-days">{label}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: S.xs }}>
        <StepButton icon="minus" label={t("Fewer days")} onPress={() => set(days - 1)} disabled={days <= TRIP_DAYS.min} />
        <StepButton icon="plus" label={t("More days")} onPress={() => set(days + 1)} disabled={days >= TRIP_DAYS.max} />
      </View>
    </View>
  );
}

export function FundsSection({ info }: { info: CountryInfo }) {
  const { t, lang } = useT(); const [days, setDays] = useState<number>(TRIP_DAYS.start);
  const f = info.funds;
  if (!f || !fundsVisible()) return null;
  const m = (n: number) => money(n, f.currency, lang);
  const withHotel = fundsTotal(info.slug, days, true)!; const noHotel = fundsTotal(info.slug, days, false)!;
  const same = f.dailyRateWithHotel === f.dailyRateNoHotel;
  return (
    <View style={{ gap: S.md }} testID="country-funds">
      <View>
        <GroupHeader title={t("Proof of funds")} />
        <Group inset={S.md} footer={t(f.note)}>
          {same ? <InfoRow title={t("Per day")} value={m(f.dailyRateWithHotel)} />
            : <InfoRow title={t("Per day with a hotel booking")} value={m(f.dailyRateWithHotel)} />}
          {!same && <InfoRow title={t("Per day without a hotel booking")} value={m(f.dailyRateNoHotel)} />}
          {f.minimumTotal != null && <InfoRow title={t("Minimum total")} value={m(f.minimumTotal)} />}
        </Group>
      </View>
      <Group inset={S.md}>
        <Stepper days={days} setDays={setDays} />
        {same ? <InfoRow title={t("Total for your trip")} value={m(withHotel)} testID="funds-total" />
          : <InfoRow title={t("Total with a hotel booking")} value={m(withHotel)} testID="funds-total" />}
        {!same && <InfoRow title={t("Total without a hotel booking")} value={m(noHotel)} testID="funds-total-nohotel" />}
        <InfoRow title={t("Full calculator")} onPress={() => { openWeb("/tools/bank-balance-calculator"); }} a11yHint={t("Opens the website")} testID="funds-calculator" />
      </Group>
    </View>
  );
}
