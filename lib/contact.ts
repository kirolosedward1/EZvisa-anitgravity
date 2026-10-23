/** Single WhatsApp / phone number for the website. */
export const WHATSAPP_E164 = "+971547109533"
export const WHATSAPP_DIGITS = "971547109533"
export const WHATSAPP_DISPLAY = "+971 54 710 9533"

export function whatsAppUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_DIGITS}`
  if (!message) return base
  return `${base}?text=${encodeURIComponent(message)}`
}

export function telUrl(): string {
  return `tel:${WHATSAPP_E164}`
}
