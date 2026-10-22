// Wizard state with autosave, like the website (localStorage "visa-wizard-form"): every change is written to
// AsyncStorage (debounced) and restored on launch. In addition, once the user is signed in and has answered the first
// question, every answer is saved (debounced ~0.8 s, and right away when the question changes) to the live
// visa_applications table as application_status "draft", so it can be resumed on the website or another device and
// is visible to EZvisa staff; submitting turns that same row into "submitted".
// Server saves never overwrite newer data: see saveDraft in lib/data.ts (updated_at is the version). When the server
// copy changed elsewhere, autosave pauses and `conflict` asks the user which copy to keep. `sync` is only "saved"
// after the server confirmed the write of exactly the answers on screen.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Crypto from "expo-crypto";
import { coerceResidence, emptyForm, hasAnswers, needsSchengenVisa, type WizardForm } from "./wizard";
import { normalizePage, stepOfPage } from "./questions";
import { useAuth } from "./auth";
import { saveDraft, latestDraft, getDraft, fingerprint, sameVersion, cancelApplication, type ServerDraft } from "./data";
import { backoffMs } from "./uploads";
import { registerSecrets } from "./scrub";
export { emptyForm } from "./wizard";

const KEY = "ezvisa.wizard.v1"; // the open (active) draft, same format as before + `key` + sync metadata
const DRAFTS = "ezvisa.drafts.v2"; // every unfinished application saved on this phone (the active one included)
const DEBOUNCE_MS = 800;
const MAX_FAILED = 5; // non-network failures before autosave stops and asks for a tap (network failures retry forever)
const SIGN_OUT_SAVE_MS = 4000; // longest wait for a last save before sign-out
/** Sync metadata kept with each local draft so a killed app resumes exactly where the server copy stands. */
type Meta = {
  draftId: string | null; // server row id (made on the phone before the first insert)
  baseAt?: string | null; // server updated_at this phone last confirmed
  syncedFp?: string | null; // fingerprint of the content last confirmed by the server
  inflightFp?: string | null; // fingerprints of saves sent but not confirmed (e.g. app killed), "|"-separated, last 5
  owner?: string | null; // account email the draft is saved to; hidden from other accounts on this phone
};
export type LocalDraft = { key: string; form: WizardForm; page: string; savedAt: number } & Meta;
/** local: only on this phone (signed out / nothing answered yet) · saving · saved: confirmed by the server ·
 *  retrying / offline: not saved, will retry by itself · error: not saved, autosave stopped (tap to retry) · conflict. */
export type SyncStatus = "local" | "saving" | "saved" | "retrying" | "offline" | "error" | "conflict";
export type DraftConflict = { reason: "newer" | "existing" | "closed" | "gone"; server: ServerDraft | null };
const newKey = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
/** Old saves could hold "Other" + free text (or a visa-exempt country from a link). Clear it so the user re-picks from the visa-required list. */
function cleanNationality(f: WizardForm): WizardForm {
  const { nationalityOther: _drop, ...rest } = f as WizardForm & { nationalityOther?: string };
  return coerceResidence({ ...(rest as WizardForm), nationality: needsSchengenVisa(rest.nationality) ? rest.nationality : "", ...(rest.hasValidPassport === "no" && { passportNumber: "", passportExpiry: "" }), ...(rest.employmentStatus && rest.employmentStatus !== "employed" && { hasNOC: "" }) });
}
/** What a save of this screen writes: answers, step and question. */
const fpOf = (f: WizardForm, p: string) => fingerprint(f, stepOfPage(p), p.startsWith("q:") ? p : null);
const isNetworkError = (e: any) => /network|fetch|timeout|timed out|offline|abort/i.test(String(e?.message ?? e));

type Submitted = { applicationId: string; trackingToken?: string; reference?: string; amount?: number; destination?: string; spouse?: boolean; guestEmail?: string } | null;
type Ctx = {
  form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  page: string; setPage: (k: string) => void;
  submitted: Submitted; setSubmitted: (s: Submitted) => void;
  hydrated: boolean; savedAt: number | null; clearDraft: () => void;
  promptDismissed: boolean; dismissPrompt: () => void;
  draftId: string | null;
  /** Server-confirmed version of the open draft (updated_at), for submit. */
  baseAt: () => string | null;
  sync: SyncStatus; syncError: string | null; conflict: DraftConflict | null;
  /** Saves now. Returns the row id only when the server holds exactly what is on screen, otherwise null. */
  flushDraft: () => Promise<string | null>;
  retrySync: () => void;
  /** "server": load the server copy (newer / existing) · "mine": keep this phone's answers (newer: overwrite after the
   *  user chose it; existing: create a separate application; gone: save as a new draft) · "discard": drop this draft. */
  resolveConflict: (choice: "server" | "mine" | "discard") => void;
  /** True while a newer/closed/gone copy waits for the user's choice (read after an await, unlike `sync`). */
  hasConflict: () => boolean;
  /** Compares the open draft with the server copy; shows `conflict` when it changed elsewhere. */
  checkRemote: () => Promise<void>;
  /** Before sign-out (which wipes the phone): tries to save; false when the account is still missing changes. */
  saveBeforeSignOut: () => Promise<boolean>;
  /** All local drafts of the current account (or of nobody), newest first (the active one reflects the live form). */
  drafts: LocalDraft[]; activeKey: string;
  openDraft: (key: string) => WizardForm | null; startNew: (seed?: Partial<WizardForm>) => WizardForm; removeDraft: (key: string) => void;
  /** Opens a server draft (started on the website / another device) in the wizard. */
  openServerDraft: (id: string) => Promise<boolean>;
};
const C = createContext<Ctx>(null as any);


export function FormProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, epoch } = useAuth();
  const email = session?.user.email?.toLowerCase() ?? null;
  const [form, setForm] = useState<WizardForm>(emptyForm); const [page, setPage] = useState("q:destination");
  const [submitted, setSubmittedState] = useState<Submitted>(null); const submittedRef = useRef<Submitted>(null);
  const setSubmitted = (s: Submitted) => { submittedRef.current = s; setSubmittedState(s); };
  const [hydrated, setHydrated] = useState(false); const [savedAt, setSavedAt] = useState<number | null>(null);
  const [promptDismissed, setPromptDismissedState] = useState(false); const promptRef = useRef(false);
  const setPromptDismissed = (v: boolean) => { promptRef.current = v; setPromptDismissedState(v); };
  const [draftId, setDraftId] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncStatus>("local"); const [syncError, setSyncError] = useState<string | null>(null);
  const [conflict, setConflictState] = useState<DraftConflict | null>(null); const conflictRef = useRef<DraftConflict | null>(null);
  const setConflict = (c: DraftConflict | null) => { conflictRef.current = c; setConflictState(c); if (c) setSync("conflict"); };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const cloudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const failed = useRef(0);
  const skipNext = useRef(true); const saving = useRef<Promise<string | null> | null>(null);
  // Sync metadata lives in refs, so two quick saves can never insert two rows (state updates land a render later).
  const idRef = useRef<string | null>(null); const baseRef = useRef<string | null>(null);
  const syncedFp = useRef<string | null>(null); const inflightFp = useRef<string | null>(null); const ownerRef = useRef<string | null>(null);
  const allowNew = useRef(false); // the user chose to keep a separate application despite an open one for the same country
  const emailRef = useRef(email); emailRef.current = email;
  const online = useRef(true);
  const latest = useRef({ form, page }); latest.current = { form, page };
  const setDraft = (id: string | null) => { idRef.current = id; setDraftId(id); };
  const [drafts, setDrafts] = useState<LocalDraft[]>([]); const draftsRef = useRef<LocalDraft[]>([]);
  const [activeKey, setActiveKey] = useState(newKey); const keyRef = useRef(activeKey); keyRef.current = activeKey;
  const writeDrafts = (list: LocalDraft[]) => { const l = [...list].sort((a, b) => b.savedAt - a.savedAt); draftsRef.current = l; setDrafts(l); AsyncStorage.setItem(DRAFTS, JSON.stringify(l)).catch(() => {}); };
  const meta = (): Meta => ({ draftId: idRef.current, baseAt: baseRef.current, syncedFp: syncedFp.current, inflightFp: inflightFp.current, owner: ownerRef.current });
  const setMeta = (m: Partial<Meta>) => {
    setDraft(m.draftId ?? null); baseRef.current = m.baseAt ?? null; syncedFp.current = m.syncedFp ?? null; inflightFp.current = m.inflightFp ?? null; ownerRef.current = m.owner ?? null;
  };
  /** Writes the open draft (answers + sync metadata) to the phone right away. */
  const persistActive = (at = Date.now()) => {
    const { form: f, page: p } = latest.current; const m = meta();
    AsyncStorage.setItem(KEY, JSON.stringify({ v: 1, key: keyRef.current, form: f, page: p, savedAt: at, promptDismissed: promptRef.current, ...m })).then(() => setSavedAt(at)).catch(() => {});
    const rest = draftsRef.current.filter((x) => x.key !== keyRef.current);
    writeDrafts(hasAnswers(f) ? [{ key: keyRef.current, form: f, page: p, savedAt: at, ...m }, ...rest] : rest);
  };
  const dirty = () => fpOf(latest.current.form, latest.current.page) !== syncedFp.current;
  /** Content this phone sent but never got a confirmation for (any of these may be on the server). */
  const pending = () => (inflightFp.current ?? "").split("|").filter(Boolean);
  /** The open draft goes to the account: signed in, the first question answered (or already on the server), and not
   *  another account's draft. */
  const eligible = () => {
    const { form: f, page: p } = latest.current;
    return !!emailRef.current && !submittedRef.current && !!f.destination.trim() && (p !== "q:destination" || !!baseRef.current) && (!ownerRef.current || ownerRef.current === emailRef.current);
  };
  const clearTimers = () => { for (const r of [timer, cloudTimer, retryTimer]) if (r.current) { clearTimeout(r.current); r.current = null; } };

  useEffect(() => {
    AsyncStorage.multiGet([KEY, DRAFTS]).then(([[, raw], [, rawList]]) => {
      const d = raw ? JSON.parse(raw) : null;
      let list: LocalDraft[] = [];
      try { list = rawList ? (JSON.parse(rawList) as LocalDraft[]).filter((x) => x?.key && x.form).map((x) => ({ ...x, form: cleanNationality({ ...emptyForm, ...x.form }) })) : []; } catch { list = []; }
      const k = (d?.key as string | undefined) ?? newKey(); setActiveKey(k); keyRef.current = k;
      // Migration from the single-draft format: the existing saved draft becomes the first entry of the list.
      if (!rawList && d?.v === 1 && d.form && hasAnswers({ ...emptyForm, ...d.form }))
        list = [{ key: k, form: cleanNationality({ ...emptyForm, ...d.form }), page: typeof d.page === "string" ? d.page : "q:destination", savedAt: d.savedAt ?? Date.now(), draftId: d.draftId ?? null }];
      writeDrafts(list);
      if (!d) return;
      if (d?.v === 1 && d.form) {
        const f = cleanNationality({ ...emptyForm, ...d.form });
        const pg = normalizePage(typeof d.page === "string" ? d.page : null, f);
        setForm(f); setPage(pg); latest.current = { form: f, page: pg };
        if (f.nationality !== d.form.nationality || "nationalityOther" in d.form) // persist the cleanup right away
          AsyncStorage.setItem(KEY, JSON.stringify({ ...d, form: f, page: pg })).catch(() => {});
        setSavedAt(d.savedAt ?? null); setPromptDismissed(!!d.promptDismissed);
        // Drafts saved before sync metadata existed: the row id alone, the server copy is checked on first save.
        setMeta({ draftId: d.draftId ?? null, baseAt: d.baseAt ?? null, syncedFp: d.syncedFp ?? null, inflightFp: d.inflightFp ?? null, owner: d.owner ?? null });
      }
    }).catch(() => {}).finally(() => setHydrated(true));
  }, []);
  // Personal answers are removed from crash reports (lib/scrub.ts) by exact match.
  useEffect(() => {
    registerSecrets([form.firstName, form.lastName, form.email, form.phone, form.phoneLocal, form.passportNumber, form.dateOfBirth, form.spouseFirstName, form.spouseLastName, form.jobTitle, form.companyName, form.refusalDetails]);
  }, [form.firstName, form.lastName, form.email, form.phone, form.phoneLocal, form.passportNumber, form.dateOfBirth, form.spouseFirstName, form.spouseLastName, form.jobTitle, form.companyName, form.refusalDetails]);
  useEffect(() => {
    const u = session?.user; const md = (u?.user_metadata ?? {}) as Record<string, unknown>;
    registerSecrets([u?.email, md.full_name as string, md.first_name as string, md.last_name as string, md.name as string, u?.phone], "account");
  }, [session?.user]);
  // Local autosave (every change).
  useEffect(() => {
    if (!hydrated) return;
    if (skipNext.current) { skipNext.current = false; return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persistActive(), 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [form, page, promptDismissed, hydrated, draftId]);

  // Sign-out (lib/auth.tsx) has already wiped the saved drafts; drop the in-memory copy and sync state too so the next
  // person starts empty.
  const seenEpoch = useRef(epoch);
  useEffect(() => {
    if (seenEpoch.current === epoch) return;
    seenEpoch.current = epoch;
    clearTimers();
    skipNext.current = true;
    setForm({ ...emptyForm }); setPage("q:destination"); latest.current = { form: { ...emptyForm }, page: "q:destination" };
    setSubmitted(null); setSavedAt(null); setPromptDismissed(false);
    setMeta({ draftId: null }); allowNew.current = false; failed.current = 0;
    setConflict(null); setSync("local"); setSyncError(null);
    draftsRef.current = []; setDrafts([]);
    const k = newKey(); keyRef.current = k; setActiveKey(k);
  }, [epoch]);

  /** Server copy changed elsewhere since our last confirmed save? (Our own writes are recognised by fingerprint.) */
  const outdated = (s: ServerDraft) => !sameVersion(s.updatedAt, baseRef.current) && ![syncedFp.current, ...pending()].includes(s.fingerprint);
  /** Show a server copy in the wizard and treat it as the confirmed version (nothing is written until the next answer). */
  const applyServer = (s: ServerDraft) => {
    clearTimers(); failed.current = 0;
    const f = cleanNationality({ ...emptyForm, ...s.form }); const pg = normalizePage(s.question ? `q:${s.question}` : s.step, f);
    setForm(f); setPage(pg); latest.current = { form: f, page: pg };
    setMeta({ draftId: s.id, baseAt: s.updatedAt, syncedFp: fpOf(f, pg), inflightFp: null, owner: emailRef.current });
    setConflict(null); setSync("saved"); setSyncError(null);
    persistActive();
  };

  const scheduleRetry = (ms: number) => { if (retryTimer.current) clearTimeout(retryTimer.current); retryTimer.current = setTimeout(() => { retryTimer.current = null; flushRef.current(); }, ms); };
  const flushDraft = useCallback(async (): Promise<string | null> => {
    while (saving.current) await saving.current.catch(() => null); // one save at a time
    if (conflictRef.current) return null; // paused until the user picks a copy
    if (!eligible()) { setSync("local"); return null; }
    const { form: f, page: p } = latest.current; const fp = fpOf(f, p);
    if (fp === syncedFp.current && idRef.current && baseRef.current) { setSync("saved"); return idRef.current; }
    if (!online.current) { setSync("offline"); return null; }
    // Id and "save in flight" are on the phone before the request: a save cut off by a kill can never insert twice.
    if (!idRef.current) setDraft(Crypto.randomUUID());
    if (!ownerRef.current) ownerRef.current = emailRef.current;
    // Content this phone wrote or is writing: confirmed, a save cut off earlier, and this one.
    const known = [syncedFp.current, ...pending(), fp].filter(Boolean) as string[];
    inflightFp.current = [...pending().filter((x) => x !== fp), fp].slice(-5).join("|"); persistActive();
    setSync("saving"); if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    const id = idRef.current!;
    const run = saveDraft(f, stepOfPage(p), id, baseRef.current, p.startsWith("q:") ? p : undefined, known, !baseRef.current && !allowNew.current)
      .then((r) => {
        if (idRef.current !== id) return null; // the user switched drafts meanwhile
        if (!r.ok) { setConflict({ reason: r.reason, server: r.server }); return null; }
        baseRef.current = r.updatedAt; syncedFp.current = fp; inflightFp.current = null; failed.current = 0; setSyncError(null);
        persistActive();
        if (dirty()) { setSync("saving"); scheduleRetry(150); return null; } // more answers arrived during the save
        setSync("saved"); return id;
      })
      .catch((e: any) => {
        // The write may still have reached the server (reply lost): what the server holds is unknown now, so the next
        // attempt must write what is on screen even if the user went back to the last confirmed answers.
        if (idRef.current === id && fp !== syncedFp.current) syncedFp.current = null;
        const net = isNetworkError(e) || !online.current; setSyncError(e?.message ?? String(e));
        failed.current += 1;
        if (!online.current) setSync("offline"); // NetInfo saves again on reconnect
        else if (net || failed.current < MAX_FAILED) { setSync("retrying"); scheduleRetry(backoffMs(failed.current)); }
        else setSync("error");
        return null;
      });
    saving.current = run;
    try { return await run; } finally { if (saving.current === run) saving.current = null; }
  }, []);
  const flushRef = useRef(flushDraft); flushRef.current = flushDraft;

  /** Compares the open draft with the server (on launch, when the app returns to the foreground, when a draft opens). */
  const checkRemote = useCallback(async () => {
    if (!emailRef.current || !idRef.current || !baseRef.current || conflictRef.current || saving.current) return;
    if (ownerRef.current && ownerRef.current !== emailRef.current) return;
    const id = idRef.current; const base = baseRef.current;
    try {
      const s = await getDraft(id);
      // A save that started or finished meanwhile makes this reply stale: the next check or save decides.
      if (idRef.current !== id || conflictRef.current || saving.current || baseRef.current !== base) return;
      if (!s) setConflict({ reason: "gone", server: null });
      else if (s.status !== "draft") setConflict({ reason: "closed", server: s });
      else if (outdated(s)) setConflict({ reason: "newer", server: s });
      else if (!sameVersion(s.updatedAt, baseRef.current)) {
        // Our own write whose reply never came: the server holds that content, so the screen is saved only if it matches.
        baseRef.current = s.updatedAt;
        if (pending().includes(s.fingerprint)) { syncedFp.current = s.fingerprint; inflightFp.current = null; }
        persistActive();
        if (eligible() && dirty()) flushRef.current();
      }
    } catch { /* offline: checked again on the next save */ }
  }, []);

  // Cloud autosave: debounced after each change; also right away when the question changes (app/apply calls flushDraft).
  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (!eligible()) { if (!conflictRef.current) setSync("local"); return; }
    if (conflictRef.current) return;
    if (!dirty()) { if (idRef.current && baseRef.current && !saving.current) setSync("saved"); return; }
    setSync(online.current ? "saving" : "offline");
    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    cloudTimer.current = setTimeout(() => { flushDraft(); }, DEBOUNCE_MS);
    return () => { if (cloudTimer.current) clearTimeout(cloudTimer.current); };
  }, [form, page, hydrated, authLoading, email, submitted, flushDraft]);
  // Back online: save what is waiting. Background: save now (the app may be killed). Foreground: look for a newer copy.
  useEffect(() => {
    const onNet = (connected: boolean) => {
      const was = online.current; online.current = connected;
      if (!was && online.current && eligible() && dirty()) { failed.current = 0; flushRef.current(); }
      else if (was && !online.current && eligible() && dirty() && !conflictRef.current) setSync("offline");
    };
    const unsub = NetInfo.addEventListener((s) => onNet(s.isConnected !== false));
    // Web: NetInfo follows navigator.connection "change" only where it exists, which misses online/offline.
    const w = Platform.OS === "web" && typeof window !== "undefined" ? window : null;
    const up = () => onNet(true); const down = () => onNet(false);
    w?.addEventListener("online", up); w?.addEventListener("offline", down);
    const off = () => { unsub(); w?.removeEventListener("online", up); w?.removeEventListener("offline", down); };
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") { if (eligible() && dirty()) flushRef.current(); else checkRemote(); }
      else if (st === "background" && eligible() && dirty()) flushRef.current();
    });
    return () => { off(); sub.remove(); };
  }, [checkRemote]);
  // A draft saved to another account is never shown or synced (sign-out itself wipes drafts, lib/auth.tsx; this covers a
  // session that changes without one), so the wizard starts empty.
  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (ownerRef.current && email && ownerRef.current !== email) load(null);
    else if (email) checkRemote(); // launch after a kill / sign-in: is the server copy newer?
  }, [hydrated, authLoading, email]);
  // Resume: nothing on this phone -> load the account's latest draft (e.g. started on the website or another device).
  useEffect(() => {
    if (!hydrated || authLoading || !email) return;
    if (hasAnswers(latest.current.form) && idRef.current) return;
    let on = true;
    latestDraft().then((d) => {
      if (!on || !d) return;
      if (hasAnswers(latest.current.form) && idRef.current !== d.id) return; // local work on a different case wins
      if (draftsRef.current.some((x) => x.draftId === d.id && x.key !== keyRef.current)) return; // already on this phone
      applyServer(d);
    }).catch(() => {});
    return () => { on = false; };
  }, [hydrated, authLoading, email]);

  const clearDraft = useCallback(() => {
    clearTimers();
    skipNext.current = true;
    setForm({ ...emptyForm }); setPage("q:destination"); latest.current = { form: { ...emptyForm }, page: "q:destination" };
    setSavedAt(null); setPromptDismissed(false); setMeta({ draftId: null }); allowNew.current = false;
    setConflict(null); setSync("local"); setSyncError(null);
    AsyncStorage.removeItem(KEY).catch(() => {});
    writeDrafts(draftsRef.current.filter((x) => x.key !== keyRef.current));
    const k = newKey(); keyRef.current = k; setActiveKey(k);
  }, []);
  /** Switch the wizard to another saved draft (the current one is already in the list). */
  const load = (d: LocalDraft | null, seed: Partial<WizardForm> = {}) => {
    clearTimers();
    if (dirty() && eligible() && !conflictRef.current) persistActive(); // keep the one we leave
    const f = d ? { ...d.form, ...seed } : { ...emptyForm, ...seed }; const pg = d ? normalizePage(d.page, f) : "q:destination";
    const k = d?.key ?? newKey(); keyRef.current = k; setActiveKey(k);
    setForm(f); setPage(pg); setSavedAt(d?.savedAt ?? null); setPromptDismissed(false);
    setMeta(d ?? { draftId: null }); allowNew.current = false; failed.current = 0;
    setConflict(null); setSync("local"); setSyncError(null);
    latest.current = { form: f, page: pg };
    AsyncStorage.setItem(KEY, JSON.stringify({ v: 1, key: k, form: f, page: pg, savedAt: d?.savedAt ?? null, promptDismissed: false, ...meta() })).catch(() => {});
    if (d?.draftId) setTimeout(() => checkRemote(), 0);
    return f;
  };
  const openDraft = useCallback((key: string) => { const d = draftsRef.current.find((x) => x.key === key); return d ? load(d) : null; }, []);
  const startNew = useCallback((seed?: Partial<WizardForm>) => load(null, seed), []);
  const removeDraft = useCallback((key: string) => {
    // Its server draft is discarded too (unpaid drafts only, migration 0007), or "resume" would bring it back.
    const d = draftsRef.current.find((x) => x.key === key);
    if (d?.draftId && emailRef.current && (!d.owner || d.owner === emailRef.current)) cancelApplication(d.draftId).catch(() => {});
    if (key === keyRef.current) { clearDraft(); return; }
    writeDrafts(draftsRef.current.filter((x) => x.key !== key));
  }, [clearDraft]);
  const openServerDraft = useCallback(async (id: string) => {
    const local = draftsRef.current.find((x) => x.draftId === id && (!x.owner || x.owner === emailRef.current));
    if (local) { load(local); return true; }
    const s = await getDraft(id);
    if (!s || s.status !== "draft") return false;
    load(null); applyServer(s); return true;
  }, []);

  const resolveConflict = useCallback((choice: "server" | "mine" | "discard") => {
    const c = conflictRef.current; if (!c) return;
    if (choice === "discard") { clearDraft(); return; }
    if (choice === "server") {
      if (c.server && (c.reason === "newer" || c.reason === "existing")) {
        // The phone's own draft is replaced by the server copy it duplicated (existing) or that is newer (newer).
        const other = c.reason === "existing" ? draftsRef.current.find((x) => x.draftId === c.server!.id && x.key !== keyRef.current) : null;
        if (other) writeDrafts(draftsRef.current.filter((x) => x.key !== other.key));
        applyServer(c.server);
      } else if (c.reason === "closed") clearDraft(); // the UI then opens the submitted application
      return;
    }
    // "mine": an explicit choice, never automatic.
    if (c.reason === "newer" && c.server) { baseRef.current = c.server.updatedAt; syncedFp.current = null; } // overwrite the copy the user has seen
    else if (c.reason === "existing") allowNew.current = true;
    else { setDraft(null); baseRef.current = null; syncedFp.current = null; inflightFp.current = null; } // gone / closed: a new draft
    failed.current = 0; setConflict(null); persistActive(); flushDraft();
  }, [clearDraft, flushDraft]);

  const retrySync = useCallback(() => { failed.current = 0; flushDraft(); }, [flushDraft]);
  const saveBeforeSignOut = useCallback(async () => {
    // At most a few seconds: with the server unreachable the client retries for a long time, and the Sign out button
    // must answer. Not saved by then = unsaved (the warning says so).
    if (eligible() && dirty() && !conflictRef.current) await Promise.race([flushDraft(), new Promise((r) => setTimeout(r, SIGN_OUT_SAVE_MS))]);
    const openUnsaved = eligible() && dirty();
    // Other drafts on this phone: only the open one can be saved here; the others count as unsaved when their answers
    // were never confirmed by the server (sign-out wipes them from the phone).
    const othersUnsaved = draftsRef.current.some((d) => d.key !== keyRef.current && hasAnswers(d.form) && (!d.owner || d.owner === emailRef.current) && d.syncedFp !== fpOf(d.form, d.page));
    return !openUnsaved && !othersUnsaved;
  }, [flushDraft]);

  const visible = drafts.filter((d) => !d.owner || d.owner === email);
  return <C.Provider value={{ form, setForm, page, setPage, submitted, setSubmitted, hydrated, savedAt, clearDraft, promptDismissed, dismissPrompt: () => setPromptDismissed(true), draftId, baseAt: () => baseRef.current, sync, syncError, conflict, flushDraft, retrySync, resolveConflict, checkRemote, hasConflict: () => !!conflictRef.current, saveBeforeSignOut, drafts: visible, activeKey, openDraft, startNew, removeDraft, openServerDraft }}>{children}</C.Provider>;
}
export const useForm = () => useContext(C);
