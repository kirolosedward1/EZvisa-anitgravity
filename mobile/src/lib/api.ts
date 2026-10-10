import type { DocumentRequirement, DocumentType, FieldErrors, Stage, StepId, WizardData } from "@shared/visa-wizard"

import { config } from "./config"
import { supabase } from "./supabase"

export interface Application {
  id: string
  reference: string | null
  status: string
  paymentStatus: string
  stage: Stage
  stageLabel: string
  applicantName: string | null
  destination: string | null
  travelStartDate: string | null
  travelEndDate: string | null
  amountAED: number
  currentStep: number
  version: number
  source: string
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  wizardData: WizardData
  documentRequirements: DocumentRequirement[]
}

export interface UploadedDocument {
  id: string
  type: DocumentType
  mimeType: string
  sizeBytes: number
  name: string | null
  uploadedAt: string
}

export interface HistoryEntry {
  status: string | null
  paymentStatus: string | null
  at: string
}

export interface Profile {
  id: string
  email: string | null
  emailVerified: boolean
  fullName: string
  phone: string
  createdAt: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body?: any,
  ) {
    super(message)
  }
  get isNetwork() {
    return this.status === 0
  }
  /** Server-side validation result from /submit. */
  get validation(): { step: StepId; errors: FieldErrors } | null {
    return this.code === "validation_failed" ? this.body?.error?.details ?? null : null
  }
}

async function accessToken(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    const { data } = await supabase.auth.refreshSession()
    if (data.session) return data.session.access_token
  }
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new ApiError(401, "unauthenticated", "Please sign in")
  return data.session.access_token
}

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const token = await accessToken(retried)
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string>),
  }
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json"

  let res: Response
  try {
    res = await fetch(`${config.apiUrl}/api/mobile/v1${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, "network", "You're offline. Check your connection and try again.")
  }

  // Access token expired between the check and the call: refresh once and retry.
  if (res.status === 401 && !retried) return request<T>(path, init, true)

  const text = await res.text()
  let body: any = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    // non-JSON (e.g. proxy error page)
  }
  if (!res.ok) {
    const err = body?.error
    throw new ApiError(res.status, err?.code ?? "http_error", err?.message ?? `Request failed (${res.status})`, body)
  }
  return body as T
}

const json = (data: unknown) => JSON.stringify(data)

export const api = {
  listApplications: () => request<{ applications: Application[] }>("/applications"),

  createApplication: (wizardData?: Partial<WizardData>) =>
    request<{ application: Application }>("/applications", { method: "POST", body: json({ wizardData }) }),

  getApplication: (id: string) =>
    request<{ application: Application; documents: UploadedDocument[]; history: HistoryEntry[] }>(
      `/applications/${id}`,
    ),

  saveDraft: (id: string, wizardData: WizardData, currentStep: number, version: number) =>
    request<{ application: Application }>(`/applications/${id}`, {
      method: "PATCH",
      body: json({ wizardData, currentStep, version }),
    }),

  deleteDraft: (id: string) => request<{ ok: true }>(`/applications/${id}`, { method: "DELETE" }),

  submit: (id: string, wizardData: WizardData, version: number) =>
    request<{ application: Application }>(`/applications/${id}/submit`, {
      method: "POST",
      body: json({ wizardData, version }),
    }),

  startPayment: (id: string, returnUrl: string) =>
    request<{ checkoutUrl: string; paymentId: string; amountAED: number }>(`/applications/${id}/payment`, {
      method: "POST",
      body: json({ returnUrl }),
    }),

  refreshPayment: (id: string) => request<{ application: Application }>(`/applications/${id}/payment`),

  uploadDocument: (id: string, type: DocumentType, file: { uri: string; name: string; mimeType: string }) => {
    const form = new FormData()
    form.append("documentType", type)
    // React Native's FormData streams the file from its local URI.
    form.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob)
    return request<{ document: UploadedDocument }>(`/applications/${id}/documents`, { method: "POST", body: form })
  },

  documentUrl: (id: string, docId: string) =>
    request<{ url: string; expiresIn: number }>(`/applications/${id}/documents/${docId}`),

  deleteDocument: (id: string, docId: string) =>
    request<{ ok: true }>(`/applications/${id}/documents/${docId}`, { method: "DELETE" }),

  dossier: (id: string) =>
    request<{ kind: "pdf"; url: string } | { kind: "html"; html: string; fileName: string }>(
      `/applications/${id}/dossier`,
    ),

  me: () => request<{ profile: Profile }>("/me"),
  updateMe: (patch: { fullName?: string; phone?: string }) =>
    request<{ profile: Profile }>("/me", { method: "PATCH", body: json(patch) }),
  deleteAccount: () => request<{ ok: true }>("/me", { method: "DELETE" }),
}
