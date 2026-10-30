// Data & storage (canvas DataStorage): what EZvisa keeps on this phone, clearing the cache, and a copy of the person's
// own data. Sizes are measured, never estimated: the upload queue's private copies (Paths.document/uploads, lib/uploads),
// the cache folder (images, picker copies, receipts) and the saved answers and settings (AsyncStorage). Globi and the rest
// of the app ship inside the build and can't be cleared, so they are not listed.
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { fetchTravellers } from "./travellers";

export type StorageUsage = { queued: number; cache: number; saved: number; total: number };

const FS = () => require("expo-file-system") as typeof import("expo-file-system");
type Dir = InstanceType<ReturnType<typeof FS>["Directory"]>;

/** Bytes under a folder (walks sub-folders; stops after a few thousand entries so a huge cache can't stall the screen). */
function dirBytes(dir: Dir, budget = { left: 4000 }): number {
  let sum = 0;
  try {
    if (!dir.exists) return 0;
    const { File, Directory } = FS();
    for (const e of dir.list()) {
      if (--budget.left < 0) break;
      if (e instanceof File) sum += e.size ?? 0;
      else if (e instanceof Directory) sum += dirBytes(e, budget);
    }
  } catch {}
  return sum;
}

/** AsyncStorage bytes (UTF-16 strings are counted as their UTF-8 length, what the phone stores). */
async function savedBytes(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys(); if (!keys.length) return 0;
    const pairs = await AsyncStorage.multiGet(keys);
    const enc = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
    return pairs.reduce((n, [k, v]) => n + (enc ? enc.encode(k).length + enc.encode(v ?? "").length : k.length + (v?.length ?? 0)), 0);
  } catch { return 0; }
}

export async function storageUsage(): Promise<StorageUsage> {
  const saved = await savedBytes();
  if (Platform.OS === "web") return { queued: 0, cache: 0, saved, total: saved };
  const { Directory, Paths } = FS();
  const queued = dirBytes(new Directory(Paths.document, "uploads"));
  const budget = { left: 4000 };
  const cache = ownCache().reduce((n, e) => n + (e instanceof FS().File ? e.size ?? 0 : dirBytes(e as Dir, budget)), 0);
  return { queued, cache, saved, total: queued + cache + saved };
}

/** Frees EZvisa's own cache files and the image cache. Never touches the upload queue's copies (they live in Paths.document)
 *  or any file a queued upload still points to. Originals stay in the application on the server. */
export async function clearCache(keepUris: string[] = []): Promise<void> {
  try { const { Image } = require("expo-image") as typeof import("expo-image"); await Image.clearDiskCache(); await Image.clearMemoryCache(); } catch {}
  if (Platform.OS === "web") return;
  const keep = [...new Set(keepUris)];
  for (const e of ownCache()) {
    if (keep.some((u) => u === e.uri || u.startsWith(e.uri))) continue;
    try { e.delete(); } catch {}
  }
}

/** The cache entries EZvisa itself made: picker and camera copies, edited photos, printed PDFs (receipts, trip plans),
 *  data exports, and expo-image's disk cache (iOS SDWebImage, Android Glide). Other libraries' files (crash reports
 *  waiting to send, update downloads) are left alone. */
const OWN_DIRS = ["ImagePicker", "DocumentPicker", "ImageManipulator", "Camera", "Print", "com.hackemist.SDImageCache", "image_manager_disk_cache", "expo-image"];
const OWN_FILE = /\.(pdf|json|jpe?g|png|heic|heif|webp)$/i;
function ownCache(): (Dir | InstanceType<ReturnType<typeof FS>["File"]>)[] {
  try {
    const { Directory, File, Paths } = FS(); const root = new Directory(Paths.cache);
    if (!root.exists) return [];
    return root.list().filter((e) => (e instanceof Directory && OWN_DIRS.includes(e.name)) || (e instanceof File && OWN_FILE.test(e.name)));
  } catch { return []; }
}

/** 1.8 MB, 640 KB, 12 KB: one decimal under 10, none above; never "0 KB" for something that exists. */
export function formatBytes(n: number, lang: "en" | "ar" = "en"): string {
  const u = lang === "ar" ? ["بايت", "ك.ب", "م.ب", "ج.ب"] : ["B", "KB", "MB", "GB"];
  if (n < 1024) return `${n} ${u[0]}`;
  let v = n / 1024; let i = 1;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? Math.max(0.1, Math.round(v * 10) / 10) : Math.round(v)} ${u[i]}`;
}

const parse = (s: unknown) => { if (typeof s !== "string") return s; try { return JSON.parse(s); } catch { return s; } };

/** Everything EZvisa holds about the signed-in person, as one JSON document: the account details, every application
 *  (ownership = the row's email, as everywhere in the app) and the saved travellers. Uploaded files are not included:
 *  they stay private in the application and the team can send copies on request. */
export async function exportMyData(): Promise<{ json: string; fileName: string }> {
  if (!supabase) throw new Error("Not connected");
  const { data: { session } } = await supabase.auth.getSession();
  const u = session?.user; if (!u?.email) throw new Error("Sign in to export your data.");
  const { data: rows, error } = await supabase.from("visa_applications").select("*").eq("email", u.email).order("created_at", { ascending: false });
  if (error) throw error;
  const travellers = await fetchTravellers().catch(() => []);
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const doc = {
    exportedAt: new Date().toISOString(), service: "EZvisa (ezvisa.net)",
    account: { email: u.email, name: meta.full_name ?? null, phone: meta.phone ?? null, citizenship: meta.citizenship ?? null, memberSince: u.created_at ?? null },
    applications: (rows ?? []).map((r: Record<string, unknown>) => ({ ...r, additional_notes: parse(r.additional_notes) })),
    travellers,
    note: "Uploaded documents are kept privately with your application and are not part of this file.",
  };
  return { json: JSON.stringify(doc, null, 2), fileName: `EZvisa-my-data-${new Date().toISOString().slice(0, 10)}.json` };
}

/** Saves the export: the share sheet on iPhone and Android (Files, Mail, AirDrop), a download on the web. */
export async function shareMyData(): Promise<void> {
  const { json, fileName } = await exportMyData();
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000); return;
  }
  const { File, Paths } = FS();
  const f = new File(Paths.cache, fileName);
  if (f.exists) f.delete();
  f.create(); f.write(json);
  const Sharing = require("expo-sharing") as typeof import("expo-sharing");
  try { if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(f.uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: fileName }); }
  // iOS resolves once the sheet has closed, so the copy can go; Android may still be reading it (the cache clears it later).
  finally { if (Platform.OS === "ios") try { f.delete(); } catch {} }
}
