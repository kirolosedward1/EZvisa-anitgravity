// Wizard state with autosave, like the website (localStorage "visa-wizard-form"): every change is written to
// AsyncStorage (debounced) and restored on launch. In addition, once the signed-in user has completed the
// personal step, the draft is saved to the live visa_applications table (application_status "draft") so it can be
// resumed on another device and is visible to EZvisa staff; submitting turns that same row into "submitted".
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { coerceResidence, emptyForm, validatePersonal, hasAnswers, needsSchengenVisa, type WizardForm } from "./wizard";
import { normalizePage, stepOfPage } from "./questions";
import { useAuth } from "./auth";
import { saveDraft, latestDraft } from "./data";
export { emptyForm } from "./wizard";

const KEY = "ezvisa.wizard.v1"; // the open (active) draft, same format as before + `key`
const DRAFTS = "ezvisa.drafts.v2"; // every unfinished application saved on this phone (the active one included)
export type LocalDraft = { key: string; form: WizardForm; page: string; savedAt: number; draftId: string | null };
const newKey = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
/** Old saves could hold "Other" + free text (or a visa-exempt country from a link). Clear it so the user re-picks from the visa-required list. */
function cleanNationality(f: WizardForm): WizardForm {
  const { nationalityOther: _drop, ...rest } = f as WizardForm & { nationalityOther?: string };
  return coerceResidence({ ...(rest as WizardForm), nationality: needsSchengenVisa(rest.nationality) ? rest.nationality : "", ...(rest.hasValidPassport === "no" && { passportNumber: "", passportExpiry: "" }), ...(rest.employmentStatus && rest.employmentStatus !== "employed" && { hasNOC: "" }) });
}
type Submitted = { applicationId: string; trackingToken?: string; reference?: string; amount?: number; destination?: string; spouse?: boolean; guestEmail?: string } | null;
type Ctx = {
  form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  page: string; setPage: (k: string) => void;
  submitted: Submitted; setSubmitted: (s: Submitted) => void;
  hydrated: boolean; savedAt: number | null; clearDraft: () => void;
  promptDismissed: boolean; dismissPrompt: () => void;
  draftId: string | null; cloudSavedAt: number | null; cloudError: string | null; flushDraft: () => Promise<string | null>;
  /** All local drafts, newest first (the active one reflects the live form). */
  drafts: LocalDraft[]; activeKey: string;
  openDraft: (key: string) => WizardForm | null; startNew: (seed?: Partial<WizardForm>) => WizardForm; removeDraft: (key: string) => void;
};
const C = createContext<Ctx>(null as any);


export function FormProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [form, setForm] = useState<WizardForm>(emptyForm); const [page, setPage] = useState("q:destination");
  const [submitted, setSubmitted] = useState<Submitted>(null);
  const [hydrated, setHydrated] = useState(false); const [savedAt, setSavedAt] = useState<number | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [cloudSavedAt, setCloudSavedAt] = useState<number | null>(null); const [cloudError, setCloudError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const cloudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNext = useRef(true); const saving = useRef<Promise<string | null> | null>(null);
  // The draft id lives in a ref too, so two quick saves can never insert two rows (state updates land a render later).
  const idRef = useRef<string | null>(null);
  const latest = useRef({ form, page }); latest.current = { form, page };
  const setDraft = (id: string | null) => { idRef.current = id; setDraftId(id); };
  const [drafts, setDrafts] = useState<LocalDraft[]>([]); const draftsRef = useRef<LocalDraft[]>([]);
  const [activeKey, setActiveKey] = useState(newKey); const keyRef = useRef(activeKey); keyRef.current = activeKey;
  const writeDrafts = (list: LocalDraft[]) => { const l = [...list].sort((a, b) => b.savedAt - a.savedAt); draftsRef.current = l; setDrafts(l); AsyncStorage.setItem(DRAFTS, JSON.stringify(l)).catch(() => {}); };

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
        setForm(f); setPage(pg);
        if (f.nationality !== d.form.nationality || "nationalityOther" in d.form) // persist the cleanup right away
          AsyncStorage.setItem(KEY, JSON.stringify({ ...d, form: f, page: pg })).catch(() => {});
        setSavedAt(d.savedAt ?? null); setPromptDismissed(!!d.promptDismissed); setDraft(d.draftId ?? null);
      }
    }).catch(() => {}).finally(() => setHydrated(true));
  }, []);
  // Local autosave (every change).
  useEffect(() => {
    if (!hydrated) return;
    if (skipNext.current) { skipNext.current = false; return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const at = Date.now();
      AsyncStorage.setItem(KEY, JSON.stringify({ v: 1, key: keyRef.current, form, page, savedAt: at, promptDismissed, draftId })).then(() => setSavedAt(at)).catch(() => {});
      const rest = draftsRef.current.filter((x) => x.key !== keyRef.current);
      writeDrafts(hasAnswers(form) ? [{ key: keyRef.current, form, page, savedAt: at, draftId }, ...rest] : rest);
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [form, page, promptDismissed, hydrated, draftId]);

  const email = session?.user.email ?? null;
  const flushDraft = useCallback(async () => {
    if (!email) return null;
    if (Object.keys(validatePersonal(latest.current.form)).length) return idRef.current;
    while (saving.current) await saving.current.catch(() => null); // one save at a time
    const { form: f, page: p } = latest.current;
    const run = saveDraft(f, stepOfPage(p), idRef.current, p).then((nid) => { setDraft(nid); setCloudSavedAt(Date.now()); setCloudError(null); return nid; })
      .catch((e: any) => { setCloudError(e?.message ?? String(e)); return idRef.current; });
    saving.current = run;
    try { return await run; } finally { if (saving.current === run) saving.current = null; }
  }, [email]);
  // Cloud autosave (debounced) once signed in and the personal step is complete.
  useEffect(() => {
    if (!hydrated || !email || submitted) return;
    if (Object.keys(validatePersonal(form)).length) return;
    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    cloudTimer.current = setTimeout(() => { flushDraft(); }, 1500);
    return () => { if (cloudTimer.current) clearTimeout(cloudTimer.current); };
  }, [form, page, hydrated, email, submitted, flushDraft]);
  // Resume: nothing on this phone -> load the account's latest draft (e.g. started on another device).
  useEffect(() => {
    if (!hydrated || !email) return;
    if (hasAnswers(latest.current.form) && idRef.current) return;
    let on = true;
    latestDraft().then((d) => {
      if (!on || !d) return;
      if (hasAnswers(latest.current.form) && idRef.current !== d.id) return; // local work on a different case wins
      { const cf = cleanNationality({ ...emptyForm, ...d.form }); setForm(cf); setPage(normalizePage(d.question ? `q:${d.question}` : d.step, cf)); } setDraft(d.id); setCloudSavedAt(d.updatedAt ? Date.parse(d.updatedAt) : Date.now());
    }).catch(() => {});
    return () => { on = false; };
  }, [hydrated, email]);

  const clearDraft = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    skipNext.current = true;
    setForm({ ...emptyForm }); setPage("q:destination"); setSavedAt(null); setPromptDismissed(false); setDraft(null); setCloudSavedAt(null);
    AsyncStorage.removeItem(KEY).catch(() => {});
    writeDrafts(draftsRef.current.filter((x) => x.key !== keyRef.current));
    const k = newKey(); keyRef.current = k; setActiveKey(k);
  }, []);
  /** Switch the wizard to another saved draft (the current one is already in the list). */
  const load = (d: LocalDraft | null, seed: Partial<WizardForm> = {}) => {
    if (timer.current) clearTimeout(timer.current); if (cloudTimer.current) clearTimeout(cloudTimer.current);
    const f = d ? { ...d.form, ...seed } : { ...emptyForm, ...seed }; const pg = d ? normalizePage(d.page, f) : "q:destination";
    const k = d?.key ?? newKey(); keyRef.current = k; setActiveKey(k);
    setForm(f); setPage(pg); setDraft(d?.draftId ?? null); setSavedAt(d?.savedAt ?? null); setCloudSavedAt(null); setPromptDismissed(false);
    latest.current = { form: f, page: pg };
    AsyncStorage.setItem(KEY, JSON.stringify({ v: 1, key: k, form: f, page: pg, savedAt: d?.savedAt ?? null, promptDismissed: false, draftId: d?.draftId ?? null })).catch(() => {});
    return f;
  };
  const openDraft = useCallback((key: string) => { const d = draftsRef.current.find((x) => x.key === key); return d ? load(d) : null; }, []);
  const startNew = useCallback((seed?: Partial<WizardForm>) => load(null, seed), []);
  const removeDraft = useCallback((key: string) => {
    if (key === keyRef.current) { clearDraft(); return; }
    writeDrafts(draftsRef.current.filter((x) => x.key !== key));
  }, [clearDraft]);
  return <C.Provider value={{ form, setForm, page, setPage, submitted, setSubmitted, hydrated, savedAt, clearDraft, promptDismissed, dismissPrompt: () => setPromptDismissed(true), draftId, cloudSavedAt, cloudError, flushDraft, drafts, activeKey, openDraft, startNew, removeDraft }}>{children}</C.Provider>;
}
export const useForm = () => useContext(C);
