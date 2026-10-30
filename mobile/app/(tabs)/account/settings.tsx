// Settings (canvas Settings, NotifSettings, LanguageRegion, Appearance, SecurityPrivacy, About): one screen of grouped
// rows. Everything here is a phone preference (no account data): reminders, language, theme and Globi motion, the app
// lock, anonymous usage sharing, and the legal pages.
import { useEffect, useState } from "react";
import { Alert, Linking, Platform, ScrollView, View } from "react-native";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { RowGroup, Row, SegmentedControl, Text, useTabInset } from "../../../components/ui";
import { DateAnswer } from "../../../components/wizard/answers";
import { useColors, S } from "../../../lib/theme";
import { useT, type Lang } from "../../../lib/i18n";
import { useAppearance, type AppearancePref } from "../../../lib/appearance";
import { useGlobiAnimations, setGlobiAnimations } from "../../../lib/globiMotion";
import { lockSupported, lockEnabled, setLockEnabled, biometricLabel, lockAfter, setLockAfter, LOCK_AFTER } from "../../../lib/lock";
import { remindersEnabled, remindersSupported, setRemindersEnabled, planReminders, getPassportExpiry, setPassportExpiry, syncReminders } from "../../../lib/reminders";
import { useUsageSharing } from "../../../lib/privacy";
import { lastCrash } from "../../../lib/crash";
import { startupHistory } from "../../../lib/perf";
import { pendingEvents, track } from "../../../lib/analytics";
import { SENTRY_ENABLED, sendTestError } from "../../../lib/sentry";
import { siteUrl } from "../../../lib/config";
import { useApps } from "../../../lib/useApps";
import { iso } from "../../../lib/wizard";

export default function Settings() {
  const c = useColors(); const pb = useTabInset(); const { t, lang, setLang } = useT();
  const { apps, session } = useApps(true);
  const { pref, setPref } = useAppearance(); const globi = useGlobiAnimations();
  const [rem, setRem] = useState(false); const [remNote, setRemNote] = useState<string | null>(null);
  const [pp, setPp] = useState(""); const [ppOpen, setPpOpen] = useState(false);
  const [lock, setLock] = useState(false); const [bio, setBio] = useState<string | null>(null); const [lockNote, setLockNote] = useState<string | null>(null); const [after, setAfter] = useState(60000);
  const [usage, setUsage] = useUsageSharing();
  useEffect(() => { remindersEnabled().then(setRem); getPassportExpiry().then(setPp); lockEnabled().then(setLock); biometricLabel().then(setBio); lockAfter().then(setAfter); }, []);

  const toggleRem = async (on: boolean) => { setRem(on); const r = await setRemindersEnabled(on, apps); setRem(r.on); setRemNote(r.denied ? t("Notifications are off for EZvisa. Turn them on in Settings.") : null); };
  const onPp = async (v: string) => { setPp(v); await setPassportExpiry(v); if (apps) syncReminders(apps); };
  const toggleLock = async (on: boolean) => {
    setLockNote(null);
    const r = await setLockEnabled(on, t("Turn on {m} for EZvisa", { m: t(bio ?? "Face ID") })); setLock(r);
    if (on && !r) setLockNote(bio ? t("Not turned on.") : t("Set up Face ID or a passcode in Settings first."));
  };
  const diagnostics = async () => {
    const [st, cr, q] = await Promise.all([startupHistory(), lastCrash(), pendingEvents()]);
    const times = st.slice(-5).map((s) => `${s.native ?? s.js} ms`).join(", ") || "-";
    const u = session?.user;
    const test = () => { sendTestError([u?.user_metadata?.full_name as string | undefined, u?.email].filter(Boolean) as string[]); Alert.alert(t("Test error sent")); };
    Alert.alert(t("Diagnostics"), `${t("Startup")}: ${times}\n${t("Queued events")}: ${q}\n${t("Last error")}: ${cr ? `${new Date(cr.at).toLocaleString()} · ${cr.message}` : "-"}`,
      SENTRY_ENABLED && usage ? [{ text: t("Send test error"), onPress: test }, { text: "OK", style: "cancel" }] : undefined);
  };
  const page = (path: string) => () => { WebBrowser.openBrowserAsync(siteUrl(path)).catch(() => Linking.openURL(siteUrl(path))); };
  const planned = rem && apps ? planReminders(apps, new Date(), pp).length : 0;
  const box = { paddingHorizontal: S.md, paddingVertical: S.sm };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: pb, gap: S.xl }} testID="settings">
      <Stack.Screen options={{ title: t("Settings") }} />

      <RowGroup header={t("Notifications")} footer={!remindersSupported ? t("Available in the iOS and Android app.") : remNote ?? (rem ? (planned ? t("{n} reminder(s) scheduled on this phone.", { n: planned }) : t("Nothing to remind yet. Add your passport expiry or submit an application with travel dates.")) : t("A week and a day before you travel, the day before your appointment, and 6 and 3 months before your passport expires."))}>
        <Row label={t("Trip, appointment and passport reminders")} icon="alarm.fill" switchValue={rem} onSwitch={remindersSupported ? toggleRem : undefined} testID="reminders" />
        <Row label={t("Passport expiry")} sub={t("Kept on this phone")} icon="calendar" value={pp ? new Date(pp + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : t("Not set")} onPress={() => setPpOpen((o) => !o)} testID="passport-expiry" />
        {ppOpen && <View style={box} testID="passport-expiry-picker"><DateAnswer label={t("Passport expiry")} value={pp} onChange={onPp} style="wheel" placeholder={t("Select date")} min={iso(new Date())} /></View>}
        {!!remNote && Platform.OS !== "web" && <Row label={t("Open Settings")} tint onPress={() => Linking.openSettings()} />}
      </RowGroup>

      <RowGroup header={t("Language & region")} footer={t("Layout flips to right to left. Globi faces the text. Prices are always in AED.")}>
        <View style={box} testID="language">
          <SegmentedControl label={t("Language")} value={lang} onChange={(v) => { if (v !== lang) { track("lang_switch", { lang: v as Lang }); setLang(v as Lang); } }} options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} />
        </View>
        <Row label={t("Currency")} value="AED" />
      </RowGroup>

      <RowGroup header={t("Appearance")} footer={t("Globi animations are off when iOS Reduce Motion is on. Text follows the iOS text size.")}>
        <View style={box} testID="appearance">
          <SegmentedControl label={t("Appearance")} value={pref} onChange={(v) => setPref(v as AppearancePref)} options={[{ value: "light", label: t("Light") }, { value: "dark", label: t("Dark") }, { value: "system", label: t("System") }]} />
        </View>
        <Row label={t("Globi animations")} icon="sparkle" switchValue={globi} onSwitch={setGlobiAnimations} testID="globi-motion" />
      </RowGroup>

      <RowGroup header={t("Security & privacy")} footer={lockNote ?? t("Anonymous app usage and crash reports. Never your name, passport or email.")}>
        {lockSupported && <Row label={t("Unlock with {m}", { m: t(bio ?? "Face ID") })} icon="faceid" switchValue={lock} onSwitch={bio ? toggleLock : undefined} testID="faceid" />}
        {lockSupported && lock && (
          <View style={[box, { gap: S.xs }]}>
            <Text variant="footnote" tone="secondary">{t("Lock after")}</Text>
            <SegmentedControl label={t("Lock after")} value={String(after)} onChange={(v) => { setAfter(Number(v)); setLockAfter(Number(v)); }}
              options={LOCK_AFTER.map((ms) => ({ value: String(ms), label: ms === 0 ? t("Immediately") : t("{n} min", { n: ms / 60000 }) }))} />
          </View>
        )}
        <Row label={t("Share usage data")} icon="chart.bar.fill" switchValue={usage} onSwitch={setUsage} testID="usage-sharing" />
        <Row label={t("Privacy policy")} icon="hand.raised.fill" onPress={page("/privacy-policy")} />
      </RowGroup>

      <RowGroup header={t("About")}>
        <Row label={t("Version")} value={Constants.expoConfig?.version ?? ""} a11yLabel={t("Long press for diagnostics")} onPress={diagnostics} testID="version" />
        <Row label={t("Terms of service")} onPress={page("/terms-of-service")} />
        <Row label={t("Refund policy")} onPress={page("/refund-policy")} />
        <Row label="ezvisa.net" onPress={page("/")} />
      </RowGroup>
    </ScrollView>
  );
}
