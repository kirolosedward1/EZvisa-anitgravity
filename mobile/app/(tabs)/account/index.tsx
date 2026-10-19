import { Alert, Linking, Platform, ScrollView, Switch, View } from "react-native";
import { useEffect, useState } from "react";
import { remindersEnabled, remindersSupported, setRemindersEnabled, planReminders } from "../../../lib/reminders";
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
  const { pref, setPref } = useAppearance();
  const [rem, setRem] = useState(false); const [remNote, setRemNote] = useState<string | null>(null);
  useEffect(() => { remindersEnabled().then(setRem); }, []);
  const toggleRem = async (on: boolean) => {
    setRem(on);
    const r = await setRemindersEnabled(on, apps);
    setRem(r.on);
    setRemNote(r.denied ? "Notifications are off for EZvisa. Turn them on in Settings." : null);
  };
  const planned = rem && apps ? planReminders(apps).length : 0;
  const reminders = (
    <ListGroup header="Reminders" footer={!remindersSupported ? "Available in the iOS and Android app." : remNote ?? (rem ? (session ? (planned ? `${planned} reminder${planned === 1 ? "" : "s"} scheduled on this phone.` : "Nothing to remind yet. We add your travel date and passport expiry when they're on file.") : "Sign in to get reminders for your applications.") : "A week and a day before you travel, and 6 and 3 months before your passport expires.")}>
      <View style={{ minHeight: 52, paddingHorizontal: S.md, paddingVertical: S.xs, flexDirection: "row", alignItems: "center", gap: S.sm }} testID="reminders">
        <Icon name="alarm.fill" size={20} color={c.orange} />
        <Text variant="body" style={{ flex: 1 }}>Trip and passport reminders</Text>
        <Switch value={rem} disabled={!remindersSupported} onValueChange={toggleRem} trackColor={{ true: c.green, false: c.fill }} accessibilityLabel="Trip and passport reminders" />
      </View>
      {!!remNote && Platform.OS !== "web" && <ListRow title="Open Settings" tint chevron={false} onPress={() => Linking.openSettings()} />}
    </ListGroup>
  );
  const appearance = (
    <ListGroup header="Appearance">
      <View style={{ padding: S.sm }} testID="appearance">
        <SegmentedControl label="Appearance" value={pref} onChange={(v) => setPref(v as AppearancePref)}
          options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
      </View>
    </ListGroup>
  );
  const support = (
    <ListGroup header="Support" inset={58}>
      <ListRow icon="logo.whatsapp" iconColor={c.whatsapp} title="WhatsApp" onPress={() => whatsapp()} />
      <ListRow icon="envelope.fill" iconColor={c.tint} title="Email" onPress={mailSupport} />
    </ListGroup>
  );
  if (!session) return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text variant="largeTitle" accessibilityRole="header" style={{ marginHorizontal: S.lg, marginBottom: S.xxl }}>Account</Text>
      <View style={{ alignItems: "center", paddingHorizontal: S.lg, marginBottom: S.xxl, gap: S.md }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><Icon name="person.fill" size={36} color={c.tertiaryLabel} /></View>
        <Text variant="title2" center>Sign in to track your visa</Text>
        <View style={{ alignSelf: "stretch", gap: S.xs, marginTop: S.sm }}>
          <Button title="Sign in" onPress={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} />
          <Button title="Create account" variant="plain" color={c.label} onPress={() => router.push({ pathname: "/auth", params: { mode: "signup" } })} />
        </View>
      </View>
      {appearance}
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
        <ListRow icon="bell.fill" iconColor={c.red} title="Notifications" value={unread ? String(unread) : undefined} onPress={() => router.push("/account/notifications")} />
        <ListRow icon="doc.text.fill" iconColor={c.tint} title="Applications" onPress={() => router.navigate("/applications")} />
      </ListGroup>
      {appearance}
      {reminders}
      {support}
      <ListGroup><ListRow title="Sign out" destructive chevron={false} onPress={signOut} /></ListGroup>
    </ScrollView>
  );
}
