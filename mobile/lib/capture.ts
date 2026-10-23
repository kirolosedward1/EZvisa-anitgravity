// Document capture for uploads: camera, photo library (expo-image-picker) or files (expo-document-picker).
// Photos are cropped / rotated on the preview screen and re-encoded on the phone with expo-image-manipulator
// (HEIC/PNG/WebP -> JPEG, resized and compressed under the size limit). All of this runs in Expo Go.
// Real edge detection / auto-crop and MRZ reading need a native build (VisionKit / ML Kit), see docs/archive/AUDIT-V2.md.
import { ActionSheetIOS, Alert, Linking, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { translate, type Lang } from "./i18n";

export const MAX_BYTES = 5 * 1024 * 1024; // visa_documents bucket file_size_limit (5 MB, read from the live bucket)
/** Photos are compressed to this, well under MAX_BYTES and the website's 4.5 MB request limit (Vercel functions). */
export const TARGET_BYTES = 2.5 * 1024 * 1024;
export const MIN_SHORT_SIDE = 1000;        // px; below this, passport text is often unreadable
export const MIN_BYTES = 40 * 1024;        // a real photo/scan of a page is rarely smaller
export type Picked = { uri: string; name: string; mimeType?: string | null; size?: number | null; width?: number; height?: number };
export type Source = "camera" | "library" | "files" | "scan";
export type Rect = { originX: number; originY: number; width: number; height: number };
type TFn = (s: string, v?: Record<string, string | number>) => string;
const tr = (lang: Lang): TFn => (s, v) => translate(lang, s, v);

/** Pure quality check, also used by tests. Returns blocking error or warnings. */
export function checkQuality(f: Picked, lang: Lang = "en"): { error?: string; warnings: string[] } {
  const t = tr(lang);
  const w: string[] = [];
  if (f.size != null && f.size > MAX_BYTES) return { error: t("File is larger than 5 MB."), warnings: [] };
  const img = (f.mimeType ?? "").startsWith("image/") || /\.(jpe?g|png|heic|webp)$/i.test(f.name);
  if (img && f.width && f.height && Math.min(f.width, f.height) < MIN_SHORT_SIDE) w.push(t("Low resolution ({w}×{h}). Text may be hard to read.", { w: f.width, h: f.height }));
  if (f.size != null && f.size < MIN_BYTES) w.push(t("Very small file ({k} KB). It may be blurry or cropped.", { k: Math.round(f.size / 1024) }));
  return { warnings: w };
}

// ---- File type -----------------------------------------------------------------------------------------------------
export type Kind = "pdf" | "image";
const IMG_MIME = /^image\/(jpe?g|png|heic|heif|webp)$/i;
const IMG_EXT = /\.(jpe?g|png|heic|heif|webp)$/i;
/** pdf, image (converted to JPEG before upload) or null when the type is not accepted. Pure, used by tests. */
export function fileKind(f: { name: string; mimeType?: string | null }): Kind | null {
  const mime = (f.mimeType ?? "").toLowerCase(); const name = f.name.toLowerCase();
  const unknown = !mime || mime === "application/octet-stream";
  if (mime === "application/pdf" || (unknown && name.endsWith(".pdf"))) return "pdf";
  if (IMG_MIME.test(mime) || (unknown && IMG_EXT.test(name))) return "image";
  return null;
}
const isPdfHeader = (b: Uint8Array) => b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === "%PDF-";

async function head(uri: string, n: number): Promise<Uint8Array | null> {
  try {
    if (Platform.OS === "web") return new Uint8Array((await (await fetch(uri)).arrayBuffer()).slice(0, n));
    const { File } = require("expo-file-system") as typeof import("expo-file-system");
    const h = new File(uri).open(); try { return h.readBytes(n); } finally { h.close(); }
  } catch { return null; }
}
export async function fileSize(uri: string): Promise<number | null> {
  try {
    if (Platform.OS !== "web") { const { File } = require("expo-file-system") as typeof import("expo-file-system"); const f = new File(uri); if (f.exists) return f.size; }
    return (await (await fetch(uri)).blob()).size;
  } catch { return null; }
}

/** Blocks files we can't accept, with a message that says what to do instead. */
export async function validateFile(f: Picked, lang: Lang): Promise<{ kind: Kind } | { error: string }> {
  const t = tr(lang); const kind = fileKind(f);
  if (!kind) return { error: t("“{name}” can't be uploaded. Use a PDF or a photo (JPG, PNG or HEIC).", { name: f.name }) };
  const size = f.size ?? (await fileSize(f.uri));
  if (size === 0) return { error: t("This file is empty. Choose another one.") };
  if (kind === "pdf") {
    if (size != null && size > MAX_BYTES) return { error: t("This PDF is {mb} MB. The limit is 5 MB. Scan the pages with the camera instead, or export a smaller copy.", { mb: (size / 1048576).toFixed(1) }) };
    const b = await head(f.uri, 5);
    if (b && !isPdfHeader(b)) return { error: t("This file isn't a valid PDF. Choose another file.") };
  }
  return { kind };
}

// ---- Image processing (expo-image-manipulator) ---------------------------------------------------------------------
const IM = () => require("expo-image-manipulator") as typeof import("expo-image-manipulator");
const LONG_EDGES = [2400, 2000, 1600]; // 2400 px on the long side keeps passport text and the MRZ sharp
const QUALITIES = [0.85, 0.75, 0.65];
const jpgName = (name: string) => `${name.replace(/\.[^./]+$/, "") || "scan"}.jpg`;

/** Rotates a photo 90° clockwise (the crop is then redone on the rotated image). */
export async function rotate90(uri: string): Promise<{ uri: string; width: number; height: number }> {
  const { ImageManipulator, SaveFormat } = IM();
  const ref = await ImageManipulator.manipulate(uri).rotate(90).renderAsync();
  const r = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
  return { uri: r.uri, width: r.width, height: r.height };
}

/** Crops, then re-encodes as JPEG (any input incl. HEIC) and steps the size down until it is under TARGET_BYTES. */
export async function prepareImage(src: Picked, crop?: Rect | null): Promise<Picked> {
  const { ImageManipulator, SaveFormat } = IM();
  const ctx = ImageManipulator.manipulate(src.uri);
  if (crop) ctx.crop({ originX: Math.round(crop.originX), originY: Math.round(crop.originY), width: Math.round(crop.width), height: Math.round(crop.height) });
  const base = await ctx.renderAsync();
  let last: Picked | null = null;
  for (const edge of LONG_EDGES) {
    const scale = Math.min(1, edge / Math.max(base.width, base.height));
    const ref = scale < 1 ? await ImageManipulator.manipulate(base).resize(base.width >= base.height ? { width: Math.round(base.width * scale) } : { height: Math.round(base.height * scale) }).renderAsync() : base;
    for (const q of QUALITIES) {
      const r = await ref.saveAsync({ format: SaveFormat.JPEG, compress: q });
      const size = await fileSize(r.uri);
      last = { uri: r.uri, name: jpgName(src.name), mimeType: "image/jpeg", size, width: r.width, height: r.height };
      if (size != null && size <= TARGET_BYTES) return last;
    }
  }
  if (last && last.size != null && last.size <= MAX_BYTES) return last;
  throw new Error("This photo is too large to upload, even after compressing. Try again closer to the document.");
}

// ---- Permissions ---------------------------------------------------------------------------------------------------
const ask = (title: string, msg: string, no: string, yes: string) =>
  new Promise<boolean>((res) => Alert.alert(title, msg, [{ text: no, style: "cancel", onPress: () => res(false) }, { text: yes, onPress: () => res(true) }], { cancelable: true, onDismiss: () => res(false) }));

/** Camera permission in context: a one-line reason before the system prompt, and a way to Settings once it is off.
 *  Right after the person says no to the system prompt we don't nag; the Settings prompt comes on the next try. */
export async function ensureCamera(lang: Lang): Promise<boolean> {
  if (Platform.OS === "web") return true;
  const t = tr(lang);
  let p = await ImagePicker.getCameraPermissionsAsync();
  if (p.granted) return true;
  if (p.canAskAgain) {
    if (p.status === ImagePicker.PermissionStatus.UNDETERMINED && !(await ask(t("Allow camera?"), t("EZvisa uses the camera only to scan documents for your application."), t("Not now"), t("Continue")))) return false;
    p = await ImagePicker.requestCameraPermissionsAsync();
    return p.granted;
  }
  if (await ask(t("Camera is off"), t("Turn on Camera for EZvisa in Settings to scan documents. You can still choose a photo or a file."), t("Cancel"), t("Open Settings"))) Linking.openSettings().catch(() => {});
  return false;
}

// ---- Sources -------------------------------------------------------------------------------------------------------
/** Multi-page scan: camera pages, each resized and compressed, combined into one PDF on the phone with expo-print. */
async function scanPdf(lang: Lang): Promise<Picked | null> {
  const t = tr(lang);
  if (!(await ensureCamera(lang))) return null;
  const { ImageManipulator, SaveFormat } = IM();
  const pages: string[] = [];
  for (;;) {
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1, exif: false });
    if (r.canceled || !r.assets?.[0]) break;
    const a = r.assets[0]; const s = Math.min(1, 1800 / Math.max(a.width, a.height));
    const ctx = ImageManipulator.manipulate(a.uri); if (s < 1) ctx.resize(a.width >= a.height ? { width: Math.round(a.width * s) } : { height: Math.round(a.height * s) });
    const page = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
    if (page.base64) pages.push(page.base64);
    const more = await new Promise<boolean>((res) => Alert.alert(t(pages.length === 1 ? "{n} page" : "{n} pages", { n: pages.length }), undefined, [{ text: t("Done"), style: "cancel", onPress: () => res(false) }, { text: t("Add page"), onPress: () => res(true) }]));
    if (!more) break;
  }
  if (!pages.length) return null;
  const Print = require("expo-print") as typeof import("expo-print");
  const html = `<html><body style="margin:0">${pages.map((b) => `<div style="page-break-after:always;height:100vh;display:flex;align-items:center;justify-content:center"><img src="data:image/jpeg;base64,${b}" style="max-width:100%;max-height:100vh"/></div>`).join("")}</body></html>`;
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  return { uri, name: `scan_${Date.now()}.pdf`, mimeType: "application/pdf", size: await fileSize(uri) };
}

/** Returns the raw pick; photos are cropped/compressed on the preview screen. null = cancelled (or camera not allowed). */
export async function pickFrom(source: Source, lang: Lang = "en"): Promise<Picked | null> {
  if (source === "scan") return scanPdf(lang);
  if (source === "files") {
    const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return null;
    const a = r.assets[0]; return { uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size ?? null };
  }
  if (source === "camera" && !(await ensureCamera(lang))) return null;
  // Full quality here: the one lossy step is prepareImage, after the crop.
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsEditing: false, exif: false };
  const r = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  const ext = (a.mimeType ?? "image/jpeg").split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  return { uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.${ext}`, mimeType: a.mimeType ?? "image/jpeg", size: a.fileSize ?? null, width: a.width, height: a.height };
}

/** Asks where the document comes from (camera / photos / files). Web goes straight to files. */
export function chooseSource(lang: Lang): Promise<Source | null> {
  const t = (s: string) => translate(lang, s);
  if (Platform.OS === "web") return Promise.resolve("files");
  return new Promise((res) => {
    const opts: [Source, string][] = [["camera", t("Take photo")], ["scan", t("Scan pages (PDF)")], ["library", t("Choose photo")], ["files", t("Choose file")]];
    if (Platform.OS === "ios") ActionSheetIOS.showActionSheetWithOptions({ options: [...opts.map((o) => o[1]), t("Cancel")], cancelButtonIndex: opts.length }, (i) => res(i < opts.length ? opts[i][0] : null));
    else Alert.alert(t("Add document"), undefined, [...opts.map(([v, l]) => ({ text: l, onPress: () => res(v) })), { text: t("Cancel"), style: "cancel" as const, onPress: () => res(null) }], { cancelable: true, onDismiss: () => res(null) });
  });
}
