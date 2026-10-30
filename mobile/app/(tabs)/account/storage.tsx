// Data & storage (canvas DataStorage): what EZvisa keeps on this phone, uploads still waiting to sync, clearing the cache
// and a copy of the person's own data. Clearing only frees space here: originals stay in the application.
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, ScrollView } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { RowGroup, Row, useTabInset } from "../../../components/ui";
import { useColors, S } from "../../../lib/theme";
import { useT } from "../../../lib/i18n";
import { useAuth } from "../../../lib/auth";
import { useUploads, retryUpload } from "../../../lib/uploads";
import { DOC_TYPES } from "../../../lib/data";
import { clearCache, formatBytes, shareMyData, storageUsage, type StorageUsage } from "../../../lib/storage";
import { success, error as hError } from "../../../lib/haptics";

export default function DataStorage() {
  const c = useColors(); const pb = useTabInset(); const { t, lang } = useT(); const { session } = useAuth();
  const jobs = useUploads(); const waiting = jobs.filter((j) => j.state !== "done");
  const [use, setUse] = useState<StorageUsage | null>(null);
  const [clearing, setClearing] = useState(false); const [exporting, setExporting] = useState(false);
  const measure = useCallback(() => { storageUsage().then(setUse).catch(() => setUse(null)); }, []);
  useFocusEffect(measure);
  useEffect(measure, [jobs.length, measure]);
  const size = (n: number | undefined) => (n == null ? "…" : formatBytes(n, lang));
  const native = Platform.OS !== "web";

  const clear = async () => {
    setClearing(true);
    try { await clearCache(jobs.map((j) => j.uri)); success(); measure(); }
    catch (e: any) { hError(); Alert.alert(t("Couldn't clear the cache"), e?.message ?? String(e)); }
    finally { setClearing(false); }
  };
  const confirmClear = () => {
    if (Platform.OS === "web") { clear(); return; }
    Alert.alert(t("Clear cached files?"), t("Originals stay in your application. Clearing only frees space on this phone."),
      [{ text: t("Cancel"), style: "cancel" }, { text: t("Clear"), style: "destructive", onPress: clear }]);
  };
  const exportData = async () => {
    if (!session) { router.push({ pathname: "/auth", params: { mode: "signin" } }); return; }
    setExporting(true);
    try { await shareMyData(); success(); }
    catch (e: any) { hError(); Alert.alert(t("Couldn't export your data"), t(e?.message ?? String(e))); }
    finally { setExporting(false); }
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: pb, gap: S.xl }} testID="data-storage">
      <Stack.Screen options={{ title: t("Data & storage") }} />

      <RowGroup header={native ? t("EZvisa on this phone") : t("EZvisa in this browser")} footer={t("Globi and the rest of the app are part of the app itself and aren't counted here.")}>
        <Row label={t("Total")} value={size(use?.total)} testID="storage-total" />
        {native && <Row label={t("Documents waiting to send")} icon="arrow.up.circle.fill" value={size(use?.queued)} />}
        {native && <Row label={t("Cached files")} icon="photo.on.rectangle" value={size(use?.cache)} />}
        <Row label={t("Saved answers and settings")} icon="list.bullet" value={size(use?.saved)} />
      </RowGroup>

      <RowGroup header={t("Waiting to sync")} footer={waiting.length ? t("Queued uploads continue automatically when you're online.") : t("Everything on this phone has reached EZvisa.")}>
        {waiting.length ? waiting.map((j) => {
          const kind = t(DOC_TYPES.find((d) => d.value === j.documentType)?.label ?? "Document");
          const state = j.state === "uploading" ? t("Sending…") : j.state === "failed" ? t("Not sent · tap to try again") : j.offline ? t("Sends when online") : t("Queued");
          return <Row key={j.id} label={kind} sub={[j.size ? formatBytes(j.size, lang) : null, state].filter(Boolean).join(" · ")} icon="doc.fill"
            onPress={j.state === "failed" ? () => retryUpload(j.id) : undefined} testID={`sync-${j.id}`} />;
        }) : <Row label={t("Nothing waiting")} icon="checkmark.circle.fill" testID="sync-empty" />}
      </RowGroup>

      <RowGroup footer={t("Originals stay in your application. Clearing only frees space on this phone. The export is a file with your account details, applications and saved travellers; uploaded documents stay private with your application.")}>
        <Row label={clearing ? t("Clearing…") : t("Clear cached files")} value={native ? size(use?.cache) : undefined} icon="trash" tint onPress={clearing ? undefined : confirmClear} testID="storage-clear" />
        <Row label={exporting ? t("Preparing…") : t("Export my data")} sub={t("A file you can save or share")} icon="square.and.arrow.up" tint onPress={exporting ? undefined : exportData} testID="storage-export" />
      </RowGroup>
    </ScrollView>
  );
}
