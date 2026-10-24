/** Single WhatsApp / phone number for the website. */
export const WHATSAPP_E164 = "+971547109533"
export const WHATSAPP_DIGITS = "971547109533"
export const WHATSAPP_DISPLAY = "+971 54 710 9533"

/** Pre-filled text for every WhatsApp link to the support number on /ar pages. */
export const WHATSAPP_INQUIRY_AR = "مرحباً، أرغب في الاستفسار عن تأشيرة شنغن."

/** English pages keep `message`. Arabic pages always use the inquiry pre-fill. */
export function getWhatsAppUrl(message: string, arabic = false): string {
  const text = arabic ? WHATSAPP_INQUIRY_AR : message
  return `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(text)}`
}

/** English pages keep `message` (or a bare chat link). Arabic pages always use the inquiry pre-fill. */
export function whatsAppUrl(message?: string, arabic = false): string {
  const base = `https://wa.me/${WHATSAPP_DIGITS}`
  if (!arabic && !message) return base
  return getWhatsAppUrl(message ?? "", arabic)
}

export function telUrl(): string {
  return `tel:${WHATSAPP_E164}`
}
