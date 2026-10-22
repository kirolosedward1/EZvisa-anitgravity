import { AppointmentCard } from "../../../components/Appointment";
import { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Platform, ActionSheetIOS, RefreshControl, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTabInset, Button, ListGroup, ListRow, EmptyState, Flag, StatusPill, Timeline, ProgressBar, IconTile, Skeleton, InlineError, Text, ChipGroup } from "../../../components/ui";
import { useColors, S, R } from "../../../lib/theme";
import { isPaid, getApplication, listRequirements, openDocumentUrl, Application, Requirement, DOC_TYPES, STATUS_LABEL, UPLOAD_STATUSES, needsContinue } from "../../../lib/data";
import { retryUpload, removeUpload, clearDone, useUploads, type UploadJob } from "../../../lib/uploads";
import { buildChecklist, isOpen, type CheckItem } from "../../../lib/checklist";
import { SupportButton } from "../../../components/Support";
import { whatsapp } from "../../../lib/api";
import { intentStatus, knownPayment, money, startPayment, usePaying, useQuote } from "../../../lib/payments";
import { Linking } from "react-native";
import { success, error as hError } from "../../../lib/haptics";
import { chooseSource, pickFrom, validateFile } from "../../../lib/capture";
import { useT } from "../../../lib/i18n";
import { router } from "expo-router";
import { countdown } from "../../../lib/countdown";
import { askDiscard, discardApplication, isAbandoned } from "../../../lib/discard";
import { Pressable } from "react-native";
import { Icon } from "../../../components/ui";

let LOC: string | undefined;
const fmtD = (s?: string | null) => (s ? new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString(LOC, { day: "numeric", month: "short", year: "numeric" }) : "—");
const EDITABLE = UPLOAD_STATUSES;
const REFRESH_MS = 30_000;

export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors(); const pb = useTabInset(); const { t, lang } = useT(); LOC = lang === "ar" ? "ar" : undefined;
  const [a, setA] = useState<Application | null>(null); const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [upErr, setUpErr] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [reqs, setReqs] = useState<Requirement[] | null>(null);
  /** quiet = background refresh: a failure keeps what is on screen instead of replacing it with an error. */
  const load = useCallback(async (quiet = false) => {
    try {
      const app = await getApplication(id!); setA(app); setErr(null);
      listRequirements(app.country_id, (app.notes?.wizard as any)?.employmentStatus).then(setReqs).catch(() => setReqs([]));
    } catch (e: any) { if (!quiet) setErr(e?.message ?? String(e)); }
  }, [id]);
  // Staff can change statuses on the website while this screen is open: refresh every 30 s while it is visible and
  // the app is in the foreground, and right away when the app comes back. (No realtime: that needs a DB change.)
  useFocusEffect(useCallback(() => {
    load();
    const tick = setInterval(() => { if (AppState.currentState === "active") load(true); }, REFRESH_MS);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") load(true); });
    return () => { clearInterval(tick); sub.remove(); };
  }, [load]));
  const onDone = useCallback(() => { success(); load(true); }, [load]);
  const queue = useUploads(id, onDone);

  /** Pick → reject wrong types here with a clear message → crop/compress and confirm on the preview screen → queue. */
  const pickFile = async (docType: string, requirementId?: string) => {
    setPicking(false); setUpErr(null);
    try {
      const src = await chooseSource(lang); if (!src) return;
      const f = await pickFrom(src, lang); if (!f) return;
      const v = await validateFile(f, lang);
      if ("error" in v) { hError(); setUpErr(v.error); return; }
      const title = reqs?.find((r) => r.document_type === docType)?.title ?? DOC_TYPES.find((d) => d.value === docType)?.label ?? "Document";
      router.push({ pathname: "/upload/[id]", params: { id: id!, docType, reqId: requirementId ?? "", title, source: src, uri: f.uri, name: f.name, mimeType: f.mimeType ?? "", size: f.size != null ? String(f.size) : "", width: f.width ? String(f.width) : "", height: f.height ? String(f.height) : "" } });
    } catch (e: any) { hError(); setUpErr(e?.message ?? String(e)); }
  };
  const addDocument = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ title: "Document type", options: [...DOC_TYPES.map((d) => d.label), "Cancel"], cancelButtonIndex: DOC_TYPES.length }, (i) => { if (i < DOC_TYPES.length) pickFile(DOC_TYPES[i].value); });
    } else setPicking(!picking);
  };
  const open = async (path: string) => {
    try { const url = path ? await openDocumentUrl(path) : null; if (url) await WebBrowser.openBrowserAsync(url); else Alert.alert(t("Stored securely"), t("Your file was received and is stored privately with EZvisa. Our team reviews it; you'll be contacted if anything needs replacing.")); }
    catch (e: any) { Alert.alert(t("Can't open file"), e?.message); }
  };
  const paying = usePaying(); const [ziina, setZiina] = useState<string | null>(null);
  const unpaid = !!a && !isPaid(a);
  const quote = useQuote(unpaid ? a!.id : null, a?.updated_at);
  // Ziina status of the checkout this device opened (server proxy), so a paid-but-not-yet-recorded payment shows as confirming.
  useEffect(() => { let on = true; if (unpaid) knownPayment(a!.id).then((p) => p && intentStatus(p.paymentId)).then((s) => on && setZiina(s ?? null)).catch(() => {}); return () => { on = false; }; }, [a?.id, a?.payment_status]);
  const pay = async () => {
    if (!a || paying) return; setUpErr(null);
    try { const o = await startPayment(a.id); router.push({ pathname: "/payment/[id]", params: { id: a.id, returned: o.returned } }); }
    catch (e: any) {
      if (e?.busy) return;
      if (e?.alreadyPaid) { router.push({ pathname: "/payment/[id]", params: { id: a.id, returned: "success" } }); return; }
      hError();
      if (e?.fallbackWhatsApp) Alert.alert("Payment", e.message, [{ text: "Cancel", style: "cancel" }, { text: "WhatsApp", onPress: () => whatsapp(`Hi EZvisa, I'd like to pay for application ${a.reference}.`) }]);
      else setUpErr(e?.message ?? String(e));
    }
  };

  if (err) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center" }}><Stack.Screen options={{ title: "", headerLargeTitle: false, headerTransparent: false, headerStyle: { backgroundColor: c.bg }, headerRight: () => <SupportButton header context="an application" /> }} /><EmptyState icon="exclamationmark.triangle.fill" title={t("Couldn't load")} message={err} action={<Button title="Retry" variant="secondary" onPress={() => load()} />} /></View>;
  if (!a) return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: S.lg, gap: S.md }}>
      <Stack.Screen options={{ title: "", headerLargeTitle: false, headerTransparent: false, headerStyle: { backgroundColor: c.bg } }} />
      {/* Mirrors the real layout: hero, Status timeline (4 steps), Trip group */}
      <View accessible accessibilityLabel={t("Loading")} style={{ gap: S.md }} testID="detail-skeleton">
        <Skeleton w={72} h={72} r={R.round} /><Skeleton w="55%" h={34} r={R.md} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Skeleton w="35%" h={16} /><Skeleton w={84} h={22} r={R.sm} /></View>
        <Skeleton w={90} h={20} style={{ marginTop: S.lg }} />
        <View style={{ borderRadius: R.card, padding: S.md, gap: S.lg, backgroundColor: c.card }}>{[0, 1, 2, 3].map((i) => <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}><Skeleton w={14} h={14} r={R.round} /><Skeleton w={`${60 - i * 8}%` as `${number}%`} h={16} /></View>)}</View>
        <Skeleton w={60} h={20} style={{ marginTop: S.lg }} />
        <View style={{ borderRadius: R.card, padding: S.md, gap: S.lg, backgroundColor: c.card }}>{[0, 1, 2].map((i) => <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}><Skeleton w="25%" h={16} /><Skeleton w="40%" h={16} /></View>)}</View>
      </View>
    </ScrollView>
  );
  const docs = [...a.documents].sort((x, y) => y.created_at.localeCompare(x.created_at));
  const list = reqs ? buildChecklist(reqs, a.documents, a.status) : null;
  const matched = new Set((list ? [...list.customer, ...list.ezvisa] : []).map((i) => i.doc?.id).filter(Boolean));
  const others = docs.filter((d) => !matched.has(d.id));
  const done = list ? list.customer.filter((i) => !isOpen(i)).length : 0;
  const busyType = (t: string) => queue.some((j) => j.documentType === t && (j.state === "queued" || j.state === "uploading"));
  const paid = isPaid(a); const locked = a.status !== "draft" && !paid;
  const canUpload = paid && EDITABLE.includes(a.status);
  const name = a.countries?.name ?? "Application";
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: pb }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.tint} />}>
      <Stack.Screen options={{ title: "", headerLargeTitle: false, headerTransparent: false, headerStyle: { backgroundColor: c.bg }, headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>
          {isAbandoned(a) && <Pressable onPress={() => askDiscard(() => { discardApplication(a).then(() => (router.canGoBack() ? router.back() : router.replace("/applications"))).catch((e) => setUpErr(e?.message ?? String(e))); }, t)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Discard")} testID="detail-discard" style={{ minWidth: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={20} color={c.red} /></Pressable>}
          <SupportButton header context={`application ${a.reference}`} />
        </View>) }} />
      <View style={{ marginHorizontal: S.lg, marginTop: S.xs, marginBottom: S.xxl, gap: S.xs }}>
        <Flag country={name} size={72} />
        <Text variant="largeTitle" style={{ marginTop: S.sm }} accessibilityRole="header">{t(name)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="subhead" tone="secondary" tabular>{a.reference}</Text>
          <StatusPill v={a.status} />
        </View>
      </View>
      <ListGroup header={t("Status")}><Timeline a={a} t={t} /></ListGroup>
      {locked && (
        <ListGroup header={t("Next step")} footer={t("Documents unlock after payment.")} inset={58}>
          {ziina === "completed" || ziina === "pending"
            ? <ListRow icon="clock.fill" iconColor={c.tint} title={ziina === "completed" ? t("Payment received") : t("Payment processing")} subtitle={t("Updating your application…")} onPress={() => router.push({ pathname: "/payment/[id]", params: { id: a.id, returned: "success" } })} />
            : <ListRow icon="creditcard.fill" iconColor={c.green} title={paying ? t("Opening secure payment…") : quote ? t("Pay {amount}", { amount: money(quote) }) : t("Pay securely")} subtitle={a.payment_status === "failed" ? t("The last payment didn't go through.") : t("Card, Apple Pay or Google Pay via Ziina")} onPress={paying ? undefined : pay} />}
        </ListGroup>
      )}
      {needsContinue(a) && (
        <ListGroup header={t("Next step")} footer={t("Then upload your documents below.")} inset={58}>
          <ListRow icon="briefcase.fill" iconColor={c.tint} title={t("Continue application")} subtitle={t("Add your passport number and employment details.")} onPress={() => router.push(`/continue/${a.id}`)} />
        </ListGroup>
      )}
      <ListGroup header={t("Trip")} inset={16}>
        <ListRow title={t("Traveller")} value={a.full_name} />
        <ListRow title={t("Dates")} value={`${fmtD(a.entry_date)} – ${fmtD(a.exit_date)}`} />
        {(a.total_amount != null || quote) && <ListRow title={t("Total")} value={a.total_amount != null ? money({ amount: a.total_amount, currency: a.currency }) : money(quote)} />}
        {countdown(a.entry_date, a.exit_date, t) && <ListRow title={t("Countdown")} value={countdown(a.entry_date, a.exit_date, t)!} />}
        <ListRow icon="logo.whatsapp" iconColor={c.whatsapp} title={t("Ask about this application")} subtitle={a.reference} onPress={() => whatsapp(`Hi EZvisa, I have a question about application ${a.reference} (${name}).`)} />
        {a.status !== "cancelled" && <ListRow icon="map.fill" iconColor={c.indigo} title={t("Trip plan")} subtitle={t("Ideas, not bookings")} onPress={() => router.push(`/trip/${a.id}`)} />}
      </ListGroup>
      <AppointmentCard a={a} />
      {locked ? (
        <ListGroup header={t("Documents")} inset={58}><ListRow icon="lock.fill" iconColor={c.grey} title={t("Upload documents")} subtitle={t("Available after payment")} chevron={false} /></ListGroup>
      ) : list ? (<>
        <ListGroup header={t("Your documents · {i} of {n}", { i: done, n: list.customer.length })} footer={canUpload ? t("PDF or image · max 5 MB. Tap a missing item to upload it.") : undefined} inset={58}>
          <View style={{ paddingHorizontal: S.md, paddingVertical: S.sm }} accessible accessibilityLabel={`${done} of ${list.customer.length} documents provided`}>
            <View style={{ height: 6, borderRadius: R.xs, backgroundColor: c.fill, overflow: "hidden" }}><View style={{ height: 6, borderRadius: R.xs, width: `${list.customer.length ? (100 * done) / list.customer.length : 0}%`, backgroundColor: done === list.customer.length ? c.green : c.tintFill }} /></View>
          </View>
          {list.customer.map((i) => <CheckRow key={i.req.id} i={i} busy={busyType(i.req.document_type)} canUpload={canUpload}
            onPress={() => (isOpen(i) ? (canUpload ? pickFile(i.req.document_type, i.req.id) : undefined) : i.doc && open(i.doc.storage_path))} />)}
        </ListGroup>
        {!!list.ezvisa.length && (
          <ListGroup header={t("We prepare these")} inset={58}>
            {list.ezvisa.map((i) => <CheckRow key={i.req.id} i={i} busy={false} canUpload={false} onPress={i.doc ? () => open(i.doc!.storage_path) : undefined} />)}
          </ListGroup>
        )}
      </>) : <View style={{ marginHorizontal: S.lg, marginBottom: S.xl }}><Skeleton h={120} r={R.card} /></View>}
      {!locked && !!queue.length && (
        <ListGroup header={t("Uploads")} action={queue.some((j) => j.state === "done") ? t("Clear") : undefined} onAction={() => clearDone(a.id)}
          footer={queue.some((j) => j.state === "queued") ? t("Queued uploads continue automatically when you're online.") : undefined} inset={58}>
          {queue.map((j) => <UploadRow key={j.id} j={j} />)}
        </ListGroup>
      )}
      {!locked && <ListGroup header={list ? t("Other documents") : t("Documents")} inset={58}>
        {others.map((d) => <ListRow key={d.id} icon="doc.fill" iconColor={d.status === "rejected" ? c.red : c.tint} title={d.file_name ?? d.document_type}
          subtitle={`${DOC_TYPES.find((t) => t.value === d.document_type)?.label ?? d.document_type} · ${STATUS_LABEL[d.status] ?? d.status}${d.rejection_reason ? ` · ${d.rejection_reason}` : ""}`} onPress={() => open(d.storage_path)} />)}
        {others.length === 0 && !canUpload && <ListRow title={t("No other documents")} />}
        {canUpload && <ListRow icon="plus" iconColor={c.tint} title={t("Add another document")} tint onPress={addDocument} chevron={false} />}
        {picking && <View style={{ padding: S.md }}><ChipGroup label={t("Document type")} options={DOC_TYPES} value="" onChange={pickFile} /></View>}
      </ListGroup>}
      <InlineError text={upErr} />
      <ListGroup inset={58}>
        {a.payments.map((p) => <ListRow key={p.id} icon="creditcard.fill" iconColor={c.grey} title={p.amount != null ? money({ amount: p.amount, currency: p.currency }) : t("Card payment")} subtitle={ziina === "completed" && p.status !== "paid" ? t("Paid · confirming") : fmtD(p.created_at)} value={t(STATUS_LABEL[p.status] ?? p.status)} />)}
        <ListRow icon="logo.whatsapp" iconColor={c.whatsapp} title="WhatsApp" onPress={() => whatsapp(`Hi EZvisa, question about application ${a.reference}.`)} />
        <ListRow icon="envelope.fill" iconColor={c.tint} title={t("Email")} onPress={() => Linking.openURL(`mailto:support@ezvisa.net?subject=${encodeURIComponent(`Application ${a.reference}`)}`)} />
      </ListGroup>
    </ScrollView>
  );
}

/** One queue item: queued (waiting for connection / retrying) · uploading · done · failed. */
function UploadRow({ j }: { j: UploadJob }) {
  const c = useColors(); const { t } = useT();
  const v = j.state === "done" ? { icon: "checkmark.circle.fill" as const, color: c.green, sub: t("Uploaded") }
    : j.state === "failed" ? { icon: "exclamationmark.circle.fill" as const, color: c.red, sub: `${t("Failed")} · ${t(j.error ?? "")}` }
    : j.state === "uploading" ? { icon: "arrow.up.circle.fill" as const, color: c.tint, sub: j.progress != null && j.progress > 0 ? `${t("Uploading…")} ${Math.round(j.progress * 100)}%` : t("Uploading…") }
    : j.offline ? { icon: "wifi.slash" as const, color: c.orange, sub: t("Waiting for connection") }
    : j.nextAt ? { icon: "clock.fill" as const, color: c.orange, sub: t("Connection problem · retrying ({n}/{max})", { n: j.attempts, max: 6 }) }
    : { icon: "clock.fill" as const, color: c.secondaryLabel, sub: t("Queued") };
  return (
    <View testID={`upload-${j.state}`}>
      <ListRow icon={v.icon} iconColor={v.color} title={j.name} subtitle={v.sub} />
      {j.state === "uploading" && <View style={{ paddingHorizontal: S.md, paddingBottom: S.sm }}><ProgressBar value={j.progress ? j.progress : undefined} label={t("Uploading…")} /></View>}
      {(j.state === "failed" || j.state === "queued") && (
        <View style={{ flexDirection: "row", gap: S.sm, paddingHorizontal: S.md, paddingBottom: S.sm }}>
          {j.state === "failed" && <View style={{ flex: 1 }}><Button title={t("Retry")} size="M" variant="secondary" onPress={() => retryUpload(j.id)} /></View>}
          <View style={{ flex: 1 }}><Button title={t("Remove")} size="M" variant="secondary" onPress={() => removeUpload(j.id)} /></View>
        </View>
      )}
    </View>
  );
}

function CheckRow({ i, busy, canUpload, onPress }: { i: CheckItem; busy: boolean; canUpload: boolean; onPress?: () => void }) {
  const c = useColors(); const { t } = useT();
  const map: Record<CheckItem["state"], { icon: "checkmark.circle.fill" | "circle" | "exclamationmark.circle.fill" | "clock.fill" | "hourglass"; color: string; label: string }> = {
    missing: { icon: "circle", color: c.tertiaryLabel, label: t(i.req.is_mandatory ? "Missing" : "Optional") },
    // The rejection reason is staff text from document_reviews: shown as written
    rejected: { icon: "exclamationmark.circle.fill", color: c.red, label: `${t("Re-upload")}${i.reason ? ` · ${i.reason}` : ""}` },
    uploaded: { icon: "checkmark.circle.fill", color: c.tint, label: t("Uploaded") },
    review: { icon: "clock.fill", color: c.orange, label: t("Under review") },
    approved: { icon: "checkmark.circle.fill", color: c.green, label: t("Approved") },
    ready: { icon: "checkmark.circle.fill", color: c.green, label: t("Ready") },
    preparing: { icon: "hourglass", color: c.secondaryLabel, label: t("We'll prepare this") },
  };
  const m = map[i.state];
  const label = busy ? t("Uploading…") : m.label;
  const title = t(i.req.title);
  return <ListRow icon={m.icon} iconColor={m.color} title={title} subtitle={label} onPress={busy ? undefined : onPress} chevron={!!onPress && !busy}
    trailing={isOpen(i) && canUpload && !busy ? <Text variant="subhead" tone="tint">{t("Upload")}</Text> : undefined}
    a11yLabel={`${title}, ${label}`} a11yHint={isOpen(i) && canUpload ? t("Upload") : i.doc ? t("Open") : undefined} />;
}

