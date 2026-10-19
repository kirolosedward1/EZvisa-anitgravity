// Document capture for uploads: camera, photo library (expo-image-picker) or files (expo-document-picker), with basic
// quality checks. Real edge detection / auto-crop and MRZ reading need a native build (VisionKit / ML Kit), see AUDIT-V2.md.
import { ActionSheetIOS, Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { translate, type Lang } from "./i18n";

export const MAX_BYTES = 10 * 1024 * 1024; // same limit as the website upload
export const MIN_SHORT_SIDE = 1000;        // px; below this, passport text is often unreadable
export const MIN_BYTES = 40 * 1024;        // a real photo/scan of a page is rarely smaller
export type Picked = { uri: string; name: string; mimeType?: string | null; size?: number | null; width?: number; height?: number };
export type Source = "camera" | "library" | "files";

/** Pure quality check, also used by tests. Returns blocking error or warnings. */
export function checkQuality(f: Picked, lang: Lang = "en"): { error?: string; warnings: string[] } {
  const t = (s: string, v?: Record<string, string | number>) => translate(lang, s, v);
  const w: string[] = [];
  if (f.size != null && f.size > MAX_BYTES) return { error: t("File is larger than 10 MB."), warnings: [] };
  const img = (f.mimeType ?? "").startsWith("image/") || /\.(jpe?g|png|heic|webp)$/i.test(f.name);
  if (img && f.width && f.height && Math.min(f.width, f.height) < MIN_SHORT_SIDE) w.push(t("Low resolution ({w}×{h}). Text may be hard to read.", { w: f.width, h: f.height }));
  if (f.size != null && f.size < MIN_BYTES) w.push(t("Very small file ({k} KB). It may be blurry or cropped.", { k: Math.round(f.size / 1024) }));
  return { warnings: w };
}

async function sizeOf(uri: string): Promise<number | null> { try { return (await (await fetch(uri)).blob()).size; } catch { return null; } }

export async function pickFrom(source: Source): Promise<Picked | null> {
  if (source === "files") {
    const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return null;
    const a = r.assets[0]; return { uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size ?? null };
  }
  if (source === "camera") {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw new Error("Camera access is off for EZvisa. Turn it on in Settings.");
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.85, allowsEditing: false, exif: false };
  const r = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  const ext = (a.mimeType ?? "image/jpeg").split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  return { uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.${ext}`, mimeType: a.mimeType ?? "image/jpeg", size: a.fileSize ?? (await sizeOf(a.uri)), width: a.width, height: a.height };
}

/** Asks where the document comes from (camera / photos / files). Web goes straight to files. */
export function chooseSource(lang: Lang): Promise<Source | null> {
  const t = (s: string) => translate(lang, s);
  if (Platform.OS === "web") return Promise.resolve("files");
  return new Promise((res) => {
    const opts: [Source, string][] = [["camera", t("Take photo")], ["library", t("Choose photo")], ["files", t("Choose file")]];
    if (Platform.OS === "ios") ActionSheetIOS.showActionSheetWithOptions({ options: [...opts.map((o) => o[1]), t("Cancel")], cancelButtonIndex: opts.length }, (i) => res(i < opts.length ? opts[i][0] : null));
    else Alert.alert(t("Add document"), undefined, [...opts.map(([v, l]) => ({ text: l, onPress: () => res(v) })), { text: t("Cancel"), style: "cancel" as const, onPress: () => res(null) }], { cancelable: true, onDismiss: () => res(null) });
  });
}
/** Shows the warnings; resolves true to upload anyway. */
export function confirmWarnings(warnings: string[], lang: Lang): Promise<boolean> {
  const t = (s: string) => translate(lang, s);
  if (!warnings.length) return Promise.resolve(true);
  if (Platform.OS === "web") return Promise.resolve(typeof window !== "undefined" ? window.confirm(`${t("Check the photo")}\n\n${warnings.join("\n")}\n\n${t("Upload anyway?")}`) : true);
  return new Promise((res) => Alert.alert(t("Check the photo"), warnings.join("\n\n"), [{ text: t("Choose another"), style: "cancel", onPress: () => res(false) }, { text: t("Upload anyway"), onPress: () => res(true) }]));
}
