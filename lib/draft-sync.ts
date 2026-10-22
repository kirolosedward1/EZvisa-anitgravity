"use client"

// Server drafts for the /apply wizard, shared with the EZvisa mobile app.
// A signed-in user's answers are saved (debounced) to their own visa_applications row with application_status
// "draft", in the same format the app writes: additional_notes.wizard = the answers, wizardStep = the step slug.
// The app or another browser can resume the same row. updated_at is the version: every write is
// "... where updated_at = <the value we last saw>", so a newer copy saved elsewhere is never overwritten silently;
// instead `conflict` asks the user which copy to keep. `status` says "saved" only after the server confirmed the write.
// localStorage keeps the draft id and version (the wizard already keeps its answers there).
import { useCallback, useEffect, useRef, useState } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createBrowserClient } from "@/lib/supabase/client"

const META_KEY = "visa_wizard_draft_meta"
const WIZARD_KEY = "visa_wizard_data"
/** Sign-out: the next person on this browser sees none of the previous person's answers (the app does the same). */
export function clearWizardData() {
  try {
    localStorage.removeItem(WIZARD_KEY)
    localStorage.removeItem(META_KEY)
  } catch {}
}
const DEBOUNCE_MS = 800
const COLS = "id, application_status, additional_notes, updated_at"

export type SubmitPlan =
  | { kind: "guest" }
  | { kind: "draft"; draftId: string; draftVersion: string | null; accessToken: string }
  | { kind: "submitted"; applicationId: string } // already submitted from this page (e.g. the payment step failed)
  | { kind: "blocked"; message: string }
export type DraftSyncStatus = "local" | "saving" | "saved" | "retrying" | "offline" | "error" | "conflict"
export type ServerDraft = { id: string; wizard: Record<string, unknown>; step: string; updatedAt: string | null; status: string; editedOn: string | null }
export type DraftConflict = { reason: "newer" | "existing" | "closed" | "gone"; server: ServerDraft | null }
type Meta = { draftId: string | null; baseAt: string | null; syncedFp: string | null; inflightFp: string | null; owner: string | null; allowNew?: boolean }
type Row = { id: string; application_status: string | null; additional_notes: string | null; updated_at: string | null }

const EMPTY_META: Meta = { draftId: null, baseAt: null, syncedFp: null, inflightFp: null, owner: null }
const parseNotes = (s: string | null): Record<string, any> => {
  if (!s) return {}
  try {
    const j = JSON.parse(s)
    return j && typeof j === "object" ? j : {}
  } catch {
    return {}
  }
}
/** Same instant (the server may format the timestamp differently from the value we hold). */
const sameVersion = (a?: string | null, b?: string | null) => !!a && !!b && (a === b || Date.parse(a) === Date.parse(b))
const backoffMs = (n: number) => Math.min(60_000, 2000 * 2 ** (n - 1)) * (0.8 + Math.random() * 0.4)
const isNetworkError = (e: unknown) => /network|fetch|timeout|offline|abort/i.test(String((e as Error)?.message ?? e))

/** Answers only: files are uploaded after payment and can't be stored in the draft. */
export function serializableAnswers(form: object): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || typeof v === "function") continue
    if (typeof File !== "undefined" && v instanceof File) continue
    out[k] = v
  }
  return JSON.parse(JSON.stringify(out))
}
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>
    return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`
  }
  return JSON.stringify(v ?? null)
}
function fingerprint(wizard: Record<string, unknown>, step: string): string {
  const s = stable({ f: wizard, s: step })
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `${(h >>> 0).toString(36)}.${s.length}`
}
function toServerDraft(r: Row): ServerDraft {
  const n = parseNotes(r.additional_notes)
  return {
    id: r.id,
    wizard: (n.wizard ?? {}) as Record<string, unknown>,
    step: n.wizardStep ?? "personal",
    updatedAt: r.updated_at,
    status: r.application_status ?? "submitted",
    editedOn: n.lastEditedOn ?? (n.source === "mobile-app" ? "app" : null),
  }
}
const days = (a: string, b: string) => Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")

/** Column mapping of /api/submit-application, plus the answers and step for resume (same keys as the app). */
function columns(w: Record<string, unknown>, email: string, step: string, prev: Record<string, any>) {
  const prevWizard = (prev.wizard ?? {}) as Record<string, unknown>
  // Keep app-only keys (e.g. passportExpiry); if the phone number changed here, drop the app's split phone fields.
  const keep = { ...prevWizard }
  if (str(prevWizard.phone) !== str(w.phone)) {
    delete keep.phoneLocal
    delete keep.phoneCountry
  }
  const start = str(w.travelStartDate)
  const end = str(w.travelEndDate)
  return {
    full_name: `${str(w.firstName)} ${str(w.lastName)}`.trim() || "Draft",
    email,
    phone: str(w.phone),
    nationality: str(w.nationality),
    destination_country: str(w.destination),
    date_of_birth: str(w.dateOfBirth) || null,
    entry_date: start || null,
    exit_date: end || null,
    travel_purpose: str(w.purposeOfTrip),
    passport_number: str(w.passportNumber) || null,
    duration_days: start && end ? days(start, end) : null,
    previous_schengen_visa: w.isFirstSchengenVisa ? w.isFirstSchengenVisa === "no" : false,
    previous_rejections: w.previousRefusals === "yes",
    rejection_details: w.previousRefusals === "yes" ? str(w.refusalDetails) || null : null,
    additional_notes: JSON.stringify({
      ...prev,
      maritalStatus: w.maritalStatus,
      employmentStatus: w.employmentStatus,
      jobTitle: str(w.jobTitle),
      companyName: str(w.companyName),
      monthlySalary: w.monthlySalary,
      spouseAccompanying: w.spouseAccompanying || "no",
      source: prev.source ?? "website",
      lastEditedOn: "website",
      wizardStep: step,
      wizardQuestion: undefined, // the website resumes per step; the app then starts at that step's first question
      wizard: { ...keep, ...w },
    }),
  }
}

type SaveResult = { ok: true; updatedAt: string } | { ok: false; reason: DraftConflict["reason"]; server: ServerDraft | null }

/** Same rules as the app's saveDraft (mobile/lib/data.ts). */
async function saveDraft(sb: SupabaseClient, email: string, id: string, w: Record<string, unknown>, step: string, base: string | null, known: string[], checkExisting: boolean): Promise<SaveResult> {
  const { data: cur, error: ce } = await sb.from("visa_applications").select(COLS).eq("id", id).eq("email", email).maybeSingle<Row>()
  if (ce) throw ce
  const now = new Date().toISOString() // replaced by the updated_at trigger where it exists; read back either way
  if (!cur) {
    if (base) return { ok: false, reason: "gone", server: null }
    if (checkExisting && str(w.destination)) {
      const { data: open, error: oe } = await sb.from("visa_applications").select(COLS).eq("email", email).eq("application_status", "draft").eq("destination_country", str(w.destination)).neq("id", id).order("updated_at", { ascending: false }).limit(1)
      if (oe) throw oe
      if (open?.[0]) return { ok: false, reason: "existing", server: toServerDraft(open[0] as Row) }
    }
    const { data, error } = await sb.from("visa_applications")
      .insert({ id, ...columns(w, email, step, {}), application_status: "draft", payment_status: "pending", has_passport: false, has_photos: false, has_bank_statements: false, has_employment_proof: false, updated_at: now })
      .select("updated_at").single()
    if (error) throw error
    return { ok: true, updatedAt: (data?.updated_at as string) ?? now }
  }
  const server = toServerDraft(cur)
  if (server.status !== "draft") return { ok: false, reason: "closed", server }
  if (!sameVersion(cur.updated_at, base) && !known.includes(fingerprint(server.wizard, server.step))) return { ok: false, reason: "newer", server }
  const { data, error } = await sb.from("visa_applications").update({ ...columns(w, email, step, parseNotes(cur.additional_notes)), updated_at: now })
    .eq("id", id).eq("email", email).eq("application_status", "draft").eq("updated_at", cur.updated_at as string).select("updated_at")
  if (error) throw error
  if (data?.[0]) return { ok: true, updatedAt: (data[0].updated_at as string) ?? now }
  const { data: again } = await sb.from("visa_applications").select(COLS).eq("id", id).eq("email", email).maybeSingle<Row>()
  return { ok: false, reason: !again ? "gone" : again.application_status !== "draft" ? "closed" : "newer", server: again ? toServerDraft(again) : null }
}

function readMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? { ...EMPTY_META, ...JSON.parse(raw) } : { ...EMPTY_META }
  } catch {
    return { ...EMPTY_META }
  }
}

/**
 * @param form   the wizard answers (files are ignored)
 * @param step   the current step slug (personal | spouse | employment | trip-details | payment)
 * @param ready    the wizard finished restoring local data
 * @param answered the user has answered something (link pre-fill and profile auto-fill don't count). Like the app,
 *                 a draft row is created only after a real answer; a draft already on the server keeps saving.
 * @param onLoad   called with a server copy to show (resume, or the user picked the newer copy)
 * @param normalize the form and step the page will show for a server copy (defaults, coercions), so loading a copy is
 *                  recognised as saved instead of being written straight back
 * @param onReset  another account signed in: the page clears the previous person's answers
 */
export function useDraftSync({ form, step, ready, answered, onLoad, normalize, onReset }: { form: object; step: string; ready: boolean; answered: boolean; onLoad: (d: ServerDraft) => void; normalize?: (d: ServerDraft) => { form: object; step: string }; onReset?: () => void }) {
  const sb = useRef<SupabaseClient | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [status, setStatus] = useState<DraftSyncStatus>("local")
  const [conflict, setConflictState] = useState<DraftConflict | null>(null)
  const meta = useRef<Meta>({ ...EMPTY_META })
  const conflictRef = useRef<DraftConflict | null>(null)
  const latest = useRef({ w: serializableAnswers(form), step })
  latest.current = { w: serializableAnswers(form), step }
  const emailRef = useRef<string | null>(null)
  emailRef.current = email
  const answeredRef = useRef(answered)
  answeredRef.current = answered
  const saving = useRef<Promise<string | null> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null)
  const failed = useRef(0)
  const noResume = useRef(false)
  const onLoadRef = useRef(onLoad)
  onLoadRef.current = onLoad
  const normalizeRef = useRef(normalize)
  normalizeRef.current = normalize
  const onResetRef = useRef(onReset)
  onResetRef.current = onReset
  const submittedId = useRef<string | null>(null) // submitted in this page: a second Pay click reuses it

  const persist = () => {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta.current))
    } catch {}
  }
  const setConflict = (c: DraftConflict | null) => {
    conflictRef.current = c
    setConflictState(c)
    if (c) setStatus("conflict")
  }
  const fpNow = () => fingerprint(latest.current.w, latest.current.step)
  const dirty = () => fpNow() !== meta.current.syncedFp
  const eligible = () => {
    const owner = meta.current.owner
    return !!emailRef.current && !!str(latest.current.w.destination) && (answeredRef.current || !!meta.current.baseAt) && (!owner || owner === emailRef.current)
  }
  const outdated = (s: ServerDraft) => !sameVersion(s.updatedAt, meta.current.baseAt) && ![meta.current.syncedFp, meta.current.inflightFp].includes(fingerprint(s.wizard, s.step))

  const apply = useCallback((s: ServerDraft) => {
    const shown = normalizeRef.current ? normalizeRef.current(s) : { form: s.wizard, step: s.step }
    meta.current = { draftId: s.id, baseAt: s.updatedAt, syncedFp: fingerprint(serializableAnswers(shown.form), shown.step), inflightFp: null, owner: emailRef.current }
    persist()
    setConflict(null)
    setStatus("saved")
    onLoadRef.current(s)
  }, [])

  const flush = useCallback(async (): Promise<string | null> => {
    while (saving.current) await saving.current.catch(() => null)
    const client = sb.current
    if (!client || conflictRef.current) return null
    if (!eligible()) {
      setStatus("local")
      return null
    }
    const { w, step: s } = latest.current
    const fp = fingerprint(w, s)
    if (fp === meta.current.syncedFp && meta.current.draftId && meta.current.baseAt) {
      setStatus("saved")
      return meta.current.draftId
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus("offline")
      return null
    }
    // Id and "save in flight" are stored before the request, so an interrupted save can never insert twice.
    if (!meta.current.draftId) meta.current.draftId = crypto.randomUUID()
    if (!meta.current.owner) meta.current.owner = emailRef.current
    const known = [meta.current.syncedFp, meta.current.inflightFp, fp].filter(Boolean) as string[]
    meta.current.inflightFp = fp
    persist()
    setStatus("saving")
    if (retry.current) clearTimeout(retry.current)
    const id = meta.current.draftId
    const run = saveDraft(client, emailRef.current!, id, w, s, meta.current.baseAt, known, !meta.current.baseAt && !meta.current.allowNew)
      .then((r) => {
        if (meta.current.draftId !== id) return null
        if (!r.ok) {
          setConflict({ reason: r.reason, server: r.server })
          return null
        }
        meta.current = { ...meta.current, baseAt: r.updatedAt, syncedFp: fp, inflightFp: null }
        failed.current = 0
        persist()
        if (dirty()) {
          setStatus("saving")
          retry.current = setTimeout(() => flushRef.current(), 150)
          return null
        }
        setStatus("saved")
        return id
      })
      .catch((e) => {
        failed.current += 1
        if (typeof navigator !== "undefined" && navigator.onLine === false) setStatus("offline")
        else if (isNetworkError(e) || failed.current < 5) {
          setStatus("retrying")
          retry.current = setTimeout(() => flushRef.current(), backoffMs(failed.current))
        } else setStatus("error")
        return null
      })
    saving.current = run
    try {
      return await run
    } finally {
      if (saving.current === run) saving.current = null
    }
  }, [])
  const flushRef = useRef(flush)
  flushRef.current = flush

  const checkRemote = useCallback(async () => {
    const client = sb.current
    const m = meta.current
    if (!client || !emailRef.current || !m.draftId || !m.baseAt || conflictRef.current || saving.current) return
    if (m.owner && m.owner !== emailRef.current) return
    try {
      const { data } = await client.from("visa_applications").select(COLS).eq("id", m.draftId).eq("email", emailRef.current).maybeSingle<Row>()
      if (conflictRef.current || meta.current.draftId !== m.draftId) return
      if (!data) setConflict({ reason: "gone", server: null })
      else {
        const s = toServerDraft(data)
        if (s.status !== "draft") setConflict({ reason: "closed", server: s })
        else if (outdated(s)) setConflict({ reason: "newer", server: s })
        else if (!sameVersion(s.updatedAt, m.baseAt)) {
          meta.current.baseAt = s.updatedAt
          persist()
        }
      }
    } catch {}
  }, [])

  // Session: the browser client and the signed-in email.
  useEffect(() => {
    let client: SupabaseClient
    try {
      client = createBrowserClient()
    } catch {
      return
    }
    sb.current = client
    meta.current = readMeta()
    client.auth.getUser().then(({ data }) => setEmail(data.user?.email?.toLowerCase() ?? null)).catch(() => {})
    const { data: sub } = client.auth.onAuthStateChange((_e, session) => setEmail(session?.user.email?.toLowerCase() ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])
  // Signed in: resume the account's latest draft when this browser has nothing in progress; otherwise check ours.
  useEffect(() => {
    if (!ready || !email || !sb.current) return
    if (meta.current.owner && meta.current.owner !== email) {
      // Another account in this browser: the previous person's answers are never saved into this one.
      meta.current = { ...EMPTY_META }
      clearWizardData()
      onResetRef.current?.()
      return
    }
    // Answers given or restored in this browser (link pre-fill and profile auto-fill don't count) keep this draft.
    const hasLocal = answeredRef.current
    if (meta.current.draftId) {
      checkRemote()
      return
    }
    if (hasLocal || noResume.current) return
    sb.current.from("visa_applications").select(COLS).eq("email", email).eq("application_status", "draft").order("updated_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        if (!data?.[0] || meta.current.draftId || noResume.current) return
        const s = toServerDraft(data[0] as Row)
        // A link for another country (e.g. "Apply for France") starts that application, not the saved one (as in the app).
        const linked = str(latest.current.w.destination)
        if (linked && linked !== str(s.wizard.destination)) return
        apply(s)
      })
  }, [ready, email, apply, checkRemote, answered])
  // Debounced save after each change.
  const fp = fingerprint(latest.current.w, latest.current.step)
  useEffect(() => {
    if (!ready || !email) return
    if (!eligible()) {
      if (!conflictRef.current) setStatus("local")
      return
    }
    if (conflictRef.current) return
    if (!dirty()) {
      if (meta.current.draftId && meta.current.baseAt) setStatus("saved")
      return
    }
    setStatus(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "saving")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => flushRef.current(), DEBOUNCE_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [fp, ready, email, answered])
  // Back online: save. Tab visible again: look for a newer copy (or save what is waiting).
  useEffect(() => {
    const online = () => {
      failed.current = 0
      if (eligible() && dirty()) flushRef.current()
    }
    const offline = () => {
      if (eligible() && dirty() && !conflictRef.current) setStatus("offline")
    }
    const visible = () => {
      if (document.visibilityState !== "visible") return
      if (eligible() && dirty()) flushRef.current()
      else checkRemote()
    }
    window.addEventListener("online", online)
    window.addEventListener("offline", offline)
    document.addEventListener("visibilitychange", visible)
    return () => {
      window.removeEventListener("online", online)
      window.removeEventListener("offline", offline)
      document.removeEventListener("visibilitychange", visible)
    }
  }, [checkRemote])

  const resolveConflict = useCallback((choice: "server" | "mine" | "discard") => {
    const c = conflictRef.current
    if (!c) return
    if (choice === "discard" || (choice === "server" && c.reason === "closed")) {
      meta.current = { ...EMPTY_META }
      persist()
      setConflict(null)
      setStatus("local")
      return
    }
    if (choice === "server" && c.server) {
      apply(c.server)
      return
    }
    if (c.reason === "newer" && c.server) meta.current.baseAt = c.server.updatedAt
    else if (c.reason === "existing") meta.current.allowNew = true
    else meta.current = { ...EMPTY_META, owner: emailRef.current }
    failed.current = 0
    persist()
    setConflict(null)
    flushRef.current()
  }, [apply])

  /** For submit. Signed out: a guest submit. Signed in: only the server-confirmed draft is submitted (never a second
   *  row); while it isn't saved, or a newer copy waits for a choice, submitting is blocked with a message. */
  const prepareSubmit = useCallback(async (): Promise<SubmitPlan> => {
    if (!sb.current || !emailRef.current) return { kind: "guest" }
    const { data } = await sb.current.auth.getSession()
    if (!data.session) return { kind: "guest" }
    if (submittedId.current) return { kind: "submitted", applicationId: submittedId.current }
    const id = conflictRef.current ? null : await flush().catch(() => null)
    if (id) return { kind: "draft", draftId: id, draftVersion: meta.current.baseAt, accessToken: data.session.access_token }
    return { kind: "blocked", message: conflictRef.current ? "This application was changed in the app or another browser. Choose which version to keep first." : "Your answers aren't saved yet. Check your connection and try again." }
  }, [flush])
  /** After a submit (pass its id: a retry reuses it), or "Start fresh": this browser no longer has an open draft (and
   *  doesn't auto-resume one now). */
  const forget = useCallback((applicationId?: string) => {
    submittedId.current = applicationId ?? null
    if (timer.current) clearTimeout(timer.current)
    if (retry.current) clearTimeout(retry.current)
    meta.current = { ...EMPTY_META }
    noResume.current = true
    persist()
    setConflict(null)
    setStatus("local")
  }, [])

  return { signedIn: !!email, status, conflict, resolveConflict, retry: () => { failed.current = 0; flush() }, prepareSubmit, forget }
}
