import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { uploadDocument, UploadError } from "./data";

/** Offline-safe upload queue: jobs survive restarts (AsyncStorage + a local copy of the file on native)
 *  and are retried with backoff whenever the device is online and the app is in the foreground. */
export type UploadJob = {
  id: string; applicationId: string; documentType: string; requirementId: string | null;
  uri: string; name: string; mimeType: string | null; size: number | null;
  state: "queued" | "waiting" | "uploading" | "failed"; attempts: number; error?: string; createdAt: number; nextAt?: number;
};

const KEY = "ezvisa.uploads.v1";
const MAX_ATTEMPTS = 6; // network retries while online; offline time does not count
/** Exponential backoff with jitter: ~2s, 4s, 8s … capped at 60s. */
export const backoffMs = (attempt: number) => Math.min(60_000, 2000 * 2 ** (attempt - 1)) * (0.8 + Math.random() * 0.4);
let jobs: UploadJob[] = [];
let loaded = false;
let running = false;
let online = true;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const doneListeners = new Set<(applicationId: string) => void>();

const emit = () => listeners.forEach((l) => l());
const persist = () => AsyncStorage.setItem(KEY, JSON.stringify(jobs)).catch(() => {});
const update = (id: string, patch: Partial<UploadJob>) => { jobs = jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)); persist(); emit(); };

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    // A job left "uploading" by a killed app goes back to the queue.
    if (raw) jobs = (JSON.parse(raw) as UploadJob[]).map((j) => (j.state === "uploading" ? { ...j, state: "queued" } : j));
  } catch { jobs = []; }
  emit();
}

/** Keeps a private copy so the picked file is still there when the upload is retried later. */
async function keepCopy(uri: string, name: string): Promise<string> {
  if (Platform.OS === "web") return uri;
  try {
    const { File, Directory, Paths } = require("expo-file-system") as typeof import("expo-file-system");
    const dir = new Directory(Paths.document, "uploads");
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, `${Date.now()}_${name.replace(/[^\w.\-]+/g, "_").slice(-60)}`);
    await new File(uri).copy(dest);
    return dest.uri;
  } catch { return uri; }
}
function dropCopy(uri: string) {
  if (Platform.OS === "web" || !uri.includes("/uploads/")) return;
  try { const { File } = require("expo-file-system") as typeof import("expo-file-system"); const f = new File(uri); if (f.exists) f.delete(); } catch {}
}

export async function enqueueUpload(applicationId: string, file: { uri: string; name: string; mimeType?: string | null; size?: number | null }, documentType: string, requirementId?: string | null) {
  await load();
  const uri = await keepCopy(file.uri, file.name);
  jobs = [...jobs, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, applicationId, documentType, requirementId: requirementId ?? null, uri, name: file.name, mimeType: file.mimeType ?? null, size: file.size ?? null, state: "queued", attempts: 0, createdAt: Date.now() }];
  persist(); emit();
  process();
}

export function retryUpload(id: string) { update(id, { state: "queued", attempts: 0, error: undefined, nextAt: undefined }); process(); }
export function removeUpload(id: string) { const j = jobs.find((x) => x.id === id); if (j) dropCopy(j.uri); jobs = jobs.filter((x) => x.id !== id); persist(); emit(); }

async function process() {
  await load();
  if (running || !online) return;
  const now = Date.now();
  const job = jobs.find((j) => (j.state === "queued" || j.state === "waiting") && (!j.nextAt || j.nextAt <= now));
  if (!job) { const next = jobs.filter((j) => j.state === "waiting" && j.nextAt).map((j) => j.nextAt!).sort()[0]; if (next) { if (timer) clearTimeout(timer); timer = setTimeout(process, Math.max(500, next - now)); } return; }
  running = true;
  update(job.id, { state: "uploading" });
  try {
    await uploadDocument(job.applicationId, { uri: job.uri, name: job.name, mimeType: job.mimeType, size: job.size }, job.documentType, job.requirementId);
    dropCopy(job.uri);
    jobs = jobs.filter((j) => j.id !== job.id); persist(); emit();
    doneListeners.forEach((l) => l(job.applicationId));
    running = false;
    process();
  } catch (e: any) {
    running = false;
    const network = e instanceof UploadError ? e.network : false;
    const attempts = job.attempts + 1;
    if (network && !online) {
      update(job.id, { state: "waiting", error: "Offline · will upload when you're back online", nextAt: undefined }); // no attempt used
    } else if (network && attempts < MAX_ATTEMPTS) {
      const wait = backoffMs(attempts);
      update(job.id, { state: "waiting", attempts, nextAt: Date.now() + wait, error: `Connection problem · retrying in ${Math.round(wait / 1000)}s (${attempts}/${MAX_ATTEMPTS})` });
      process();
    } else {
      update(job.id, { state: "failed", attempts, error: e?.message ?? String(e) });
      process();
    }
  }
}

let started = false;
/** Called once from the root layout. */
export function startUploadQueue() {
  if (started) return;
  started = true;
  load().then(process);
  NetInfo.addEventListener((s) => {
    const was = online; online = s.isConnected !== false;
    if (!online) { jobs.filter((j) => j.state === "queued").forEach((j) => update(j.id, { state: "waiting", error: "Offline · will upload when you're back online" })); }
    if (online && !was) { jobs.filter((j) => j.state === "waiting").forEach((j) => update(j.id, { state: "queued", nextAt: undefined })); process(); }
  });
  AppState.addEventListener("change", (s) => { if (s === "active") process(); });
}

/** Jobs for one application (or all), re-rendering on change; `onDone` fires after each successful upload. */
export function useUploads(applicationId?: string, onDone?: () => void) {
  const pick = () => jobs.filter((j) => !applicationId || j.applicationId === applicationId);
  const [list, setList] = useState<UploadJob[]>(pick);
  useEffect(() => {
    const l = () => setList(pick()); listeners.add(l); load().then(l);
    const d = (id: string) => { if (!applicationId || id === applicationId) onDone?.(); }; doneListeners.add(d);
    return () => { listeners.delete(l); doneListeners.delete(d); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, onDone]);
  return list;
}
