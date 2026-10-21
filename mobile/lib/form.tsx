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

const KEY = "ezvisa.wizard.v1";
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

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) return;
      const d = JSON.parse(raw);
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
      AsyncStorage.setItem(KEY, JSON.stringify({ v: 1, form, page, savedAt: at, promptDismissed, draftId })).then(() => setSavedAt(at)).catch(() => {});
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
  }, []);
  return <C.Provider value={{ form, setForm, page, setPage, submitted, setSubmitted, hydrated, savedAt, clearDraft, promptDismissed, dismissPrompt: () => setPromptDismissed(true), draftId, cloudSavedAt, cloudError, flushDraft }}>{children}</C.Provider>;
}
export const useForm = () => useContext(C);
