import { Alert, Linking, Modal, Platform, ScrollView, Switch, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { STATUS_LABEL, isPaid, unregisterPushToken, type Application } from "../../../lib/data";
import { wipeLocalData, restartApp } from "../../../lib/account";
import { EMAIL } from "../../../lib/config";
import { useEffect, useState } from "react";
import { remindersEnabled, remindersSupported, setRemindersEnabled, planReminders, getPassportExpiry, setPassportExpiry, syncReminders } from "../../../lib/reminders";
import { useT, ltr, type Lang } from "../../../lib/i18n";
import { lockSupported, lockEnabled, setLockEnabled, biometricLabel, lockAfter, setLockAfter, LOCK_AFTER } from "../../../lib/lock";
import { DateAnswer } from "../../../components/wizard/answers";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListGroup, ListRow, Flag, Avatar, Text, Button, Icon, SegmentedControl, useTabInset } from "../../../components/ui";
import { useAppearance, type AppearancePref } from "../../../lib/appearance";
import { useColors, S, R } from "../../../lib/theme";
import { supabase } from "../../../lib/supabase";
import { whatsapp, email as mailSupport, appTag, paymentIntent, PAYMENT_IN_FLIGHT } from "../../../lib/api";
import { useApps, ACTIVE } from "../../../lib/useApps";

export default function Account() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets();
  const { session, unread, apps, allApps } = useApps(true);
  const { pref, setPref } = useAppearance(); const { t, lang, setLang } = useT();
  const [del, setDel] = useState(false); const [delStep, setDelStep] = useState<"ask" | "checking" | "pending" | "sure" | "failed">("ask"); const [delErr, setDelErr] = useState<string | null>(null); const [deleting, setDeleting] = useState(false);
  const [inFlight, setInFlight] = useState<Application | null>(null);
  /** Before deleting: refuse while a Ziina payment may still complete, otherwise it would land on an anonymised row.
   *  Ziina is asked live; if it can't be reached, a payment link opened in the last 2 hours counts as in flight. */
  const checkPayments = async () => {
    setDelStep("checking"); setDelErr(null);
    const open = (allApps ?? []).filter((a) => a.payment_id && !isPaid(a) && a.status !== "cancelled");
    for (const a of open) {
      const pi = await paymentIntent(a.payment_id!);
      const recent = Date.now() - new Date(a.updated_at ?? a.created_at ?? 0).getTime() < 2 * 3600_000;
      if (pi ? PAYMENT_IN_FLIGHT.includes(pi.status) || pi.status === "completed" : recent) { setInFlight(a); setDelStep("pending"); return; }
    }
    setDelStep("sure");
  };
  /** Paid applications we are still working on: deleting stops that work, so the last step names them. */
  const inService = (allApps ?? []).filter((a) => isPaid(a) && ACTIVE(a.status));
  /** Calls the delete-account edge function with the user's own session; WhatsApp / email stay as the fallback. */
  const deleteNow = async () => {
    setDeleting(true); setDelErr(null);
    try {
      const { data, error } = await supabase!.functions.invoke("delete-account", { body: { confirm: "DELETE" } });
      const res: Response | undefined = (error as any)?.context;
      if (res?.status === 409) { // server-side payment check (proposed v2 of the function)
        const j: any = await res.json().catch(() => ({}));
        setInFlight((allApps ?? []).find((a) => a.id === j?.application_id) ?? null); setDelStep("pending"); return;
      }
      if (error || !(data as any)?.deleted) throw new Error((data as any)?.error ?? error?.message ?? "Unknown error");
      setDel(false); await wipeLocalData(); await supabase!.auth.signOut().catch(() => {});
      Alert.alert(t("Account deleted"), t("Your account and personal data were deleted."), [{ text: t("OK"), onPress: () => { restartApp(); } }]);
    } catch {
      setDelStep("failed"); setDelErr(t("We couldn't delete the account right now. Send us the request and we'll do it within 30 days."));
    } finally { setDeleting(false); }
  }; const [after, setAfter] = useState(60000);
  useEffect(() => { lockAfter().then(setAfter); }, []);
  const [rem, setRem] = useState(false); const [remNote, setRemNote] = useState<string | null>(null);
  const [pp, setPp] = useState(""); const [lock, setLock] = useState(false); const [bio, setBio] = useState<string | null>(null); const [lockNote, setLockNote] = useState<string | null>(null);
  useEffect(() => { remindersEnabled().then(setRem); getPassportExpiry().then(setPp); lockEnabled().then(setLock); biometricLabel().then(setBio); }, []);
  const onPp = async (v: string) => { setPp(v); await setPassportExpiry(v); if (apps) syncReminders(apps); };
  const toggleLock = async (on: boolean) => {
    setLockNote(null);
    const r = await setLockEnabled(on, t("Turn on {m} for EZvisa", { m: t(bio ?? "Face ID") }), { fallback: t("Use passcode"), cancel: t("Cancel") }); setLock(r);
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
    <ListGroup header={t("Security")} footer={lockNote ?? (bio ? `${t("Ask for {m} when you open the app.", { m: t(bio) })} ${t("The app switcher shows a blank screen while the lock is on.")}` : t("No Face ID, Touch ID or passcode is set up on this device."))}>
      <View style={{ minHeight: 52, paddingHorizontal: S.md, paddingVertical: S.xs, flexDirection: "row", alignItems: "center", gap: S.sm }} testID="faceid">
        <Icon name={bio === "Passcode" ? "lock.fill" : "faceid"} size={20} color={c.green} />
        <Text variant="body" style={{ flex: 1 }}>{t("Unlock with {m}", { m: t(bio ?? "Face ID") })}</Text>
        <Switch value={lock} disabled={!bio} onValueChange={toggleLock} trackColor={{ true: c.green, false: c.fill }} accessibilityLabel={t("Unlock with {m}", { m: t(bio ?? "Face ID") })} />
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
    setRemNote(r.denied ? t("Notifications are off for EZvisa. Turn them on in Settings.") : null);
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
  // Support from Account names the latest active application (reference + id) so the team can open it straight away.
  const current = (apps ?? []).find((a) => ACTIVE(a.status) && a.status !== "draft") ?? (apps ?? [])[0];
  const support = (
    <ListGroup header={t("Support")} footer={current ? t("Your message includes {r} so we can find your application.", { r: ltr(current.reference) }) : undefined} inset={58}>
      <ListRow icon="logo.whatsapp" iconColor={c.whatsapp} title="WhatsApp" onPress={() => whatsapp(current ? `Hi EZvisa, I need help with application ${appTag(current)}.` : undefined)} />
      <ListRow icon="envelope.fill" iconColor={c.tint} title={t("Email")} onPress={mailSupport} />
    </ListGroup>
  );
  if (!session) return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text variant="largeTitle" accessibilityRole="header" style={{ marginHorizontal: S.lg, marginBottom: S.xxl }}>{t("Account")}</Text>
      <View style={{ alignItems: "center", paddingHorizontal: S.lg, marginBottom: S.xxl, gap: S.md }}>
        <View style={{ width: 88, height: 88, borderRadius: R.round, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><Icon name="person.fill" size={36} color={c.tertiaryLabel} /></View>
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
  const u = session.user; const provider = (u.app_metadata?.provider as string | undefined) ?? "email";
  const paidApps = (apps ?? []).filter((a) => isPaid(a));
  const full = (u.user_metadata?.full_name as string | undefined) ?? (u.email ?? "").split("@")[0];
  const signOut = () => {
    if (Platform.OS === "web") { supabase?.auth.signOut(); return; }
    const out = () => unregisterPushToken().finally(() => supabase?.auth.signOut());
    Alert.alert(t("Sign out?"), undefined, [{ text: t("Cancel"), style: "cancel" }, { text: t("Sign out"), style: "destructive", onPress: out }]);
  };
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ alignItems: "center", gap: S.xs, marginBottom: S.xxl }} accessible accessibilityLabel={`${full}, ${u.email}`}>
        <Avatar name={full} size={88} />
        <Text variant="title1" style={{ marginTop: S.sm }}>{full}</Text>
        <Text variant="subhead" tone="secondary">{ltr(u.email ?? "")}</Text>
      </View>
      <ListGroup header={t("Account details")} inset={16}>
        <ListRow title={t("Name")} value={full} />
        <ListRow title={t("Email")} value={ltr(u.email ?? "")} />
        <ListRow title={t("Sign-in method")} value={t(provider === "google" ? "Google" : provider === "apple" ? "Apple" : "Email")} />
        {!!u.created_at && <ListRow title={t("Member since")} value={new Date(u.created_at).toLocaleDateString(lang === "ar" ? "ar-AE" : undefined, { month: "long", year: "numeric" })} />}
      </ListGroup>
      {!!apps?.length && (
        <ListGroup header={t("Application history")} inset={S.md + 28 + S.md}>
          {apps.map((a) => <ListRow key={a.id} leading={<Flag country={a.countries?.name ?? a.destination_country ?? ""} size={28} />} title={t(a.countries?.name ?? a.destination_country ?? "Application")}
            subtitle={`${ltr(a.reference)} · ${t(STATUS_LABEL[a.status] ?? a.status)}`} minHeight={56} onPress={() => router.push(`/applications/${a.id}`, { withAnchor: true })} />)}
        </ListGroup>
      )}
      {!!paidApps.length && (
        <ListGroup header={t("Receipts")} footer={t("Built from your Ziina payment, or our payment record if Ziina can't be reached. Tap to save or share a PDF.")} inset={58}>
          {paidApps.map((a) => <ListRow key={a.id} icon="doc.text.fill" iconColor={c.green} title={`${t("Receipt")} · ${ltr(a.reference)}`} subtitle={t(a.countries?.name ?? a.destination_country ?? "")}
            value={a.payment_amount != null ? ltr(`${Number(a.payment_amount).toFixed(0)} ${a.currency || "AED"}`) : undefined} onPress={() => shareReceipt(a, full, u.email ?? "", t, lang)} />)}
        </ListGroup>
      )}
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
      <ListGroup footer={t("Deleting removes your account and personal data. Records we must keep by law (payments) are kept for the legal period.")}>
        <ListRow title={t("Delete account")} destructive chevron={false} onPress={() => { setDelStep("ask"); setDelErr(null); setDel(true); }} />
      </ListGroup>
      <Modal visible={del} transparent animationType="fade" onRequestClose={() => setDel(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: S.lg }}>
          <View accessibilityViewIsModal style={{ backgroundColor: c.bg, borderRadius: R.card, padding: S.lg, gap: S.sm }} testID="delete-sheet">
            <Text variant="title3" accessibilityRole="header">{delStep === "sure" ? t("Are you sure?") : delStep === "pending" ? t("A payment is still in progress") : t("Delete your account?")}</Text>
            <Text variant="subhead" tone="secondary">{delStep === "sure" ? t("This permanently deletes your account, uploaded documents and personal details. It can't be undone.")
              : delStep === "pending" ? t("The payment for {r} hasn't finished yet. Try again once it has, or message us and we'll sort it out.", { r: inFlight ? ltr(inFlight.reference) : t("one of your applications") })
              : t("Your account, uploaded documents and personal details are removed. Payment records are kept as required by law.")}</Text>
            {delStep === "sure" && !!inService.length && <Text variant="subhead" tone="secondary" testID="delete-in-service">{t("We are still working on {r}. Deleting stops that work and removes its documents.", { r: inService.map((a) => ltr(a.reference)).join(", ") })}</Text>}
            {!!delErr && <Text variant="footnote" tone="red" testID="delete-error">{delErr}</Text>}
            <View style={{ height: S.xs }} />
            {(delStep === "ask" || delStep === "checking") && <Button title={t("Continue")} variant="destructive" loading={delStep === "checking"} disabled={delStep === "checking"} onPress={checkPayments} />}
            {delStep === "pending" && <Button title="WhatsApp" icon="logo.whatsapp" variant="secondary" onPress={() => { setDel(false); whatsapp(`Hi EZvisa, I want to delete my account but the payment for application ${inFlight ? appTag(inFlight) : ""} is still in progress.`); }} />}
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

const esc = (x: string) => x.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
type TFn = (s: string, v?: Record<string, string | number>) => string;
/** Receipt built only from real payment data: the Ziina payment intent when Ziina confirms it completed, otherwise the
 *  amount the Ziina webhook stored on the application. With neither, no receipt is made (nothing is computed or guessed). */
async function shareReceipt(a: Application, name: string, mail: string, t: TFn, lang: Lang) {
  const pi = a.payment_id ? await paymentIntent(a.payment_id) : null;
  const ziina = pi && pi.status === "completed" && pi.amount != null ? pi : null;
  const amount = ziina ? ziina.amount! / 100 : a.payment_amount != null ? Number(a.payment_amount) : null;
  if (amount == null) {
    Alert.alert(t("Receipt not available yet"), t("We couldn't confirm the amount of this payment. Message us and we'll send your receipt."), [
      { text: t("Cancel"), style: "cancel" }, { text: "WhatsApp", onPress: () => whatsapp(`Hi EZvisa, please send the receipt for application ${appTag(a)}.`) }]);
    return;
  }
  const currency = (ziina?.currency ?? a.currency) || "AED"; const loc = lang === "ar" ? "ar-AE" : "en-GB";
  const L = (v: string) => `<span dir="ltr">${esc(v)}</span>`; // Latin values stay left-to-right in the Arabic receipt
  const rows: [string, string][] = [
    [t("Reference"), L(a.reference)], [t("Application ID"), L(a.id)], [t("Destination"), esc(t(a.countries?.name ?? a.destination_country ?? ""))],
    [t("Customer"), esc(name)], [t("Email"), L(mail)], [t("Amount paid"), L(`${amount.toFixed(2)} ${currency}`)], [t("Payment status"), esc(t("Paid"))],
    ...(a.payment_id ? [[t("Ziina payment ID"), L(a.payment_id)] as [string, string]] : []),
    ...(ziina?.created_at ? [[t("Payment date"), esc(new Date(ziina.created_at).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" }))] as [string, string]] : []),
    [t("Source"), esc(ziina ? t("Ziina payment record") : t("EZvisa payment record"))],
  ];
  const dir = lang === "ar" ? "rtl" : "ltr"; const end = lang === "ar" ? "left" : "right";
  const html = `<html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"></head><body style="font-family:-apple-system,'Geeza Pro',Helvetica,sans-serif;padding:32px"><h1 style="margin:0">EZvisa</h1><p style="color:#666">${esc(t("Payment receipt"))} · www.ezvisa.net</p>
    <table style="width:100%;border-collapse:collapse;margin-top:24px">${rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">${esc(k)}</td><td style="padding:8px 0;text-align:${end};border-bottom:1px solid #eee">${v}</td></tr>`).join("")}</table>
    <p style="color:#666;margin-top:24px;font-size:12px">${esc(t("Embassy and VFS fees are not included and are paid at the appointment."))}</p></body></html>`;
  try {
    if (Platform.OS === "web") { await Print.printAsync({ html }); return; }
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: `${t("Receipt")} ${a.reference}` });
  } catch (e: any) { Alert.alert(t("Couldn't create the receipt"), e?.message ?? String(e)); }
}
