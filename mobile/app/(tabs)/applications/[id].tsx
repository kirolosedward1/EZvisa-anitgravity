import { useCallback, useState } from "react";
import { Alert, Platform, ActionSheetIOS, RefreshControl, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Button, ListGroup, ListRow, EmptyState, Flag, StatusPill, Timeline, ProgressBar, IconTile, Skeleton, InlineError, Text, ChipGroup } from "../../../components/ui";
import { useColors, S, R } from "../../../lib/theme";
import { isPaid, getApplication, listRequirements, openDocumentUrl, Application, Requirement, DOC_TYPES, STATUS_LABEL } from "../../../lib/data";
import { enqueueUpload, retryUpload, removeUpload, useUploads } from "../../../lib/uploads";
import { buildChecklist, isOpen, type CheckItem } from "../../../lib/checklist";
import { SupportButton } from "../../../components/Support";
import { whatsapp, startPayment, checkPayment } from "../../../lib/api";
import { Linking } from "react-native";
import { success, error as hError } from "../../../lib/haptics";
import { chooseSource, pickFrom, checkQuality, confirmWarnings } from "../../../lib/capture";
import { useT } from "../../../lib/i18n";
import { FACTS, localTime, diffFromUae, UAE_PLUG } from "../../../lib/facts";
import { router } from "expo-router";
import { countdown } from "../../../lib/countdown";

let LOC: string | undefined;
const fmtD = (s?: string | null) => (s ? new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString(LOC, { day: "numeric", month: "short", year: "numeric" }) : "—");
const EDITABLE = ["draft", "submitted", "awaiting_documents"];

export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors(); const { t, lang } = useT(); LOC = lang === "ar" ? "ar" : undefined;
  const [a, setA] = useState<Application | null>(null); const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [upErr, setUpErr] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [reqs, setReqs] = useState<Requirement[] | null>(null);
  const load = useCallback(async () => {
    try {
      setErr(null);
      const app = await getApplication(id!); setA(app);
      listRequirements(app.country_id, (app.notes?.wizard as any)?.employmentStatus).then(setReqs).catch(() => setReqs([]));
    } catch (e: any) { setErr(e?.message ?? String(e)); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onDone = useCallback(() => { success(); load(); }, [load]);
  const queue = useUploads(id, onDone);

  const pickFile = async (docType: string, requirementId?: string) => {
    setPicking(false); setUpErr(null);
    try {
      const src = await chooseSource(lang); if (!src) return;
      const f = await pickFrom(src); if (!f) return;
      const q = checkQuality(f, lang);
      if (q.error) { hError(); setUpErr(q.error); return; }
      if (!(await confirmWarnings(q.warnings, lang))) return;
      await enqueueUpload(id!, { uri: f.uri, name: f.name, mimeType: f.mimeType, size: f.size }, docType, requirementId);
    } catch (e: any) { hError(); setUpErr(e?.message ?? String(e)); }
  };
  const addDocument = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ title: "Document type", options: [...DOC_TYPES.map((d) => d.label), "Cancel"], cancelButtonIndex: DOC_TYPES.length }, (i) => { if (i < DOC_TYPES.length) pickFile(DOC_TYPES[i].value); });
    } else setPicking(!picking);
  };
  const open = async (path: string) => {
    try { const url = path ? await openDocumentUrl(path) : null; if (url) await WebBrowser.openBrowserAsync(url); else Alert.alert("Stored securely", "Your file was received and is stored privately with EZvisa. Our team reviews it; you'll be contacted if anything needs replacing."); }
    catch (e: any) { Alert.alert("Can't open file", e?.message); }
  };
  const [paying, setPaying] = useState(false); const [ziina, setZiina] = useState<string | null>(null);
  const pay = async () => {
    if (!a) return; setPaying(true); setUpErr(null);
    try { const { paymentId } = await startPayment(a, a.applicants.length > 1); setZiina(await checkPayment(paymentId)); await load(); }
    catch (e: any) {
      hError();
      if (e?.fallbackWhatsApp) Alert.alert("Payment", e.message, [{ text: "Cancel", style: "cancel" }, { text: "WhatsApp", onPress: () => whatsapp(`Hi EZvisa, I'd like to pay for application ${a.reference} (${Number(a.total_amount).toFixed(0)} ${a.currency}).`) }]);
      else setUpErr(e?.message ?? String(e));
    }
    finally { setPaying(false); }
  };

  if (err) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center" }}><Stack.Screen options={{ title: "" }} /><EmptyState icon="exclamationmark.triangle.fill" title={t("Couldn't load")} message={err} action={<Button title="Retry" variant="secondary" onPress={load} />} /></View>;
  if (!a) return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: S.lg, gap: S.md }}>
      <Stack.Screen options={{ title: "", headerLargeTitle: false }} />
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
  const list = reqs ? buildChecklist(reqs, a.documents) : null;
  const matched = new Set((list ? [...list.customer, ...list.ezvisa] : []).map((i) => i.doc?.id).filter(Boolean));
  const others = docs.filter((d) => !matched.has(d.id));
  const done = list ? list.customer.filter((i) => !isOpen(i)).length : 0;
  const busyType = (t: string) => queue.some((j) => j.documentType === t && j.state !== "failed");
  const paid = isPaid(a); const locked = a.status !== "draft" && !paid;
  const canUpload = paid && EDITABLE.includes(a.status);
  const name = a.countries?.name ?? "Application";
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: S.x3 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.tint} />}>
      <Stack.Screen options={{ title: "", headerLargeTitle: false, headerRight: () => <SupportButton context={`application ${a.reference}`} /> }} />
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
          <ListRow icon="creditcard.fill" iconColor={c.green} title={paying ? t("Opening secure payment…") : t("Pay {amount}", { amount: `${Number(a.total_amount).toFixed(0)} ${a.currency}` })} subtitle={a.payment_status === "failed" ? t("The last payment didn't go through.") : t("Card, Apple Pay or Google Pay via Ziina")} onPress={paying ? undefined : pay} />
        </ListGroup>
      )}
      <ListGroup header={t("Trip")} inset={16}>
        <ListRow title={t("Traveller")} value={a.full_name} />
        <ListRow title={t("Dates")} value={`${fmtD(a.entry_date)} – ${fmtD(a.exit_date)}`} />
        <ListRow title={t("Total")} value={`${Number(a.total_amount).toFixed(0)} ${a.currency}`} />
        {countdown(a.entry_date, a.exit_date, t) && <ListRow title={t("Countdown")} value={countdown(a.entry_date, a.exit_date, t)!} />}
        {a.status !== "cancelled" && <ListRow icon="map.fill" iconColor={c.indigo} title={t("Trip plan")} subtitle={t("Ideas, not bookings")} onPress={() => router.push(`/trip/${a.id}`)} />}
      </ListGroup>
      <QuickFacts country={name} />
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
        <ListGroup header={t("Uploads")} footer={queue.some((j) => j.state === "queued") ? t("Queued uploads continue automatically when you're online.") : undefined} inset={58}>
          {queue.map((j) => (
            <View key={j.id}>
              <ListRow icon={j.state === "failed" ? "exclamationmark.circle.fill" : "arrow.up.circle.fill"} iconColor={j.state === "failed" ? c.red : c.tint} title={j.name}
                subtitle={j.state === "uploading" ? "Uploading…" : j.state === "failed" ? `Failed · ${j.error ?? ""}` : j.error ?? "Waiting to upload"} />
              {j.state === "uploading" ? <View style={{ paddingHorizontal: S.md, paddingBottom: S.sm }}><ProgressBar /></View> : (
                <View style={{ flexDirection: "row", gap: S.sm, paddingHorizontal: S.md, paddingBottom: S.sm }}>
                  <View style={{ flex: 1 }}><Button title={t("Retry")} size="M" variant="secondary" onPress={() => retryUpload(j.id)} /></View>
                  <View style={{ flex: 1 }}><Button title={t("Remove")} size="M" variant="secondary" onPress={() => removeUpload(j.id)} /></View>
                </View>
              )}
            </View>
          ))}
        </ListGroup>
      )}
      {!locked && <ListGroup header={list ? t("Other documents") : t("Documents")} inset={58}>
        {others.map((d) => <ListRow key={d.id} icon="doc.fill" iconColor={d.status === "rejected" ? c.red : d.source === "generated" ? c.green : c.tint} title={d.file_name ?? d.document_type}
          subtitle={`${DOC_TYPES.find((t) => t.value === d.document_type)?.label ?? d.document_type} · ${STATUS_LABEL[d.status] ?? d.status}${d.rejection_reason ? ` · ${d.rejection_reason}` : ""}`} onPress={() => open(d.storage_path)} />)}
        {others.length === 0 && !canUpload && <ListRow title={t("No other documents")} />}
        {canUpload && <ListRow icon="plus" iconColor={c.tint} title={t("Add another document")} tint onPress={addDocument} chevron={false} />}
        {picking && <View style={{ padding: S.md }}><ChipGroup label={t("Document type")} options={DOC_TYPES} value="" onChange={pickFile} /></View>}
      </ListGroup>}
      <InlineError text={upErr} />
      <ListGroup inset={58}>
        {a.payments.map((p) => <ListRow key={p.id} icon="creditcard.fill" iconColor={c.grey} title={`${Number(p.amount).toFixed(0)} ${p.currency}`} subtitle={ziina === "completed" && p.status !== "paid" ? t("Paid · confirming") : fmtD(p.created_at)} value={t(STATUS_LABEL[p.status] ?? p.status)} />)}
        <ListRow icon="logo.whatsapp" iconColor={c.whatsapp} title="WhatsApp" onPress={() => whatsapp(`Hi EZvisa, question about application ${a.reference}.`)} />
        <ListRow icon="envelope.fill" iconColor={c.tint} title={t("Email")} onPress={() => Linking.openURL(`mailto:support@ezvisa.net?subject=${encodeURIComponent(`Application ${a.reference}`)}`)} />
      </ListGroup>
    </ScrollView>
  );
}

function CheckRow({ i, busy, canUpload, onPress }: { i: CheckItem; busy: boolean; canUpload: boolean; onPress?: () => void }) {
  const c = useColors();
  const map: Record<CheckItem["state"], { icon: "checkmark.circle.fill" | "circle" | "exclamationmark.circle.fill" | "clock.fill" | "hourglass"; color: string; label: string }> = {
    missing: { icon: "circle", color: c.tertiaryLabel, label: i.req.is_mandatory ? "Missing" : "Optional" },
    rejected: { icon: "exclamationmark.circle.fill", color: c.red, label: `Re-upload${i.reason ? ` · ${i.reason}` : ""}` },
    uploaded: { icon: "checkmark.circle.fill", color: c.tint, label: "Uploaded" },
    review: { icon: "clock.fill", color: c.orange, label: "Under review" },
    approved: { icon: "checkmark.circle.fill", color: c.green, label: "Approved" },
    ready: { icon: "checkmark.circle.fill", color: c.green, label: "Ready" },
    preparing: { icon: "hourglass", color: c.secondaryLabel, label: "We'll prepare this" },
  };
  const m = map[i.state];
  const label = busy ? "Uploading…" : m.label;
  return <ListRow icon={m.icon} iconColor={m.color} title={i.req.title} subtitle={label} onPress={busy ? undefined : onPress} chevron={!!onPress && !busy}
    trailing={isOpen(i) && canUpload && !busy ? <Text variant="subhead" tone="tint">Upload</Text> : undefined}
    a11yLabel={`${i.req.title}, ${label}`} a11yHint={isOpen(i) && canUpload ? "Upload" : i.doc ? "Open" : undefined} />;
}

/** Currency, local time, plugs and emergency number from the static dataset in lib/facts.ts. */
function QuickFacts({ country }: { country: string }) {
  const c = useColors(); const { t, lang } = useT(); const f = FACTS[country];
  if (!f) return null;
  const time = localTime(f.tz, lang === "ar" ? "ar" : "en-GB"); const d = diffFromUae(f.tz);
  const diff = d == null ? "" : d === 0 ? t("same as UAE") : t("{h} h vs UAE", { h: d > 0 ? `+${d}` : String(d) });
  return (
    <ListGroup header={t("Quick facts")} footer={t("Sources: IEC World Plugs, ECB, EU 112, IANA time zones.")} inset={58}>
      <ListRow icon="dollarsign.circle" iconColor={c.green} title={t("Currency")} value={`${f.currency} · ${t(f.currencyName)}`} />
      {!!time && <ListRow icon="clock" iconColor={c.tint} title={t("Local time")} value={[time, diff].filter(Boolean).join(" · ")} />}
      <ListRow icon="powerplug.fill" iconColor={c.orange} title={t("Plugs")} value={`${f.plugs} · ${f.volts}`} subtitle={f.plugs.includes(UAE_PLUG) ? t("Same as UAE (type G)") : t("UAE plugs (type G) need an adapter")} />
      <ListRow icon="phone.fill" iconColor={c.red} title={t("Emergency")} value={f.emergency} />
    </ListGroup>
  );
}
