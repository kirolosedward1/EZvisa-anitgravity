import { useCallback, useState } from "react";
import { Alert, Platform, ActionSheetIOS, RefreshControl, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { Button, ListGroup, ListRow, EmptyState, Flag, StatusPill, Timeline, ProgressBar, IconTile, Skeleton, InlineError, Text, ChipGroup } from "../../../components/ui";
import { useColors, S } from "../../../lib/theme";
import { getApplication, listRequirements, openDocumentUrl, Application, Requirement, DOC_TYPES, STATUS_LABEL } from "../../../lib/data";
import { enqueueUpload, retryUpload, removeUpload, useUploads } from "../../../lib/uploads";
import { buildChecklist, isOpen, type CheckItem } from "../../../lib/checklist";
import { SupportButton } from "../../../components/Support";
import { whatsapp, startPayment, checkPayment } from "../../../lib/api";
import { Linking } from "react-native";
import { success, error as hError } from "../../../lib/haptics";

const fmtD = (s?: string | null) => (s ? new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
const EDITABLE = ["draft", "submitted", "awaiting_documents"];
const MAX = 10 * 1024 * 1024;

export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const [a, setA] = useState<Application | null>(null); const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [upErr, setUpErr] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [reqs, setReqs] = useState<Requirement[] | null>(null);
  const load = useCallback(async () => {
    try {
      setErr(null);
      const app = await getApplication(id!); setA(app);
      listRequirements(app.country_id).then(setReqs).catch(() => setReqs([]));
    } catch (e: any) { setErr(e?.message ?? String(e)); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onDone = useCallback(() => { success(); load(); }, [load]);
  const queue = useUploads(id, onDone);

  const pickFile = async (docType: string, requirementId?: string) => {
    setPicking(false); setUpErr(null);
    const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    const f = r.assets[0];
    if (f.size && f.size > MAX) { hError(); setUpErr("File is larger than 10 MB."); return; }
    try { await enqueueUpload(id!, { uri: f.uri, name: f.name, mimeType: f.mimeType, size: f.size }, docType, requirementId); }
    catch (e: any) { hError(); setUpErr(e?.message ?? String(e)); }
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

  if (err) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center" }}><Stack.Screen options={{ title: "" }} /><EmptyState icon="exclamationmark.triangle.fill" title="Couldn't load" message={err} action={<Button title="Retry" variant="secondary" onPress={load} />} /></View>;
  if (!a) return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: S.lg, gap: S.md }}>
      <Stack.Screen options={{ title: "", headerLargeTitle: false }} />
      <View accessible accessibilityLabel="Loading" style={{ gap: S.md }}><Skeleton w={56} h={56} r={28} /><Skeleton w="50%" h={26} /><Skeleton w="30%" h={16} /><Skeleton h={160} r={20} /></View>
    </ScrollView>
  );
  const docs = [...a.documents].sort((x, y) => y.created_at.localeCompare(x.created_at));
  const list = reqs ? buildChecklist(reqs, a.documents) : null;
  const matched = new Set((list ? [...list.customer, ...list.ezvisa] : []).map((i) => i.doc?.id).filter(Boolean));
  const others = docs.filter((d) => !matched.has(d.id));
  const done = list ? list.customer.filter((i) => !isOpen(i)).length : 0;
  const busyType = (t: string) => queue.some((j) => j.documentType === t && j.state !== "failed");
  const canUpload = EDITABLE.includes(a.status);
  const name = a.countries?.name ?? "Application";
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: S.x3 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.tint} />}>
      <Stack.Screen options={{ title: "", headerLargeTitle: false, headerRight: () => <SupportButton context={`application ${a.reference}`} /> }} />
      <View style={{ marginHorizontal: S.lg, marginTop: S.xs, marginBottom: S.xl, gap: S.xs }}>
        <Flag country={name} size={56} />
        <Text variant="title1" style={{ marginTop: S.xs }} accessibilityRole="header">{name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="subhead" tone="secondary" tabular>{a.reference}</Text>
          <StatusPill v={a.status} />
        </View>
      </View>
      <ListGroup header="Status"><Timeline status={a.status} history={a.application_status_history} /></ListGroup>
      <ListGroup header="Trip" inset={16}>
        <ListRow title="Traveller" value={a.full_name} />
        <ListRow title="Dates" value={`${fmtD(a.entry_date)} – ${fmtD(a.exit_date)}`} />
        <ListRow title="Total" value={`${Number(a.total_amount).toFixed(0)} ${a.currency}`} />
      </ListGroup>
      {list ? (<>
        <ListGroup header={`Your documents · ${done} of ${list.customer.length}`} footer={canUpload ? "PDF or image · max 10 MB. Tap a missing item to upload it." : undefined} inset={58}>
          <View style={{ paddingHorizontal: S.md, paddingVertical: S.sm }} accessible accessibilityLabel={`${done} of ${list.customer.length} documents provided`}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.fill, overflow: "hidden" }}><View style={{ height: 6, borderRadius: 3, width: `${list.customer.length ? (100 * done) / list.customer.length : 0}%`, backgroundColor: done === list.customer.length ? c.green : c.tintFill }} /></View>
          </View>
          {list.customer.map((i) => <CheckRow key={i.req.id} i={i} busy={busyType(i.req.document_type)} canUpload={canUpload}
            onPress={() => (isOpen(i) ? (canUpload ? pickFile(i.req.document_type, i.req.id) : undefined) : i.doc && open(i.doc.storage_path))} />)}
        </ListGroup>
        {!!list.ezvisa.length && (
          <ListGroup header="We prepare these" inset={58}>
            {list.ezvisa.map((i) => <CheckRow key={i.req.id} i={i} busy={false} canUpload={false} onPress={i.doc ? () => open(i.doc!.storage_path) : undefined} />)}
          </ListGroup>
        )}
      </>) : <View style={{ marginHorizontal: S.lg, marginBottom: S.xl }}><Skeleton h={120} r={20} /></View>}
      {!!queue.length && (
        <ListGroup header="Uploads" footer={queue.some((j) => j.state === "queued") ? "Queued uploads continue automatically when you're online." : undefined} inset={58}>
          {queue.map((j) => (
            <View key={j.id}>
              <ListRow icon={j.state === "failed" ? "exclamationmark.circle.fill" : "arrow.up.circle.fill"} iconColor={j.state === "failed" ? c.red : c.tint} title={j.name}
                subtitle={j.state === "uploading" ? "Uploading…" : j.state === "failed" ? `Failed · ${j.error ?? ""}` : j.error ?? "Waiting to upload"} />
              {j.state === "uploading" ? <View style={{ paddingHorizontal: S.md, paddingBottom: S.sm }}><ProgressBar /></View> : (
                <View style={{ flexDirection: "row", gap: S.sm, paddingHorizontal: S.md, paddingBottom: S.sm }}>
                  <View style={{ flex: 1 }}><Button title="Retry" size="M" variant="secondary" onPress={() => retryUpload(j.id)} /></View>
                  <View style={{ flex: 1 }}><Button title="Remove" size="M" variant="secondary" onPress={() => removeUpload(j.id)} /></View>
                </View>
              )}
            </View>
          ))}
        </ListGroup>
      )}
      <ListGroup header={list ? "Other documents" : "Documents"} inset={58}>
        {others.map((d) => <ListRow key={d.id} icon="doc.fill" iconColor={d.status === "rejected" ? c.red : d.source === "generated" ? c.green : c.tint} title={d.file_name ?? d.document_type}
          subtitle={`${DOC_TYPES.find((t) => t.value === d.document_type)?.label ?? d.document_type} · ${STATUS_LABEL[d.status] ?? d.status}${d.rejection_reason ? ` · ${d.rejection_reason}` : ""}`} onPress={() => open(d.storage_path)} />)}
        {others.length === 0 && !canUpload && <ListRow title="No other documents" />}
        {canUpload && <ListRow icon="plus" iconColor={c.tint} title="Add another document" tint onPress={addDocument} chevron={false} />}
        {picking && <View style={{ padding: S.md }}><ChipGroup label="Document type" options={DOC_TYPES} value="" onChange={pickFile} /></View>}
      </ListGroup>
      <InlineError text={upErr} />
      <ListGroup inset={58}>
        {a.status !== "draft" && ["pending", "failed", "cancelled", "expired"].includes(a.payment_status ?? "pending") && <ListRow icon="creditcard.fill" iconColor={c.green} title={paying ? "Opening secure payment…" : `Pay ${Number(a.total_amount).toFixed(0)} ${a.currency}`} subtitle="Card, Apple Pay or Google Pay via Ziina" onPress={paying ? undefined : pay} />}
        {a.payments.map((p) => <ListRow key={p.id} icon="creditcard.fill" iconColor={c.grey} title={`${Number(p.amount).toFixed(0)} ${p.currency}`} subtitle={ziina === "completed" && p.status !== "paid" ? "Paid · confirming" : fmtD(p.created_at)} value={STATUS_LABEL[p.status] ?? p.status} />)}
        <ListRow icon="logo.whatsapp" iconColor={c.whatsapp} title="WhatsApp" onPress={() => whatsapp(`Hi EZvisa, question about application ${a.reference}.`)} />
        <ListRow icon="envelope.fill" iconColor={c.tint} title="Email" onPress={() => Linking.openURL(`mailto:support@ezvisa.net?subject=${encodeURIComponent(`Application ${a.reference}`)}`)} />
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
