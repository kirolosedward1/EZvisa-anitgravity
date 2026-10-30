import { StatusHero, NextCard, ToGetLater, nextOf, daysUntil } from "../../../components/status/StatusCards";
import { AppointmentDaySheet } from "../../../components/status/AppointmentDay";
import { ReapplySheet } from "../../../components/status/Reapply";
import { RateCard } from "../../../components/status/RateCard";
import { DocViewer, isImagePath } from "../../../components/status/DocViewer";
import { appointmentOf } from "../../../lib/appointment";
import { missingDocuments, type MissingDoc } from "../../../lib/missing";
import { track } from "../../../lib/analytics";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Platform, ActionSheetIOS, RefreshControl, ScrollView, Share, View, type ScrollViewInstance } from "react-native";
import { Stack, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTabInset, Button, ListGroup, ListRow, EmptyState, Timeline, ProgressBar, Skeleton, InlineError, Text, ChipGroup, RowGroup, Row, InfoNote } from "../../../components/ui";
import { useColors, S, R } from "../../../lib/theme";
import { isPaid, getApplication, listRequirements, openDocumentUrl, isUploadType, type Doc, Application, Requirement, DOC_TYPES, STATUS_LABEL, UPLOAD_STATUSES, employmentOf, continueForm } from "../../../lib/data";
import { retryUpload, removeUpload, clearDone, useUploads, type UploadJob } from "../../../lib/uploads";
import { buildChecklist, isOpen, type CheckItem } from "../../../lib/checklist";
import { SupportButton } from "../../../components/Support";
import { whatsapp } from "../../../lib/api";
import { intentStatus, knownPayment, money, startPayment, usePaying, useQuote } from "../../../lib/payments";
import { Linking } from "react-native";
import { success, error as hError, tap } from "../../../lib/haptics";
import { chooseSource, pickFrom, validateFile } from "../../../lib/capture";
import { useT } from "../../../lib/i18n";
import { router } from "expo-router";
import { askDiscard, discardApplication, isAbandoned } from "../../../lib/discard";
import { Pressable } from "react-native";
import { Icon } from "../../../components/ui";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from "react-native-reanimated";
import { formatPayAmount, PAY_AED } from "../../../lib/payLabel";

const EDITABLE = UPLOAD_STATUSES;
const REFRESH_MS = 30_000;

export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors(); const pb = useTabInset(); const { t, lang } = useT();
  const [a, setA] = useState<Application | null>(null); const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [upErr, setUpErr] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [reqs, setReqs] = useState<Requirement[] | null>(null);
  const [day, setDay] = useState(false); const [reapply, setReapply] = useState(false);
  /** quiet = background refresh: a failure keeps what is on screen instead of replacing it with an error. */
  const load = useCallback(async (quiet = false) => {
    try {
      const app = await getApplication(id!); setA(app); setErr(null);
      listRequirements(app.country_id, employmentOf(app)).then(setReqs).catch(() => setReqs([]));
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
      ActionSheetIOS.showActionSheetWithOptions({ title: t("Document type"), options: [...DOC_TYPES.map((d) => t(d.label)), t("Cancel")], cancelButtonIndex: DOC_TYPES.length }, (i) => { if (i < DOC_TYPES.length) pickFile(DOC_TYPES[i].value); });
    } else setPicking(!picking);
  };
  // Images open in the in-app viewer (canvas DocViewer); PDFs in the browser. Both from a 60-second signed link.
  const [viewing, setViewing] = useState<{ doc: Doc; url: string | null } | null>(null);
  const open = async (doc: Doc) => {
    const path = doc.storage_path;
    if (path && isImagePath(path)) setViewing({ doc, url: null });
    try {
      const url = path ? await openDocumentUrl(path) : null;
      if (path && isImagePath(path)) { setViewing((v) => (v?.doc.id === doc.id ? { doc, url: url ?? "" } : v)); return; }
      if (url) await WebBrowser.openBrowserAsync(url); else Alert.alert(t("Stored securely"), t("Your file was received and is stored privately with EZvisa. Our team reviews it; you'll be contacted if anything needs replacing."));
    }
    catch (e: any) { setViewing(null); Alert.alert(t("Can't open file"), e?.message); }
  };
  const paying = usePaying(); const [ziina, setZiina] = useState<string | null>(null);
  const unpaid = !!a && !isPaid(a);
  const quote = useQuote(unpaid ? a!.id : null, a?.updated_at);
  // Ziina status of the checkout this device opened (server proxy), so a paid-but-not-yet-recorded payment shows as confirming.
  useEffect(() => { let on = true; if (unpaid) knownPayment(a!.id).then((p) => p && intentStatus(p.paymentId)).then((s) => on && setZiina(s ?? null)).catch(() => {}); return () => { on = false; }; }, [a?.id, a?.payment_status]);
  // The locked Trip plan row only scrolls to the payment step; paying always needs its own tap there.
  const scroller = useRef<ScrollViewInstance>(null); const docsY = useRef(0);
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);
  const toDocs = (firstId?: string) => { tap(); scroller.current?.scrollTo({ y: Math.max(0, docsY.current - 16), animated: true }); if (firstId) setTimeout(() => setFlash((f) => ({ id: firstId, n: (f?.n ?? 0) + 1 })), 350); };
  const toPayStep = () => { tap(); scroller.current?.scrollTo({ y: 0, animated: true }); };
  const pay = async () => {
    if (!a || paying) return; setUpErr(null);
    try { const o = await startPayment(a.id); router.push({ pathname: "/payment/[id]", params: { id: a.id, returned: o.returned } }); }
    catch (e: any) {
      if (e?.busy) return;
      if (e?.alreadyPaid) { router.push({ pathname: "/payment/[id]", params: { id: a.id, returned: "success" } }); return; }
      hError();
      if (e?.fallbackWhatsApp) Alert.alert(t("Payment"), e.message, [{ text: t("Cancel"), style: "cancel" }, { text: "WhatsApp", onPress: () => whatsapp(`Hi EZvisa, I'd like to pay for application ${a.reference}.`) }]);
      else setUpErr(e?.message ?? String(e));
    }
  };

  if (err) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center" }}><Stack.Screen options={{ title: "", headerLargeTitle: false, headerTransparent: false, headerStyle: { backgroundColor: c.bg }, headerRight: () => <SupportButton header context="an application" /> }} /><EmptyState icon="exclamationmark.triangle.fill" title={t("Couldn't load")} message={err} action={<Button title={t("Retry")} variant="secondary" onPress={() => load()} />} /></View>;
  if (!a) return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: S.lg, gap: S.md }}>
      <Stack.Screen options={{ title: "", headerLargeTitle: false, headerTransparent: false, headerStyle: { backgroundColor: c.bg } }} />
      {/* Mirrors the real layout: hero, Status timeline (4 steps), Trip group */}
      <View accessible accessibilityLabel={t("Loading")} style={{ gap: S.md }} testID="detail-skeleton">
        <Skeleton w={56} h={56} r={R.round} /><Skeleton w="55%" h={34} r={R.md} />
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
  const next = nextOf(a, list ? list.customer : null);
  const ended = ["completed", "rejected", "cancelled"].includes(a.status);
  const due = quote?.amount ?? a.total_amount;
  if (next.kind === "pay" && due != null) { next.cta = PAY_AED; next.vars = { ...next.vars, amount: formatPayAmount(due) }; }
  const ap = appointmentOf(a);
  // "To get later" until the document arrives; nothing once the case is finished.
  const received = new Set((list?.customer ?? []).filter((i) => !isOpen(i)).map((i) => i.req.document_type));
  const later = ["completed", "rejected", "cancelled"].includes(a.status) ? []
    : ((((a.notes as any)?.missingDocuments as MissingDoc[] | undefined) ?? missingDocuments(continueForm(a))).filter((m) => !received.has(m)));
  const applyAgain = () => { tap(); setReapply(true); };
  const primary = () => {
    tap();
    switch (next.kind) {
      case "pay": pay(); return;
      case "continue": router.push(`/continue/${a.id}`); return;
      case "fix": case "upload": if (next.item && canUpload) pickFile(next.item.req.document_type, next.item.req.id); else toDocs(next.item?.req.id); return;
      case "ready": case "book": case "appointment": router.push(`/appointment/${a.id}`); return;
      case "refused": track("whatsapp_handoff", { screen: "refused" }); whatsapp(`Hi EZvisa, my ${name} visa (${a.reference}) was refused. Can a specialist call me?`); return;
      case "approved": Share.share({ message: t("My {c} visa is approved. Applied with EZvisa: https://www.ezvisa.net", { c: t(name) }) }).catch(() => {}); return;
    }
  };
  const alt = () => {
    tap();
    if (next.kind === "fix") { track("whatsapp_handoff", { screen: "doc-rejected" }); whatsapp(`Hi EZvisa, why does my ${next.item ? next.item.req.title : "document"} need replacing? (${a.reference})`); return; }
    if (next.kind === "ready") { toDocs(); return; }
    if (next.kind === "refused" || next.kind === "approved") applyAgain();
  };
  return (
    <ScrollView ref={scroller} contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: pb }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.tint} />}>
      <Stack.Screen options={{ title: "", headerLargeTitle: false, headerTransparent: false, headerStyle: { backgroundColor: c.bg }, headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>
          {isAbandoned(a) && <Pressable onPress={() => askDiscard(() => { discardApplication(a).then(() => (router.canGoBack() ? router.back() : router.replace("/applications"))).catch((e) => setUpErr(e?.message ?? String(e))); }, t)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Discard")} testID="detail-discard" style={{ minWidth: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={20} color={c.red} /></Pressable>}
          <SupportButton header context={`application ${a.reference}`} />
        </View>) }} />
      {/* Canvas Status: hero, the one next thing (Next: you / Next: us), the steps, "To get later", Trip. */}
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.xs, gap: S.lg, marginBottom: S.xl }}>
        <StatusHero a={a} />
        <NextCard n={next} onPrimary={next.cta ? primary : undefined} onAlt={next.alt ? alt : undefined} busy={next.kind === "pay" && paying} />
        {ziina === "completed" && unpaid && <InfoNote tone="success" text={t("Payment received. Updating your application…")} />}
        {(a.status === "completed" || a.status === "rejected") && <RateCard appId={a.id} reference={a.reference} />}
        <RowGroup header={t("Status")}><Timeline a={a} t={t} /></RowGroup>
        <ToGetLater items={later} onAdd={() => toDocs()} />
        {a.status !== "cancelled" && (
          <RowGroup header={t("Trip")}>
            {a.status === "completed" && (daysUntil(a.entry_date) ?? -1) >= 0 && <Row label={t("Before you fly")} sub={t("{n} days to go", { n: daysUntil(a.entry_date)! })} icon="airplane" onPress={() => { tap(); router.push(`/countdown/${a.id}`); }} testID="trip-countdown" />}
            {paid && !ended && <Row label={t("Appointment")} icon="calendar" value={ap ? new Date(ap.at).toLocaleString(lang === "ar" ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : t("Book now")} tint={!ap} onPress={() => { tap(); router.push(`/appointment/${a.id}`); }} testID="trip-appointment" />}
            {paid && !ended && <Row label={t("What happens on the day")} icon="list.bullet" onPress={() => { tap(); setDay(true); }} testID="trip-day" />}
            {paid
              ? <Row label={t("Trip plan")} sub={t("Ideas, not bookings")} icon="map.fill" onPress={() => router.push(`/trip/${a.id}`)} testID="trip-plan" />
              : <Row label={t("Trip plan")} sub={t("Your trip plan unlocks after payment")} icon="lock.fill" onPress={toPayStep} />}
            {paid && <Row label={t("Receipt")} icon="doc.text.fill" value={[a.total_amount != null ? money({ amount: a.total_amount, currency: a.currency }) : "", "PDF"].filter(Boolean).join(" · ")} onPress={() => router.push(`/receipt/${a.id}`)} testID="trip-receipt" />}
          </RowGroup>
        )}
      </View>
      <AppointmentDaySheet visible={day} onClose={() => setDay(false)} travellers={a.applicants.length} />
      <ReapplySheet a={a} visible={reapply} onClose={() => setReapply(false)} />
      <DocViewer doc={viewing?.doc ?? null} url={viewing?.url ?? null} onClose={() => setViewing(null)}
        onRetake={viewing && canUpload && isUploadType(viewing.doc.document_type) ? () => { const d = viewing.doc; setViewing(null); setTimeout(() => pickFile(d.document_type, d.requirement_id ?? undefined), 350); } : undefined} />
      {locked ? (
        <ListGroup header={t("Documents")} inset={58}><ListRow icon="lock.fill" iconColor={c.grey} title={t("Upload documents")} subtitle={t("Available after payment")} chevron={false} /></ListGroup>
      ) : list ? (<>
        <View onLayout={(e) => { docsY.current = e.nativeEvent.layout.y; }} />
        {/* Canvas Upload: "Your documents · i of n received", then Still needed and Received. */}
        <View style={{ paddingHorizontal: S.gutter, gap: S.xs, marginBottom: S.sm }} accessible accessibilityLabel={t("{i} of {n} received", { i: done, n: list.customer.length })}>
          <Text variant="headline" accessibilityRole="header">{t("Your documents")}</Text>
          <Text variant="note" tone="secondary">{t("{i} of {n} received", { i: done, n: list.customer.length })}</Text>
          <View style={{ height: 4, borderRadius: R.xs, backgroundColor: c.fill, overflow: "hidden" }}><View style={{ height: 4, borderRadius: R.xs, width: `${list.customer.length ? (100 * done) / list.customer.length : 0}%`, backgroundColor: done === list.customer.length ? c.success : c.accent }} /></View>
        </View>
        {canUpload && list.customer.some(isOpen) && (
          <ListGroup header={t("Still needed")} footer={canUpload ? t("PDF or image · max 4 MB. Tap a missing item to upload it.") : undefined} inset={58}>
            {list.customer.filter(isOpen).map((i) => <CheckRow key={i.req.id} flash={flash?.id === i.req.id ? flash.n : 0} i={i} busy={busyType(i.req.document_type)} canUpload={canUpload}
              onPress={canUpload ? () => pickFile(i.req.document_type, i.req.id) : undefined} />)}
          </ListGroup>
        )}
        {list.customer.some((i) => !isOpen(i)) && (
          <ListGroup header={t("Received")} inset={58}>
            {list.customer.filter((i) => !isOpen(i)).map((i) => <CheckRow key={i.req.id} i={i} busy={busyType(i.req.document_type)} canUpload={false} onPress={i.doc ? () => open(i.doc!) : undefined} />)}
          </ListGroup>
        )}
        {!!list.ezvisa.length && (
          <ListGroup header={t("We prepare these")} inset={58}>
            {list.ezvisa.map((i) => <CheckRow key={i.req.id} i={i} busy={false} canUpload={false} onPress={i.doc?.storage_path ? () => open(i.doc!) : undefined} />)}
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
          subtitle={`${DOC_TYPES.find((t) => t.value === d.document_type)?.label ?? d.document_type} · ${STATUS_LABEL[d.status] ?? d.status}${d.rejection_reason ? ` · ${d.rejection_reason}` : ""}`} onPress={() => open(d)} />)}
        {others.length === 0 && !canUpload && <ListRow title={t("No other documents")} />}
        {canUpload && <ListRow icon="plus" iconColor={c.tint} title={t("Add another document")} tint onPress={addDocument} chevron={false} />}
        {picking && <View style={{ padding: S.md }}><ChipGroup label={t("Document type")} options={DOC_TYPES} value="" onChange={pickFile} /></View>}
      </ListGroup>}
      <InlineError text={upErr} />
      <ListGroup header={t("Support")} footer={t("Your reference {r} is added to the message.", { r: a.reference })} inset={58}>
        <ListRow icon="logo.whatsapp" iconColor={c.whatsapp} title="WhatsApp" onPress={() => whatsapp(`Hi EZvisa, I have a question about application ${a.reference} (${name}).`)} />
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

function CheckRow({ i, busy, canUpload, onPress, flash = 0 }: { i: CheckItem; busy: boolean; canUpload: boolean; onPress?: () => void; flash?: number }) {
  const c = useColors(); const { t } = useT();
  const hl = useSharedValue(0);
  useEffect(() => { if (flash) hl.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 1200, easing: Easing.out(Easing.quad) })); }, [flash]);
  const hlStyle = useAnimatedStyle(() => ({ opacity: hl.value }));
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
  return <View><ListRow icon={m.icon} iconColor={m.color} title={title} subtitle={label} onPress={busy ? undefined : onPress} chevron={!!onPress && !busy}
    trailing={isOpen(i) && canUpload && !busy ? <Text variant="subhead" tone="tint">{t("Upload")}</Text> : undefined}
    a11yLabel={`${title}, ${label}`} a11yHint={isOpen(i) && canUpload ? t("Upload") : i.doc ? t("Open") : undefined} /><Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, bottom: 0, start: 0, end: 0, backgroundColor: c.accentMuted }, hlStyle]} /></View>;
}

