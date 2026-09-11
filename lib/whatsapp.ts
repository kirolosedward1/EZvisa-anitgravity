/**
 * WhatsApp Concierge & Deep-Link Utility
 * Generates contextual WhatsApp links for UAE customer service.
 */

export const WHATSAPP_NUMBER = "971547109533"

export function getWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export function getCaseTrackingWhatsAppUrl(token: string, destination?: string): string {
  const shortRef = token.substring(0, 8).toUpperCase()
  const destText = destination ? ` (${destination} Visa)` : ""
  return getWhatsAppUrl(
    `Hi EZvisa! I would like a live status update on my visa application file #EZ-${shortRef}${destText}.`
  )
}

export function getPaymentConfirmationWhatsAppUrl(referenceId: string, destination?: string): string {
  const shortRef = referenceId.substring(0, 8).toUpperCase()
  const destText = destination ? ` for ${destination}` : ""
  return getWhatsAppUrl(
    `Hi EZvisa! I just completed my payment${destText} (Ref: #${shortRef}). Please confirm receipt and let me know when my file review begins.`
  )
}

export function getDocumentHelpWhatsAppUrl(token: string): string {
  const shortRef = token.substring(0, 8).toUpperCase()
  return getWhatsAppUrl(
    `Hi EZvisa! I need help uploading my documents for case #EZ-${shortRef}. Can I send them to you here?`
  )
}
