import { Alert, Linking, Platform, ScrollView, Switch, View } from "react-native";
import { useEffect, useState } from "react";
import { remindersEnabled, remindersSupported, setRemindersEnabled, planReminders, getPassportExpiry, setPassportExpiry, syncReminders } from "../../../lib/reminders";
import { useT, type Lang } from "../../../lib/i18n";
import { lockSupported, lockEnabled, setLockEnabled, biometricLabel } from "../../../lib/lock";
import { DateAnswer } from "../../../components/wizard/answers";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListGroup, ListRow, Avatar, Text, Button, Icon, SegmentedControl, useTabInset } from "../../../components/ui";
import { useAppearance, type AppearancePref } from "../../../lib/appearance";
import { useColors, S } from "../../../lib/theme";
import { supabase } from "../../../lib/supabase";
import { whatsapp, email as mailSupport } from "../../../lib/api";
import { useApps } from "../../../lib/useApps";

export default function Account() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets();
  const { session, unread, apps } = useApps(true);
  const { pref, setPref } = useAppearance(); const { t, lang, setLang } = useT();
  const [rem, setRem] = useState(false); const [remNote, setRemNote] = useState<string | null>(null);
  const [pp, setPp] = useState(""); const [lock, setLock] = useState(false); const [bio, setBio] = useState<string | null>(null); const [lockNote, setLockNote] = useState<string | null>(null);
  useEffect(() => { remindersEnabled().then(setRem); getPassportExpiry().then(setPp); lockEnabled().then(setLock); biometricLabel().then(setBio); }, []);
  const onPp = async (v: string) => { setPp(v); await setPassportExpiry(v); if (apps) syncReminders(apps); };
  const toggleLock = async (on: boolean) => {
    setLockNote(null);
    const r = await setLockEnabled(on, t("Turn on {m} for EZvisa", { m: t(bio ?? "Face ID") })); setLock(r);
    if (on && !r) setLockNote(bio ? t("Not turned on.") : t("Set up Face ID or a passcode in Settings first."));
  };
  const language = (
    <ListGroup header={t("Language")} footer={t("The app restarts to switch direction.")}>
      <View style={{ padding: S.sm }} testID="language">
        <SegmentedControl label={t("Language")} value={lang} onChange={(v) => { if (v !== lang) setLang(v as Lang); }} options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} />
      </View>
    </ListGroup>
  );
  const security = lockSupported ? (
    <ListGroup header={t("Security")} footer={lockNote ?? (bio ? t("Ask for {m} when you open the app.", { m: t(bio) }) : t("No Face ID, Touch ID or passcode is set up on this device."))}>
      <View style={{ minHeight: 52, paddingHorizontal: S.md, paddingVertical: S.xs, flexDirection: "row", alignItems: "center", gap: S.sm }} testID="faceid">
        <Icon name="faceid" size={20} color={c.green} />
        <Text variant="body" style={{ flex: 1 }}>{t("Unlock with {m}", { m: t(bio ?? "Face ID") })}</Text>
        <Switch value={lock} disabled={!bio} onValueChange={toggleLock} trackColor={{ true: c.green, false: c.fill }} accessibilityLabel={t("Unlock with {m}", { m: t(bio ?? "Face ID") })} />
      </View>
    </ListGroup>
  ) : null;
  const toggleRem = async (on: boolean) => {
    setRem(on);
    const r = await setRemindersEnabled(on, apps);
    setRem(r.on);
    setRemNote(r.denied ? "Notifications are off for EZvisa. Turn them on in Settings." : null);
  };
  const planned = rem && apps ? planReminders(apps, new Date(), pp).length : 0;
  const reminders = (
    <ListGroup header={t("Reminders")} footer={!remindersSupported ? t("Available in the iOS and Android app.") : remNote ?? (rem ? (planned ? t("{n} reminder(s) scheduled on this phone.", { n: planned }) : t("Nothing to remind yet. Add your passport expiry or submit an application with travel dates.")) : t("A week and a day before you travel, and 6 and 3 months before your passport expires."))}>
      <View style={{ minHeight: 52, paddingHorizontal: S.md, paddingVertical: S.xs, flexDirection: "row", alignItems: "center", gap: S.sm }} testID="reminders">
        <Icon name="alarm.fill" size={20} color={c.orange} />
        <Text variant="body" style={{ flex: 1 }}>{t("Trip and passport reminders")}</Text>
        <Switch value={rem} disabled={!remindersSupported} onValueChange={toggleRem} trackColor={{ true: c.green, false: c.fill }} accessibilityLabel={t("Trip and passport reminders")} />
      </View>
      <View style={{ padding: S.sm, gap: S.xs }} testID="passport-expiry">
        <Text variant="footnote" tone="secondary" style={{ marginHorizontal: S.xs }}>{t("Passport expiry (kept on this phone)")}</Text>
        <DateAnswer label={t("Passport expiry")} value={pp} onChange={onPp} style="wheel" placeholder="Select date" min={new Date().toISOString().slice(0, 10)} />
      </View>
      {!!remNote && Platform.OS !== "web" && <ListRow title="Open Settings" tint chevron={false} onPress={() => Linking.openSettings()} />}
    </ListGroup>
  );
  const appearance = (
    <ListGroup header={t("Appearance")}>
      <View style={{ padding: S.sm }} testID="appearance">
        <SegmentedControl label="Appearance" value={pref} onChange={(v) => setPref(v as AppearancePref)}
          options={[{ value: "system", label: t("System") }, { value: "light", label: t("Light") }, { value: "dark", label: t("Dark") }]} />
      </View>
    </ListGroup>
  );
  const support = (
    <ListGroup header={t("Support")} inset={58}>
      <ListRow icon="logo.whatsapp" iconColor={c.whatsapp} title="WhatsApp" onPress={() => whatsapp()} />
      <ListRow icon="envelope.fill" iconColor={c.tint} title="Email" onPress={mailSupport} />
    </ListGroup>
  );
  if (!session) return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text variant="largeTitle" accessibilityRole="header" style={{ marginHorizontal: S.lg, marginBottom: S.xxl }}>{t("Account")}</Text>
      <View style={{ alignItems: "center", paddingHorizontal: S.lg, marginBottom: S.xxl, gap: S.md }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><Icon name="person.fill" size={36} color={c.tertiaryLabel} /></View>
        <Text variant="title2" center>{t("Sign in to track your visa")}</Text>
        <View style={{ alignSelf: "stretch", gap: S.xs, marginTop: S.sm }}>
          <Button title={t("Sign in")} onPress={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} />
          <Button title={t("Create account")} variant="plain" color={c.label} onPress={() => router.push({ pathname: "/auth", params: { mode: "signup" } })} />
        </View>
      </View>
      {appearance}
      {language}
      {reminders}
      {support}
    </ScrollView>
  );
  const u = session.user; const full = (u.user_metadata?.full_name as string | undefined) ?? (u.email ?? "").split("@")[0];
  const signOut = () => {
    if (Platform.OS === "web") { supabase?.auth.signOut(); return; }
    Alert.alert("Sign out?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: () => supabase?.auth.signOut() }]);
  };
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ alignItems: "center", gap: S.xs, marginBottom: S.xxl }} accessible accessibilityLabel={`${full}, ${u.email}`}>
        <Avatar name={full} size={88} />
        <Text variant="title1" style={{ marginTop: S.sm }}>{full}</Text>
        <Text variant="subhead" tone="secondary">{u.email}</Text>
      </View>
      <ListGroup inset={58}>
        <ListRow icon="bell.fill" iconColor={c.red} title={t("Notifications")} value={unread ? String(unread) : undefined} onPress={() => router.push("/account/notifications")} />
        <ListRow icon="doc.text.fill" iconColor={c.tint} title={t("Applications")} onPress={() => router.navigate("/applications")} />
      </ListGroup>
      {appearance}
      {language}
      {security}
      {reminders}
      {support}
      <ListGroup><ListRow title={t("Sign out")} destructive chevron={false} onPress={signOut} /></ListGroup>
    </ScrollView>
  );
}
