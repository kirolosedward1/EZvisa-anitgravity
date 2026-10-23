/**
 * Company details (legal audit H2). Fill these in once, here; every legal page, the footer,
 * About and Contact read from this file. The bracketed values are deliberate placeholders
 * from the Legal Auditor's drafts — keep them until the real details are confirmed.
 */
export const COMPANY = {
  COMPANY_LEGAL_NAME: "[COMPANY LEGAL NAME]",
  TRADE_LICENCE_NO: "[TRADE LICENCE NO.]",
  ISSUING_AUTHORITY: "[ISSUING AUTHORITY]",
  REGISTERED_ADDRESS: "[REGISTERED ADDRESS]",
  EMAIL: "[EMAIL]",
  /** "Last updated" date on the legal pages. */
  LEGAL_UPDATED: "[DATE]",
  PHONE_DISPLAY: "+971 54 710 9533",
  PHONE_E164: "+971547109533",
  WHATSAPP_URL: "https://wa.me/971547109533",
  SUPPORT_HOURS_EN: "9:00 am – 6:00 pm (UAE time)",
  SUPPORT_HOURS_AR: "من ٩:٠٠ صباحًا إلى ٦:٠٠ مساءً (بتوقيت الإمارات)",
} as const

/** Replace {{KEY}} tokens in legal text with the values above. */
export function fillCompany(text: string): string {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (m, k: string) => (k in COMPANY ? COMPANY[k as keyof typeof COMPANY] : m))
}
