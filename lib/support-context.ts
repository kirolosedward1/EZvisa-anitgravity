"use client"

// The application a customer page is about (dashboard, tracking, upload, continue, receipt, trip), so the WhatsApp
// buttons in the header and footer can prefill a message our team can act on without asking which case it is.
// Pages register it with <SupportApplication />; nothing is stored beyond the page's lifetime.
import { useEffect, useSyncExternalStore } from "react"
import { referenceOf } from "@/lib/shared/wizard-contract"

export type SupportStep = "overview" | "upload" | "continue" | "appointment" | "receipt" | "trip" | "dossier" | "payment"

export type SupportCase = {
  /** Application id (preferred) or tracking token; the reference is EZ- + its first 8 hex, as everywhere else. */
  id: string
  country?: string | null
  status?: string | null
  step: SupportStep
}

const STEP_TEXT: Record<SupportStep, string> = {
  overview: "I'm looking at my application page.",
  upload: "I'm on the document upload page.",
  continue: "I'm answering the trip and traveller questions after payment.",
  appointment: "I'm adding my visa appointment.",
  receipt: "It's about my payment receipt.",
  trip: "I'm looking at my trip plan.",
  dossier: "I'm looking at my prepared visa file.",
  payment: "It's about my payment.",
}

let current: SupportCase | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useSupportCase(): SupportCase | null {
  return useSyncExternalStore(subscribe, () => current, () => null)
}

/** Registers the case while the page is mounted. */
export function useRegisterSupportCase(value: SupportCase | null) {
  const key = value ? `${value.id}|${value.country ?? ""}|${value.status ?? ""}|${value.step}` : ""
  useEffect(() => {
    if (!value) return
    current = value
    emit()
    return () => {
      if (current && current.id === value.id && current.step === value.step) {
        current = null
        emit()
      }
    }
    // The key covers every field of value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/** "Hi EZvisa! I have a question about my France visa application EZ-3F9A21C0 (status: In review). I'm on …" */
export function supportMessage(value: SupportCase): string {
  const country = value.country?.trim()
  const what = country ? `my ${country} visa application` : "my visa application"
  const status = value.status?.trim() ? ` (status: ${value.status.trim()})` : ""
  return `Hi EZvisa! I have a question about ${what} ${referenceOf(value.id)}${status}. ${STEP_TEXT[value.step]}`
}
