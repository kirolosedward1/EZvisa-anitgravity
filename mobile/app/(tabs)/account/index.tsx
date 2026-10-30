// Account (canvas Account, DeleteAccount): profile card, Travel (saved travellers, application history, receipts), App
// (notifications, settings), Help (WhatsApp, email, legal pages), Sign out and Delete account. Phone preferences live in
// Settings (app/(tabs)/account/settings.tsx).
import { ActionSheetIOS, Alert, Linking, Platform, ScrollView, TextInput, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useAvatar, pickAvatar, removeAvatar } from "../../../lib/avatar";
import { isPaid } from "../../../lib/data";
import { useAuth } from "../../../lib/auth";
import { pendingUploads } from "../../../lib/uploads";
import { EMAIL, siteUrl } from "../../../lib/config";
import { useState } from "react";
import { useT, ltr } from "../../../lib/i18n";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Text, Icon, PressScale, useTabInset, Card, RowGroup, Row, PrimaryButton, SecondaryButton, SheetScaffold, InfoNote, Button } from "../../../components/ui";
import { useColors, S, R, T, ICON, AVATAR } from "../../../lib/theme";
import { supabase } from "../../../lib/supabase";
import { whatsapp, email as mailSupport } from "../../../lib/api";
import { useApps } from "../../../lib/useApps";
import NetInfo from "@react-native-community/netinfo";
import { useForm } from "../../../lib/form";
import { onTabScroll } from "../../../lib/tabBarScroll";
import { track } from "../../../lib/analytics";

export default function Account() {
  const c = useColors(); const pb = useTabInset(S.md as any) /* tab bar + safe area + 16 */; const insets = useSafeAreaInsets();
  const { session, unread, apps } = useApps(true); const { signOut: endSession } = useAuth();
  const photo = useAvatar(session?.user.id);
  const { t, lang } = useT(); const { saveBeforeSignOut } = useForm();
  const [receipts, setReceipts] = useState(false);
  const [del, setDel] = useState(false); const [typed, setTyped] = useState(""); const [delErr, setDelErr] = useState<string | null>(null); const [deleting, setDeleting] = useState(false); const [delFailed, setDelFailed] = useState(false);
  /** Calls the delete-account edge function with the user's own session; WhatsApp / email stay as the fallback. */
  const deleteNow = async () => {
    setDeleting(true); setDelErr(null);
    try {
      const { data, error } = await supabase!.functions.invoke("delete-account", { body: { confirm: "DELETE" } });
      if (error || !(data as any)?.deleted) throw new Error((data as any)?.error ?? error?.message ?? "Unknown error");
      setDel(false); await endSession().catch(() => {});
      Alert.alert(t("Account deleted"), t("Your account and personal data were deleted."));
    } catch {
      setDelFailed(true); setDelErr(t("We couldn't delete the account right now. Send us the request and we'll do it within 30 days."));
    } finally { setDeleting(false); }
  };
  const page = (path: string) => () => { WebBrowser.openBrowserAsync(siteUrl(path)).catch(() => Linking.openURL(siteUrl(path))); };
  const help = (
    <RowGroup header={t("Help")}>
      <Row label={t("WhatsApp support")} icon="logo.whatsapp" onPress={() => { track("whatsapp_handoff", { screen: "account" }); whatsapp(); }} testID="help-whatsapp" />
      <Row label={t("Email")} icon="envelope.fill" value={EMAIL} onPress={mailSupport} />
      <Row label={t("Privacy, terms, refunds")} icon="doc.text.fill" onPress={page("/refund-policy")} />
    </RowGroup>
  );
  if (!session) return (
    <ScrollView onScroll={onTabScroll} scrollEventThrottle={16} style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb, paddingHorizontal: S.gutter, gap: S.xl }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text variant="pageTitle" accessibilityRole="header">{t("Account")}</Text>
      <Card padded>
        <View style={{ alignItems: "center", gap: S.md }}>
          <View style={{ width: 72, height: 72, borderRadius: R.round, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}><Icon name="person.fill" size={30} color={c.accent} /></View>
          <Text variant="question" center>{t("Sign in to track your visa")}</Text>
          <View style={{ alignSelf: "stretch", gap: 10 }}>
            <PrimaryButton title={t("Sign in")} onPress={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} />
            <SecondaryButton title={t("Create account")} onPress={() => router.push({ pathname: "/auth", params: { mode: "signup" } })} />
          </View>
        </View>
      </Card>
      <RowGroup header={t("App")}><Row label={t("Settings")} sub={t("Language, reminders, appearance")} icon="gearshape.fill" onPress={() => router.push("/account/settings")} testID="account-settings" /></RowGroup>
      {help}
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
  // Receipts need the amount the payment gateway actually recorded; a paid row without payment_amount gets no receipt.
  const paidApps = (apps ?? []).filter((a) => isPaid(a) && a.payment_amount != null);
  const inProgress = (apps ?? []).filter((a) => isPaid(a) && !["completed", "rejected", "cancelled"].includes(a.status));
  const full = (u.user_metadata?.full_name as string | undefined) ?? (u.email ?? "").split("@")[0];
  const since = u.created_at ? new Date(u.created_at).toLocaleDateString(lang === "ar" ? "ar-u-nu-latn" : "en-GB", { month: "short", year: "numeric" }) : "";
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
    <ScrollView onScroll={onTabScroll} scrollEventThrottle={16} style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb, paddingHorizontal: S.gutter, gap: S.xl }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text variant="pageTitle" accessibilityRole="header">{t("Account")}</Text>
      {/* Profile card: photo (tap to add, change or remove it), name, email and member since; opens Account details. */}
      <Card padded>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
          <PressScale onPress={editPhoto} accessibilityRole="button" accessibilityLabel={photo ? t("Edit photo") : t("Add photo")} testID="avatar-edit">
            <Avatar name={full} size={AVATAR.lg} uri={photo} />
            <View style={{ position: "absolute", end: -2, bottom: -2, width: 22, height: 22, borderRadius: R.round, backgroundColor: c.accentFill, borderWidth: 2, borderColor: c.surfaceRaised, alignItems: "center", justifyContent: "center" }}>
              <Icon name={photo ? "pencil" : "plus"} size={ICON.xs} color={c.onAccent} weight="bold" />
            </View>
          </PressScale>
          <PressScale onPress={() => { router.push("/account/details"); }} accessibilityRole="button" accessibilityLabel={t("Account details")} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: S.sm, minHeight: 44 }} testID="account-details">
            <View style={{ flex: 1 }}>
              <Text variant="headline" numberOfLines={1}>{full}</Text>
              <Text variant="note" tone="secondary" numberOfLines={2}>{[u.email, since && t("member since {d}", { d: since })].filter(Boolean).join(" · ")}</Text>
            </View>
            <Icon name="chevron.right" size={14} color={c.textSecondary} />
          </PressScale>
        </View>
      </Card>
      <RowGroup header={t("Travel")}>
        <Row label={t("Saved travellers")} icon="person.2.fill" onPress={() => router.push("/account/travellers")} testID="account-travellers" />
        <Row label={t("Application history")} icon="doc.text.fill" value={apps?.length ? String(apps.length) : undefined} onPress={() => router.navigate("/applications")} />
        {!!paidApps.length && <Row label={t("Receipts")} icon="creditcard.fill" value={String(paidApps.length)} onPress={() => setReceipts((v) => !v)} testID="account-receipts" />}
        {receipts && paidApps.map((a) => <Row key={a.id} label={`${t("Receipt")} · ${t(a.countries?.name ?? a.destination_country ?? "")}`} sub={ltr(a.reference)} icon="creditcard.fill"
          value={`${Number(a.payment_amount).toFixed(0)} ${a.currency || "AED"}`} onPress={() => router.push(`/receipt/${a.id}`)} />)}
      </RowGroup>
      <RowGroup header={t("App")}>
        <Row label={t("Notifications")} icon="bell.fill" value={unread ? t("{n} new", { n: unread }) : undefined} onPress={() => router.push("/account/notifications")} testID="account-notifications" />
        <Row label={t("Settings")} sub={t("Language, Face ID, reminders")} icon="gearshape.fill" onPress={() => router.push("/account/settings")} testID="account-settings" />
      </RowGroup>
      {help}
      <RowGroup>
        <Row label={t("Sign out")} destructive onPress={signOut} testID="sign-out" />
        <Row label={t("Delete account")} destructive onPress={() => { setTyped(""); setDelErr(null); setDelFailed(false); setDel(true); }} testID="delete-account" />
      </RowGroup>
      <SheetScaffold visible={del} onClose={() => !deleting && setDel(false)} pose="puzzled" title={t("Delete your EZvisa account?")} testID="delete-sheet"
        line={t("Your sign-in, saved travellers and uploaded documents are deleted within 30 days. Payment records are kept as the law requires.")}
        actions={delFailed ? <>
          <SecondaryButton whatsapp title={t("Request by WhatsApp")} onPress={() => { setDel(false); whatsapp(`Please delete my EZvisa account (${u.email}).`); }} />
          <SecondaryButton title={t("Request by email")} onPress={() => { setDel(false); Linking.openURL(`mailto:${EMAIL}?subject=${encodeURIComponent("Delete my EZvisa account")}&body=${encodeURIComponent(`Please delete my EZvisa account and personal data.\nAccount email: ${u.email}`)}`); }} />
        </> : <>
          <Button title={deleting ? t("Deleting…") : t("Delete permanently")} variant="destructive" loading={deleting} disabled={deleting || typed.trim().toUpperCase() !== "DELETE"} onPress={deleteNow} />
          <SecondaryButton title={t("Cancel")} onPress={() => setDel(false)} />
        </>}>
        {inProgress.length > 0 && <InfoNote tone="info" text={t("Paid applications in progress continue, and you keep the file by email. In progress: {list}.", { list: inProgress.map((a) => t(a.countries?.name ?? a.destination_country ?? "")).join(", ") })} />}
        {!delFailed && (
          <View style={{ gap: S.xs }}>
            <Text variant="note" weight="600" tone="secondary">{t("Type DELETE to confirm")}</Text>
            <TextInput value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} placeholder="DELETE" placeholderTextColor={c.textSecondary} accessibilityLabel={t("Type DELETE to confirm")} testID="delete-confirm"
              style={[T.body, { color: c.label, minHeight: 52, borderRadius: R.input, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: S.md }]} />
          </View>
        )}
        {!!delErr && <Text variant="footnote" tone="red" testID="delete-error">{delErr}</Text>}
      </SheetScaffold>
    </ScrollView>
  );
}
