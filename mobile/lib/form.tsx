// Wizard state with autosave, like the website (localStorage "visa-wizard-form"): every change is written to
// AsyncStorage (debounced) and restored on launch. In addition, once the signed-in user has completed the
// personal step, the draft is saved to the live visa_applications table (application_status "draft") so it can be
// resumed on another device and is visible to EZvisa staff; submitting turns that same row into "submitted".
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyForm, validatePersonal, hasAnswers, type WizardForm } from "./wizard";
import { useAuth } from "./auth";
import { saveDraft, latestDraft } from "./data";
export { emptyForm } from "./wizard";

const KEY = "ezvisa.wizard.v1";
type Submitted = { applicationId: string; trackingToken?: string; reference?: string; amount?: number; destination?: string; spouse?: boolean } | null;
type Ctx = {
  form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  page: string; setPage: (k: string) => void;
  submitted: Submitted; setSubmitted: (s: Submitted) => void;
  hydrated: boolean; savedAt: number | null; clearDraft: () => void;
  promptDismissed: boolean; dismissPrompt: () => void;
  draftId: string | null; cloudSavedAt: number | null; cloudError: string | null; flushDraft: () => Promise<string | null>;
};
const C = createContext<Ctx>(null as any);

const STEPS = ["personal", "spouse", "employment", "trip-details", "payment"];
const LEGACY_PAGE: Record<string, string> = { destination: "personal", nationality: "personal", residence: "personal", contact: "personal", passport: "personal", marital: "personal", spouse: "spouse", employment: "employment", work: "employment", purpose: "trip-details", dates: "trip-details", history: "trip-details", stay: "trip-details", funds: "trip-details", itinerary: "trip-details" };

export function FormProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [form, setForm] = useState<WizardForm>(emptyForm); const [page, setPage] = useState("personal");
  const [submitted, setSubmitted] = useState<Submitted>(null);
  const [hydrated, setHydrated] = useState(false); const [savedAt, setSavedAt] = useState<number | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [cloudSavedAt, setCloudSavedAt] = useState<number | null>(null); const [cloudError, setCloudError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const cloudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNext = useRef(true); const saving = useRef<Promise<string | null> | null>(null);
  const latest = useRef({ form, page, draftId }); latest.current = { form, page, draftId };

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d?.v === 1 && d.form) {
        setForm({ ...emptyForm, ...d.form }); if (typeof d.page === "string") setPage(STEPS.includes(d.page) ? d.page : (LEGACY_PAGE[d.page] ?? "personal"));
        setSavedAt(d.savedAt ?? null); setPromptDismissed(!!d.promptDismissed); setDraftId(d.draftId ?? null);
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
    const { form: f, page: p, draftId: id } = latest.current;
    if (Object.keys(validatePersonal(f)).length) return id;
    if (saving.current) await saving.current.catch(() => null);
    const run = saveDraft(f, p, latest.current.draftId).then((nid) => { setDraftId(nid); setCloudSavedAt(Date.now()); setCloudError(null); return nid; })
      .catch((e: any) => { setCloudError(e?.message ?? String(e)); return latest.current.draftId; });
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
    if (hasAnswers(latest.current.form) && latest.current.draftId) return;
    let on = true;
    latestDraft().then((d) => {
      if (!on || !d) return;
      if (hasAnswers(latest.current.form) && latest.current.draftId !== d.id) return; // local work on a different case wins
      setForm(d.form); setPage(STEPS.includes(d.step) ? d.step : "personal"); setDraftId(d.id); setCloudSavedAt(d.updatedAt ? Date.parse(d.updatedAt) : Date.now());
    }).catch(() => {});
    return () => { on = false; };
  }, [hydrated, email]);

  const clearDraft = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    skipNext.current = true;
    setForm({ ...emptyForm }); setPage("personal"); setSavedAt(null); setPromptDismissed(false); setDraftId(null); setCloudSavedAt(null);
    AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);
  return <C.Provider value={{ form, setForm, page, setPage, submitted, setSubmitted, hydrated, savedAt, clearDraft, promptDismissed, dismissPrompt: () => setPromptDismissed(true), draftId, cloudSavedAt, cloudError, flushDraft }}>{children}</C.Provider>;
}
export const useForm = () => useContext(C);
