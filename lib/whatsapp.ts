/**
 * WhatsApp Concierge & Deep-Link Utility
 * Generates contextual WhatsApp links for UAE customer service. The case reference in every message is the one the
 * app, the dashboard and the emails show: EZ- + the first 8 hex of the application id (lib/shared/wizard-contract.ts).
 */
import { WHATSAPP_NUMBER as SHARED_WHATSAPP_NUMBER, referenceOf } from "@/lib/shared/wizard-contract"

export const WHATSAPP_NUMBER = SHARED_WHATSAPP_NUMBER

export function getWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

/** Pass the application id when you have it; a tracking token still gives a stable, readable reference. */
export function getCaseTrackingWhatsAppUrl(idOrToken: string, destination?: string): string {
  const destText = destination ? ` (${destination} Visa)` : ""
  return getWhatsAppUrl(
    `Hi EZvisa! I would like a live status update on my visa application file ${referenceOf(idOrToken)}${destText}.`
  )
}

export function getPaymentConfirmationWhatsAppUrl(idOrToken: string, destination?: string): string {
  const destText = destination ? ` for ${destination}` : ""
  return getWhatsAppUrl(
    `Hi EZvisa! I just completed my payment${destText} (Ref: ${referenceOf(idOrToken)}). Please confirm receipt and let me know when my file review begins.`
  )
}

export function getDocumentHelpWhatsAppUrl(idOrToken: string): string {
  return getWhatsAppUrl(
    `Hi EZvisa! I need help uploading my documents for case ${referenceOf(idOrToken)}. Can I send them to you here?`
  )
}
