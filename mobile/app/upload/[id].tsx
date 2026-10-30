// Upload preview: crop / rotate a photo (re-encoded to a compressed JPEG on Upload) or check a PDF, then add it to the
// offline upload queue. Opened from the application's document list; `id` is the application id.
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, Skeleton, InlineError, Icon, EmptyState } from "../../components/ui";
import { CircleButton } from "../../components/flow";
import { CropBox, defaultCrop } from "../../components/CropBox";
import { useColors, S, R, curve } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { success, error as hError, tap } from "../../lib/haptics";
import { fileKind, validateFile, prepareImage, rotate90, pickFrom, MIN_SHORT_SIDE, type Picked, type Rect, type Source } from "../../lib/capture";
import { enqueueUpload } from "../../lib/uploads";

type Params = { id: string; docType: string; reqId?: string; title?: string; source?: Source; uri: string; name: string; mimeType?: string; size?: string; width?: string; height?: string };
type Img = { uri: string; width: number; height: number };
const mb = (n?: number | null) => (n == null ? "" : n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const fromParams = (p: Params): Picked => ({ uri: p.uri, name: p.name, mimeType: p.mimeType || null, size: p.size ? Number(p.size) : null, width: p.width ? Number(p.width) : undefined, height: p.height ? Number(p.height) : undefined });

/** Decodes the photo once (also proves it is readable). HEIC/WebP become a JPEG working copy with the orientation baked in,
 *  so the preview and the crop maths use the same pixels as the final file. */
async function openImage(f: Picked): Promise<Img> {
  const { ImageManipulator, SaveFormat } = require("expo-image-manipulator") as typeof import("expo-image-manipulator");
  const ref = await ImageManipulator.manipulate(f.uri).renderAsync();
  if (/^image\/(jpe?g|png)$/i.test(f.mimeType ?? "") || /\.(jpe?g|png)$/i.test(f.name)) return { uri: f.uri, width: ref.width, height: ref.height };
  const r = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
  return { uri: r.uri, width: r.width, height: r.height };
}

/** Back to the application (also when the preview was opened without a screen under it). */
const close = (id: string) => (router.canGoBack() ? router.back() : router.replace(`/applications/${id}`, { withAnchor: true }));

export default function UploadPreview() {
  const p = useLocalSearchParams<Params>();
  const c = useColors(); const insets = useSafeAreaInsets(); const { t, lang } = useT();
  const [file, setFile] = useState<Picked>(() => fromParams(p));
  const kind = fileKind(file);
  const [img, setImg] = useState<Img | null>(null); const [crop, setCrop] = useState<Rect | null>(null);
  const [busy, setBusy] = useState<"rotate" | "upload" | null>(null); const [err, setErr] = useState<string | null>(null); const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    if (kind === "image") openImage(file).then((i) => { if (live) { setImg(i); setCrop(defaultCrop(i.width, i.height)); } })
      .catch(() => live && setFatal(t("Couldn't read this image. Try another photo or a PDF.")));
    return () => { live = false; };
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  const rotate = async () => {
    if (!img) return; setBusy("rotate");
    try { const r = await rotate90(img.uri); setImg(r); setCrop(defaultCrop(r.width, r.height)); } catch (e: any) { setErr(e?.message ?? String(e)); } finally { setBusy(null); }
  };
  const retake = async () => {
    try {
      const f = await pickFrom(p.source ?? "camera", lang); if (!f) return;
      const v = await validateFile(f, lang); if ("error" in v) { hError(); setErr(v.error); return; }
      setImg(null); setCrop(null); setErr(null); setFatal(null); setFile(f);
    } catch (e: any) { hError(); setErr(e?.message ?? String(e)); }
  };
  const upload = async () => {
    setBusy("upload"); setErr(null);
    try {
      const out = kind === "image" ? await prepareImage({ ...file, uri: img!.uri, width: img!.width, height: img!.height }, crop) : file;
      const r = await enqueueUpload(p.id, { uri: out.uri, name: out.name, mimeType: out.mimeType, size: out.size }, p.docType, p.reqId || null);
      if (r.duplicate) { hError(); setErr(t("This file is already in your uploads.")); return; }
      success(); close(p.id);
    } catch (e: any) { hError(); setErr(t(e?.message ?? String(e))); } finally { setBusy(null); }
  };

  const lowRes = !!crop && Math.min(crop.width, crop.height) < MIN_SHORT_SIDE;
  const canRetake = Platform.OS !== "web" && (p.source === "camera" || p.source === "library");
  const meta = kind === "image" ? (img && crop ? `${Math.round(crop.width)} × ${Math.round(crop.height)}` : "") : [t("PDF"), mb(file.size)].filter(Boolean).join(" · ");

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: Platform.OS === "ios" ? insets.top : insets.top + S.xs }} testID="upload-preview">
      <View style={{ paddingHorizontal: S.lg, paddingVertical: S.xs, flexDirection: "row", alignItems: "center", gap: S.sm }}>
        <CircleButton icon="xmark" label={t("Close")} onPress={() => close(p.id)} />
        <Text variant="headline" center numberOfLines={1} style={{ flex: 1 }} accessibilityRole="header">{t(p.title || "Document")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={[{ flex: 1, marginHorizontal: S.md, marginTop: S.xs, borderRadius: R.card, overflow: "hidden", backgroundColor: c.card, borderWidth: 1, borderColor: c.border }, curve]}>
        {fatal ? <EmptyState icon="exclamationmark.triangle.fill" title={t("Can't use this file")} message={fatal} />
          : kind === "image" ? (img && crop ? <CropBox uri={img.uri} width={img.width} height={img.height} rect={crop} onChange={setCrop} label={t("Drag the corners to the edges of the document.")} /> : <Skeleton r={0} style={{ flex: 1 }} />)
          : <PdfView uri={file.uri} name={file.name} />}
      </View>

      <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: Math.max(insets.bottom, S.md), gap: S.sm }}>
        {kind === "image" && !fatal && <Text variant="footnote" tone="secondary" center>{t("Drag the corners to the edges of the document.")}</Text>}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.xs, minHeight: 20 }}>
          <Text variant="footnote" tone="secondary" tabular numberOfLines={1} testID="preview-meta">{meta}</Text>
          {lowRes && <Text variant="footnote" tone="red" numberOfLines={2} style={{ flexShrink: 1 }}>· {t("Low resolution. Text may be hard to read.")}</Text>}
        </View>
        {(kind === "image" || canRetake) && !fatal && (
          <View style={{ flexDirection: "row", gap: S.sm }}>
            {kind === "image" && <View style={{ flex: 1 }}><Button title={t("Rotate")} icon="arrow.clockwise" size="M" variant="secondary" loading={busy === "rotate"} disabled={!img || !!busy} onPress={rotate} /></View>}
            {canRetake && <View style={{ flex: 1 }}><Button title={t(p.source === "library" ? "Choose another" : "Retake")} icon={p.source === "library" ? "photo.on.rectangle" : "camera.fill"} size="M" variant="secondary" disabled={!!busy} onPress={() => { tap(); retake(); }} /></View>}
          </View>
        )}
        <InlineError text={err} />
        <Button title={t("Upload")} icon="arrow.up.circle.fill" loading={busy === "upload"} disabled={!!fatal || !!busy || (kind === "image" && !img)} onPress={upload} />
      </View>
    </View>
  );
}

/** iOS renders the PDF itself (WKWebView). Android's WebView can't, so it shows the file card instead. */
function PdfView({ uri, name }: { uri: string; name: string }) {
  const c = useColors();
  if (Platform.OS === "ios") {
    const { WebView } = require("react-native-webview") as typeof import("react-native-webview");
    const dir = uri.slice(0, uri.lastIndexOf("/") + 1);
    return <WebView source={{ uri }} originWhitelist={["*"]} allowingReadAccessToURL={dir} allowFileAccess style={{ flex: 1, backgroundColor: c.card }}
      startInLoadingState renderLoading={() => <View style={StyleSheet.absoluteFill}><Skeleton r={0} style={{ flex: 1 }} /></View>} testID="pdf-view" />;
  }
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: S.sm, padding: S.xl }} testID="pdf-card">
      <Icon name="doc.fill" size={56} color={c.tint} />
      <Text variant="headline" center numberOfLines={2}>{name}</Text>
    </View>
  );
}
