// Canvas DocViewer: an uploaded image document opened inside the app, with its name, where it stands with the team,
// Retake (while the case still takes documents) and Done. PDFs keep opening in the browser (applications/[id] decides).
// The picture comes from a 60-second signed link (lib/data openDocumentUrl): never a public URL, never cached to disk.
import { useState } from "react";
import { ActivityIndicator, Modal, Platform, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, PrimaryButton, SecondaryButton, Text } from "../ui";
import { useColors, S, R } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { DOC_TYPES, type Doc } from "../../lib/data";

/** Images open in the viewer; anything else (PDF) in the browser. */
export const isImagePath = (path: string) => /\.(jpe?g|png|webp|heic|heif)$/i.test(path);

/** The line under the name: where this document stands with the team. */
export function docStanding(d: Pick<Doc, "status" | "rejection_reason">): { text: string; tone: "secondary" | "green" | "red" } {
  if (d.status === "approved") return { text: "Checked by the team", tone: "green" };
  if (d.status === "rejected") return { text: d.rejection_reason ? "Needs replacing: {r}" : "Needs replacing", tone: "red" };
  return { text: "Being checked by the team", tone: "secondary" };
}

/** `url`: null while the signed link is being made, "" when this user can't open the file (it still shows as received). */
export function DocViewer({ doc, url, onClose, onRetake }: { doc: Doc | null; url: string | null; onClose: () => void; onRetake?: () => void }) {
  const c = useColors(); const { t } = useT(); const insets = useSafeAreaInsets();
  const [failed, setFailed] = useState(false); const [loaded, setLoaded] = useState(false);
  const [shownFor, setShownFor] = useState<string | null>(null);
  if ((url ?? null) !== shownFor) { setShownFor(url ?? null); setFailed(false); setLoaded(false); } // a new document: reset
  if (!doc) return null;
  const name = doc.file_name ?? t(DOC_TYPES.find((d) => d.value === doc.document_type)?.label ?? "Document");
  const kind = t(DOC_TYPES.find((d) => d.value === doc.document_type)?.label ?? doc.document_type);
  const st = docStanding(doc);
  return (
    <Modal visible animationType="slide" presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: Platform.OS === "ios" ? S.lg : insets.top + S.md, paddingBottom: insets.bottom + S.md }} testID="doc-viewer" accessibilityViewIsModal>
        <View style={{ paddingHorizontal: S.gutter, gap: 4 }}>
          <Text variant="headline" numberOfLines={1} accessibilityRole="header">{name}</Text>
          <Text variant="footnote" tone="secondary" numberOfLines={1}>{kind}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: S.xs }}>
            <Icon name={st.tone === "green" ? "checkmark.circle.fill" : st.tone === "red" ? "exclamationmark.circle.fill" : "clock"} size={15} color={st.tone === "green" ? c.green : st.tone === "red" ? c.red : c.secondaryLabel} />
            <Text variant="footnote" tone={st.tone} testID="doc-viewer-status">
              {t(st.text, { r: doc.rejection_reason ?? "" })}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, margin: S.gutter, borderRadius: R.card, overflow: "hidden", backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
          {url && !failed ? <>
            <Image source={{ uri: url }} style={{ position: "absolute", top: 0, bottom: 0, start: 0, end: 0 }} contentFit="contain" cachePolicy="none" transition={0}
              onLoad={() => setLoaded(true)} onError={() => setFailed(true)} accessibilityLabel={name} accessibilityIgnoresInvertColors testID="doc-viewer-image" />
            {!loaded && <ActivityIndicator color={c.secondaryLabel} accessibilityLabel={t("Loading")} />}
          </> : url === null ? <ActivityIndicator color={c.secondaryLabel} accessibilityLabel={t("Loading")} /> : (
            <View style={{ alignItems: "center", gap: S.sm, padding: S.lg }}>
              <Icon name="lock.fill" size={22} color={c.secondaryLabel} />
              <Text variant="body" tone="secondary" style={{ textAlign: "center" }}>{t("Your file was received and is stored privately with EZvisa. Our team reviews it; you'll be contacted if anything needs replacing.")}</Text>
            </View>
          )}
        </View>
        <View style={{ paddingHorizontal: S.gutter, gap: S.sm }}>
          {onRetake && <SecondaryButton title={t("Retake")} onPress={onRetake} testID="doc-viewer-retake" />}
          <PrimaryButton title={t("Done")} onPress={onClose} testID="doc-viewer-done" />
        </View>
      </View>
    </Modal>
  );
}
