import { stage } from "../../../lib/stage";
import { ActionSheetIOS, Alert, Linking, Modal, Platform, ScrollView, Switch, View } from "react-native";
import { useAvatar, pickAvatar, removeAvatar } from "../../../lib/avatar";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { STATUS_LABEL, isPaid, type Application } from "../../../lib/data";
import { useAuth } from "../../../lib/auth";
import { pendingUploads } from "../../../lib/uploads";
import { EMAIL } from "../../../lib/config";
import { useEffect, useState } from "react";
import { remindersEnabled, remindersSupported, setRemindersEnabled, planReminders, getPassportExpiry, setPassportExpiry, syncReminders } from "../../../lib/reminders";
import { useT, type Lang, ltr } from "../../../lib/i18n";
import { lockSupported, lockEnabled, setLockEnabled, biometricLabel, lockAfter, setLockAfter, LOCK_AFTER } from "../../../lib/lock";
import { DateAnswer } from "../../../components/wizard/answers";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListGroup, ListRow, Flag, Avatar, Text, Button, Icon, IconTile, SegmentedControl, PressScale, useTabInset, Surface, Chevron } from "../../../components/ui";
import { useAppearance, type AppearancePref } from "../../../lib/appearance";
import { useColors, S, R, ICON, AVATAR } from "../../../lib/theme";
import { supabase } from "../../../lib/supabase";
import { whatsapp, email as mailSupport } from "../../../lib/api";
import { useApps } from "../../../lib/useApps";
import { useUsageSharing } from "../../../lib/privacy";
import { lastCrash } from "../../../lib/crash";
import { startupHistory } from "../../../lib/perf";
import { pendingEvents } from "../../../lib/analytics";
import { SENTRY_ENABLED, sendTestError } from "../../../lib/sentry";
import Constants from "expo-constants";
import NetInfo from "@react-native-community/netinfo";
import { useForm } from "../../../lib/form";
import { onTabScroll } from "../../../lib/tabBarScroll";
import { iso } from "../../../lib/wizard";

export default function Account() {
  const c = useColors(); const pb = useTabInset(S.md as any) /* tab bar + safe area + 16 */; const insets = useSafeAreaInsets();
  const { session, unread, apps } = useApps(true); const { signOut: endSession } = useAuth();
  const photo = useAvatar(session?.user.id);
  const { pref, setPref } = useAppearance(); const { t, lang, setLang } = useT(); const { saveBeforeSignOut } = useForm();
  const [del, setDel] = useState(false); const [delStep, setDelStep] = useState<"ask" | "sure" | "failed">("ask"); const [delErr, setDelErr] = useState<string | null>(null); const [deleting, setDeleting] = useState(false);
  /** Calls the delete-account edge function with the user's own session; WhatsApp / email stay as the fallback. */
  const deleteNow = async () => {
    setDeleting(true); setDelErr(null);
    try {
      const { data, error } = await supabase!.functions.invoke("delete-account", { body: { confirm: "DELETE" } });
      if (error || !(data as any)?.deleted) throw new Error((data as any)?.error ?? error?.message ?? "Unknown error");
      setDel(false); await endSession().catch(() => {});
      Alert.alert(t("Account deleted"), t("Your account and personal data were deleted."));
    } catch {
      setDelStep("failed"); setDelErr(t("We couldn't delete the account right now. Send us the request and we'll do it within 30 days."));
    } finally { setDeleting(false); }
  }; const [after, setAfter] = useState(60000);
  useEffect(() => { lockAfter().then(setAfter); }, []);
  const [usage, setUsage] = useUsageSharing();
  /** Startup times and the last (scrubbed) error on this phone, for testing and support. */
  const diagnostics = async () => {
    const [st, cr, q] = await Promise.all([startupHistory(), lastCrash(), pendingEvents()]);
    const times = st.slice(-5).map((s) => `${s.native ?? s.js} ms`).join(", ") || "-";
    const u = session?.user;
    const test = () => { sendTestError([u?.user_metadata?.full_name as string | undefined, u?.email].filter(Boolean) as string[]); Alert.alert(t("Test error sent")); };
    Alert.alert(t("Diagnostics"), `${t("Startup")}: ${times}\n${t("Queued events")}: ${q}\n${t("Last error")}: ${cr ? `${new Date(cr.at).toLocaleString()} · ${cr.message}` : "-"}`,
      SENTRY_ENABLED && usage ? [{ text: t("Send test error"), onPress: test }, { text: "OK", style: "cancel" }] : undefined);
  };
  const [rem, setRem] = useState(false); const [remNote, setRemNote] = useState<string | null>(null);
  const [pp, setPp] = useState(""); const [ppOpen, setPpOpen] = useState(false); const [lock, setLock] = useState(false); const [bio, setBio] = useState<string | null>(null); const [lockNote, setLockNote] = useState<string | null>(null);
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
        <IconTile name="faceid" color={c.green} />
        <Text variant="body" style={{ flex: 1 }}>{t("Unlock with {m}", { m: t(bio ?? "Face ID") })}</Text>
        <Switch value={lock} disabled={!bio} onValueChange={toggleLock} trackColor={{ true: c.accentFill, false: c.fill }} thumbColor="#fff" accessibilityLabel={t("Unlock with {m}", { m: t(bio ?? "Face ID") })} />
      </View>
    {lock && (
        <View style={{ paddingHorizontal: S.md, paddingVertical: S.sm, gap: S.xs }}>
          <Text variant="footnote" tone="secondary">{t("Lock after")}</Text>
          <SegmentedControl label={t("Lock after")} value={String(after)} onChange={(v) => { setAfter(Number(v)); setLockAfter(Number(v)); }}
            options={LOCK_AFTER.map((ms) => ({ value: String(ms), label: ms === 0 ? t("Immediately") : t("{n} min", { n: ms / 60000 }) }))} />
        </View>
      )}
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
        <IconTile name="alarm.fill" color={c.orange} />
        <Text variant="body" style={{ flex: 1 }}>{t("Trip and passport reminders")}</Text>
        <Switch value={rem} disabled={!remindersSupported} onValueChange={toggleRem} trackColor={{ true: c.accentFill, false: c.fill }} thumbColor="#fff" accessibilityLabel={t("Trip and passport reminders")} />
      </View>
      {/* A row with the date; the wheel opens only when the row is tapped. */}
      <View testID="passport-expiry">
        <ListRow icon="calendar" iconColor={c.tint} title={t("Passport expiry")} subtitle={t("Kept on this phone")} chevron={false}
          value={pp ? new Date(pp + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : t("Not set")}
          onPress={() => setPpOpen((o) => !o)} a11yHint={ppOpen ? t("Closes the date picker") : t("Opens a date picker")} />
        {ppOpen && <View style={{ padding: S.sm }} testID="passport-expiry-picker">
          <DateAnswer label={t("Passport expiry")} value={pp} onChange={onPp} style="wheel" placeholder={t("Select date")} min={iso(new Date())} />
        </View>}
      </View>
      {!!remNote && Platform.OS !== "web" && <ListRow title={t("Open Settings")} tint chevron={false} onPress={() => Linking.openSettings()} />}
    </ListGroup>
  );
  const appearance = (
    <ListGroup header={t("Appearance")}>
      <View style={{ padding: S.sm }} testID="appearance">
        <SegmentedControl label={t("Appearance")} value={pref} onChange={(v) => setPref(v as AppearancePref)}
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
  const privacy = (
    <ListGroup header={t("Privacy")} footer={t("Anonymous app usage and crash reports. Never your name, passport or email.")}>
      <View style={{ minHeight: 52, paddingHorizontal: S.md, paddingVertical: S.xs, flexDirection: "row", alignItems: "center", gap: S.sm }} testID="usage-sharing">
        <Text variant="body" style={{ flex: 1 }}>{t("Share usage data")}</Text>
        <Switch value={usage} onValueChange={setUsage} trackColor={{ true: c.accentFill, false: c.fill }} thumbColor="#fff" accessibilityLabel={t("Share usage data")} />
      </View>
      <ListRow title={t("Version")} value={Constants.expoConfig?.version ?? ""} onLongPress={diagnostics} a11yHint={t("Long press for diagnostics")} />
    </ListGroup>
  );
  if (!session) return (
    <ScrollView onScroll={onTabScroll} scrollEventThrottle={16} style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text variant="largeTitle" accessibilityRole="header" style={{ marginHorizontal: S.lg, marginBottom: S.xxl }}>{t("Account")}</Text>
      <View style={{ alignItems: "center", paddingHorizontal: S.lg, marginBottom: S.xxl, gap: S.md }}>
        <View style={{ width: 88, height: 88, borderRadius: R.round, backgroundColor: c.fill, borderWidth: 1, borderColor: c.hairline, alignItems: "center", justifyContent: "center" }}><Icon name="person.fill" size={36} color={c.tertiaryLabel} /></View>
        <Text variant="title2" center>{t("Sign in to track your visa")}</Text>
        <View style={{ alignSelf: "stretch", gap: S.xs, marginTop: S.sm }}>
          <Button title={t("Sign in")} onPress={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} />
          <Button title={t("Create account")} variant="plain" color={c.label} onPress={() => router.push({ pathname: "/auth", params: { mode: "signup" } })} />
        </View>
      </View>
      {language}
      {reminders}
      {support}
      {privacy}
    </ScrollView>
  );
  const u = session.user;
  /** Profile photo: choose one from Photos, or remove it (kept on this phone, lib/avatar.ts). */
  const editPhoto = () => {
    const choose = () => { pickAvatar(u.id).catch((e) => { const m = t(e?.message ?? String(e)); if (Platform.OS === "web") window.alert(m); else Alert.alert(t("Couldn't load"), m); }); };
    if (!photo || Platform.OS === "web") { if (photo && Platform.OS === "web" && window.confirm(t("Remove photo?"))) { removeAvatar(); return; } choose(); return; }
    if (Platform.OS === "ios") { ActionSheetIOS.showActionSheetWithOptions({ options: [t("Choose photo"), t("Remove photo"), t("Cancel")], destructiveButtonIndex: 1, cancelButtonIndex: 2 }, (i) => { if (i === 0) choose(); if (i === 1) removeAvatar(); }); return; }
    Alert.alert(t("Profile photo"), undefined, [{ text: t("Choose photo"), onPress: choose }, { text: t("Remove photo"), style: "destructive", onPress: () => { removeAvatar(); } }, { text: t("Cancel"), style: "cancel" }]);
  };
  // Receipts need the amount Ziina actually recorded; a paid row without payment_amount gets no receipt.
  const paidApps = (apps ?? []).filter((a) => isPaid(a) && a.payment_amount != null);
  const full = (u.user_metadata?.full_name as string | undefined) ?? (u.email ?? "").split("@")[0];
  /** Ends this phone's session and wipes the person's data from it (lib/auth.tsx). Unsaved answers are saved first;
   *  what still couldn't be saved (offline) and unsent uploads are named before the wipe. */
  const signOut = async () => {
    const saved = await saveBeforeSignOut().catch(() => false);
    const n = pendingUploads();
    // This phone's push token is removed with the session (lib/auth.tsx); offline it stays until someone signs in here again.
    const offline = (await NetInfo.fetch().catch(() => null))?.isConnected === false;
    const note = [!saved && t("Your latest answers aren't saved to your account yet. Signing out removes them from this phone."),
      n ? t("{n} uploads haven't been sent yet. Signing out cancels them.", { n }) : saved && t("Your applications stay in your account."),
      offline && t("You're offline, so this phone may still get this account's notifications.")].filter(Boolean).join("\n\n");
    // Web (testing build): the same warning through the browser dialog, only when something would be lost.
    if (Platform.OS === "web") { if (saved || window.confirm(`${t("Sign out?")}\n\n${note}`)) endSession(); return; }
    Alert.alert(t("Sign out?"), note, [{ text: t("Cancel"), style: "cancel" }, { text: t("Sign out"), style: "destructive", onPress: () => { endSession(); } }]);
  };
  return (
    <ScrollView onScroll={onTabScroll} scrollEventThrottle={16} style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text variant="largeTitle" accessibilityRole="header" style={{ marginHorizontal: S.gutter, marginBottom: S.lg }}>{t("Account")}</Text>
      {/* Profile card: photo (tap to add, change or remove it), name and email; opens Account details. */}
      <View style={{ marginHorizontal: S.md, marginBottom: S.xxl }}>
        <PressScale onPress={() => { router.push("/account/details"); }} accessibilityRole="button" accessibilityLabel={t("Account details")} scaleTo={0.985} lift>
          <Surface level={1} style={{ padding: S.md, flexDirection: "row", alignItems: "center", gap: S.sm }}>
            <PressScale onPress={editPhoto} accessibilityRole="button" accessibilityLabel={photo ? t("Edit photo") : t("Add photo")} testID="avatar-edit">
              <Avatar name={full} size={AVATAR.lg} uri={photo} />
              <View style={{ position: "absolute", end: -2, bottom: -2, width: 22, height: 22, borderRadius: R.round, backgroundColor: c.accentFill, borderWidth: 2, borderColor: c.surfaceRaised, alignItems: "center", justifyContent: "center" }}>
                <Icon name={photo ? "pencil" : "plus"} size={ICON.xs} color={c.onAccent} weight="bold" />
              </View>
            </PressScale>
            <View style={{ flex: 1 }}>
              <Text variant="title3" numberOfLines={1}>{full}</Text>
              <Text variant="footnote" tone="secondary" numberOfLines={1}>{u.email}</Text>
            </View>
            <Chevron />
          </Surface>
        </PressScale>
      </View>
      <ListGroup header={t("Applications")} inset={58}>
        <ListRow icon="person.2.fill" iconColor={c.tint} title={t("Saved travellers")} onPress={() => router.push("/account/travellers")} />
        <ListRow icon="doc.text.fill" iconColor={c.tint} title={t("Application history")} value={apps?.length ? String(apps.length) : undefined} onPress={() => router.navigate("/applications")} />
      </ListGroup>
      {!!paidApps.length && (
        <ListGroup header={t("Receipts")} footer={t("From your payment record. Tap to save or share a PDF.")} inset={58}>
          {paidApps.map((a) => <ListRow key={a.id} icon="doc.text.fill" iconColor={c.green} title={`${t("Receipt")} · ${ltr(a.reference)}`} subtitle={t(a.countries?.name ?? a.destination_country ?? "")}
            value={`${Number(a.payment_amount).toFixed(0)} ${a.currency || "AED"}`} onPress={() => router.push(`/receipt/${a.id}`)} />)}
        </ListGroup>
      )}
      <ListGroup header={t("Preferences")} inset={58}>
        <ListRow icon="bell.fill" iconColor={c.tint} title={t("Notifications")} value={unread ? t("{n} new", { n: unread }) : undefined} onPress={() => router.push("/account/notifications")} />
      </ListGroup>
      {language}
      {security}
      {reminders}
      {support}
      {privacy}
      <ListGroup><ListRow title={t("Sign out")} destructive chevron={false} onPress={signOut} /></ListGroup>
      <ListGroup footer={t("Deleting removes your account and personal data. Records we must keep by law (payments) are kept for the legal period.")}>
        <ListRow title={t("Delete account")} destructive chevron={false} onPress={() => { setDelStep("ask"); setDelErr(null); setDel(true); }} />
      </ListGroup>
      <Modal visible={del} transparent animationType="fade" onRequestClose={() => setDel(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: S.lg }}>
          <View accessibilityViewIsModal style={{ backgroundColor: c.bg, borderRadius: R.card, padding: S.lg, gap: S.sm }} testID="delete-sheet">
            <Text variant="title3" accessibilityRole="header">{delStep === "sure" ? t("Are you sure?") : t("Delete your account?")}</Text>
            <Text variant="subhead" tone="secondary">{delStep === "sure" ? t("This permanently deletes your account, uploaded documents and personal details. It can't be undone.") : t("Your account, uploaded documents and personal details are removed. Payment records are kept as required by law.")}</Text>
            {!!delErr && <Text variant="footnote" tone="red" testID="delete-error">{delErr}</Text>}
            <View style={{ height: S.xs }} />
            {delStep === "ask" && <Button title={t("Continue")} variant="destructive" onPress={() => setDelStep("sure")} />}
            {delStep === "sure" && <Button title={deleting ? t("Deleting…") : t("Delete permanently")} variant="destructive" loading={deleting} disabled={deleting} onPress={deleteNow} />}
            {(delStep === "failed") && <>
              <Button title={t("Request by WhatsApp")} icon="logo.whatsapp" variant="secondary" onPress={() => { setDel(false); whatsapp(`Please delete my EZvisa account (${u.email}).`); }} />
              <Button title={t("Request by email")} icon="envelope.fill" variant="secondary" onPress={() => { setDel(false); Linking.openURL(`mailto:${EMAIL}?subject=${encodeURIComponent("Delete my EZvisa account")}&body=${encodeURIComponent(`Please delete my EZvisa account and personal data.\nAccount email: ${u.email}`)}`); }} />
            </>}
            <Button title={t("Cancel")} variant="plain" color={c.label} disabled={deleting} onPress={() => setDel(false)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

