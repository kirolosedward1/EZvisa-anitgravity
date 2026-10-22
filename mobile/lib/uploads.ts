import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import * as Crypto from "expo-crypto";
import { useEffect, useState } from "react";
import { uploadDocument, UploadError } from "./data";
import { supabase } from "./supabase";
import { track } from "./analytics";

/** Offline-safe upload queue: jobs survive restarts (AsyncStorage + a local copy of the file on native) and are retried
 *  with backoff whenever the device is online and the app is in the foreground.
 *  No duplicates: each job has a stable UUID that is also the storage object name, so a retry after a lost response (or
 *  after the app was killed mid-upload) writes the same object again instead of a new one. The same file (MD5) can't be
 *  queued twice for the same document. */
export type UploadState = "queued" | "uploading" | "done" | "failed";
export type UploadJob = {
  id: string; applicationId: string; documentType: string; requirementId: string | null;
  uri: string; name: string; mimeType: string | null; size: number | null; md5?: string | null;
  state: UploadState; attempts: number; error?: string; createdAt: number;
  /** queued only: earliest retry time (backoff) and whether it is waiting for the connection */
  nextAt?: number; offline?: boolean; doneAt?: number;
};

const KEY = "ezvisa.uploads.v1";
const MAX_ATTEMPTS = 6; // network retries while online; offline time does not count
const TIMEOUT_MS = 90_000; // a stalled request (e.g. airplane mode mid-upload) must not block the queue
const DONE_TTL = 24 * 3600_000; // finished rows stay visible for a day
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Exponential backoff with jitter: ~2s, 4s, 8s … capped at 60s. */
export const backoffMs = (attempt: number) => Math.min(60_000, 2000 * 2 ** (attempt - 1)) * (0.8 + Math.random() * 0.4);
let jobs: UploadJob[] = [];
let loading: Promise<void> | null = null;
let running = false;
let online = true;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const doneListeners = new Set<(applicationId: string) => void>();

const emit = () => listeners.forEach((l) => l());
const persist = () => AsyncStorage.setItem(KEY, JSON.stringify(jobs)).catch(() => {});
const update = (id: string, patch: Partial<UploadJob>) => { jobs = jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)); persist(); emit(); };

/** Restores the queue saved before the app was closed or killed. Pure, used by tests. */
export function restore(saved: any[], now = Date.now(), uuid: () => string = Crypto.randomUUID): UploadJob[] {
  return saved
    .filter((j) => j && typeof j.id === "string" && !(j.state === "done" && now - (j.doneAt ?? 0) > DONE_TTL))
    .map((j) => ({
      ...j,
      id: UUID.test(j.id) ? j.id : uuid(), // jobs from before v10 had no UUID; they never reached a stable path
      // "uploading" = the app was killed mid-request; "waiting" = the pre-v10 name for a queued retry
      state: j.state === "uploading" || j.state === "waiting" ? "queued" : j.state,
      nextAt: undefined,
    }));
}

function load() {
  return (loading ??= (async () => {
    try { const raw = await AsyncStorage.getItem(KEY); if (raw) { jobs = restore(JSON.parse(raw)); persist(); } } catch { jobs = []; }
    dropOrphans();
    emit();
  })());
}

const FS = () => require("expo-file-system") as typeof import("expo-file-system");
/** Keeps a private copy so the picked file is still there when the upload is retried later (cache can be purged). */
async function keepCopy(uri: string, id: string, name: string): Promise<string> {
  if (Platform.OS === "web") return uri;
  try {
    const { File, Directory, Paths } = FS();
    const dir = new Directory(Paths.document, "uploads");
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, `${id}_${name.replace(/[^\w.\-]+/g, "_").slice(-60)}`);
    await new File(uri).copy(dest);
    return dest.uri;
  } catch { return uri; }
}
function dropCopy(uri: string) {
  if (Platform.OS === "web" || !uri.includes("/uploads/")) return;
  try { const f = new (FS().File)(uri); if (f.exists) f.delete(); } catch {}
}
/** Deletes copies no job points to (e.g. left by a crash between copy and save, or by pre-v10 removals). */
function dropOrphans() {
  if (Platform.OS === "web") return;
  try {
    const { Directory, Paths, File } = FS(); const dir = new Directory(Paths.document, "uploads");
    if (!dir.exists) return;
    const keep = new Set(jobs.map((j) => j.uri));
    for (const f of dir.list()) if (f instanceof File && !keep.has(f.uri)) f.delete();
  } catch {}
}
/** Sign-out: the queue holds copies of passports and bank statements, so it is emptied and the copies deleted. */
export function clearQueue() {
  jobs = []; persist(); emit();
  if (Platform.OS === "web") return;
  try { const { Directory, Paths } = FS(); const dir = new Directory(Paths.document, "uploads"); if (dir.exists) dir.delete(); } catch {}
}
/** Uploads that haven't reached the server yet (named before signing out). */
export const pendingUploads = () => jobs.length;
function md5Of(uri: string): string | null {
  if (Platform.OS === "web") return null;
  try { return new (FS().File)(uri).md5; } catch { return null; }
}

export type EnqueueResult = { id: string; duplicate: boolean };
let chain: Promise<unknown> = Promise.resolve(); // enqueues run one at a time, so a double tap can't add a file twice

export function enqueueUpload(applicationId: string, file: { uri: string; name: string; mimeType?: string | null; size?: number | null }, documentType: string, requirementId?: string | null): Promise<EnqueueResult> {
  const run = chain.then(async (): Promise<EnqueueResult> => {
    await load();
    const md5 = md5Of(file.uri);
    const same = md5 ? jobs.find((j) => j.applicationId === applicationId && j.documentType === documentType && j.md5 === md5) : undefined;
    if (same) {
      if (same.state === "failed") retryUpload(same.id);
      return { id: same.id, duplicate: same.state !== "failed" };
    }
    const id = Crypto.randomUUID();
    const uri = await keepCopy(file.uri, id, file.name);
    jobs = [...jobs, { id, applicationId, documentType, requirementId: requirementId ?? null, uri, name: file.name, mimeType: file.mimeType ?? null, size: file.size ?? null, md5, state: "queued", offline: !online, attempts: 0, createdAt: Date.now() }];
    persist(); emit();
    process();
    return { id, duplicate: false };
  });
  chain = run.catch(() => {});
  return run;
}

export function retryUpload(id: string) { update(id, { state: "queued", attempts: 0, error: undefined, nextAt: undefined, offline: !online }); process(); }
export function removeUpload(id: string) { const j = jobs.find((x) => x.id === id); if (!j || j.state === "uploading") return; dropCopy(j.uri); jobs = jobs.filter((x) => x.id !== id); persist(); emit(); }
export function clearDone(applicationId?: string) { jobs = jobs.filter((j) => j.state !== "done" || (applicationId && j.applicationId !== applicationId)); persist(); emit(); }

const withTimeout = <T,>(p: Promise<T>) => new Promise<T>((res, rej) => {
  const t = setTimeout(() => rej(new UploadError("The upload timed out.", true)), TIMEOUT_MS);
  p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
});

function schedule(now: number) {
  const next = jobs.filter((j) => j.state === "queued" && j.nextAt).map((j) => j.nextAt!).sort((a, b) => a - b)[0];
  if (timer) { clearTimeout(timer); timer = null; }
  if (next) timer = setTimeout(process, Math.max(500, next - now));
}

async function process() {
  await load();
  if (running || !online) return;
  const now = Date.now();
  const job = jobs.find((j) => j.state === "queued" && (!j.nextAt || j.nextAt <= now));
  if (!job) { schedule(now); return; }
  running = true;
  update(job.id, { state: "uploading", offline: false, error: undefined });
  try {
    await withTimeout(uploadDocument(job.applicationId, { uri: job.uri, name: job.name, mimeType: job.mimeType, size: job.size }, job.documentType, job.id));
    dropCopy(job.uri);
    update(job.id, { state: "done", doneAt: Date.now(), nextAt: undefined, error: undefined });
    doneListeners.forEach((l) => l(job.applicationId));
    track("upload_done", { docType: job.documentType as any, ok: true });
  } catch (e: any) {
    const network = e instanceof UploadError ? e.network : false;
    const attempts = job.attempts + 1;
    if (network && !online) update(job.id, { state: "queued", offline: true, nextAt: undefined }); // no attempt used
    else if (network && attempts < MAX_ATTEMPTS) update(job.id, { state: "queued", attempts, nextAt: Date.now() + backoffMs(attempts), error: e?.message });
    else { update(job.id, { state: "failed", attempts, error: e?.message ?? String(e) }); track("upload_done", { docType: job.documentType as any, ok: false }); }
  } finally {
    running = false;
  }
  process();
}

const isOnline = (s: NetInfoState) => s.isConnected !== false && s.isInternetReachable !== false;

let started = false;
/** Called once from the root layout. */
export function startUploadQueue() {
  if (started) return;
  started = true;
  load().then(process);
  NetInfo.addEventListener((s) => {
    const was = online; online = isOnline(s);
    if (online === was) return;
    if (!online) jobs.filter((j) => j.state === "queued").forEach((j) => update(j.id, { offline: true }));
    else { jobs.filter((j) => j.state === "queued").forEach((j) => update(j.id, { offline: false, nextAt: undefined })); process(); } // back online: retry now
  });
  AppState.addEventListener("change", (s) => { if (s === "active") process(); });
  supabase?.auth.onAuthStateChange((e) => { if (e === "SIGNED_OUT") clearQueue(); }); // also runs after account deletion
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
