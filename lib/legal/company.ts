/**
 * Company details (legal audit H2). Fill these in once, here; every legal page, the footer,
 * About and Contact read from this file. The bracketed values are deliberate placeholders
 * from the Legal Auditor's drafts — keep them until the real details are confirmed.
 */
/**
 * Set to true once the real company details below are filled in. While false, every block that would
 * show them (footer company block, About/Contact company details, entity sentences in the legal pages)
 * is hidden or reworded to say "EZvisa", so no [PLACEHOLDER] text is ever rendered.
 */
export const COMPANY_DETAILS_READY = false

export const COMPANY = {
  COMPANY_LEGAL_NAME: "[COMPANY LEGAL NAME]",
  TRADE_LICENCE_NO: "[TRADE LICENCE NO.]",
  ISSUING_AUTHORITY: "[ISSUING AUTHORITY]",
  REGISTERED_ADDRESS: "[REGISTERED ADDRESS]",
  EMAIL: "[EMAIL]",
  /** "Last updated" date on the legal pages. */
  LEGAL_UPDATED: "24 October 2026",
  LEGAL_UPDATED_AR: "٢٤ أكتوبر ٢٠٢٦",
  PHONE_DISPLAY: "+971 54 710 9533",
  PHONE_E164: "+971547109533",
  WHATSAPP_URL: "https://wa.me/971547109533",
  SUPPORT_HOURS_EN: "9:00 am – 6:00 pm (UAE time)",
  SUPPORT_HOURS_AR: "من ٩:٠٠ صباحًا إلى ٦:٠٠ مساءً (بتوقيت الإمارات)",
} as const

const ENTITY_TOKENS = /\{\{(COMPANY_LEGAL_NAME|TRADE_LICENCE_NO|ISSUING_AUTHORITY|REGISTERED_ADDRESS|EMAIL)\}\}/
const WA = "+971 54 710 9533"

/** While COMPANY_DETAILS_READY is false: reword entity sentences to "EZvisa" and drop anything else that names the entity. */
function withoutEntity(text: string): string {
  const rules: [RegExp, string][] = [
    [/\s*\[(?:If a Data Protection|في حال تعيين)[^\]]*\]\.?/g, ""],
    [/\s*\([^()\n]*\{\{TRADE_LICENCE_NO\}\}[^()\n]*\)/g, ""],
    [/\{\{COMPANY_LEGAL_NAME\}\}, trading as \*\*EZvisa\*\*/g, "**EZvisa**"],
    [/\{\{COMPANY_LEGAL_NAME\}\}، العاملة باسم /g, ""],
    [/is operated by \{\{COMPANY_LEGAL_NAME\}\}, a private company/g, "is operated by a private company"],
    [/من قِبل \{\{COMPANY_LEGAL_NAME\}\}، وهي شركة خاصة/g, "من قِبل شركة خاصة"],
    [/\{\{COMPANY_LEGAL_NAME\}\} \(EZvisa\)/g, "EZvisa"],
    [/\{\{COMPANY_LEGAL_NAME\}\} \(إيزي فيزا\)/g, "إيزي فيزا"],
    [/,\s*\{\{REGISTERED_ADDRESS\}\}/g, ""],
    [/،?\s*\{\{REGISTERED_ADDRESS\}\}/g, ""],
    [/\{\{EMAIL\}\} · /g, ""],
    [/to \{\{EMAIL\}\} or WhatsApp/g, "via WhatsApp"],
    [/إلى \{\{EMAIL\}\} أو عبر واتساب/g, "عبر واتساب"],
    [/at \{\{EMAIL\}\}/g, `via WhatsApp ${WA}`],
    [/عبر \{\{EMAIL\}\}/g, `عبر واتساب ${WA}`],
  ]
  let out = text
  for (const [re, rep] of rules) out = out.replace(re, rep)
  // Anything still naming the entity (e.g. legal-notice table rows) is dropped.
  return out.split("\n").filter((line) => !ENTITY_TOKENS.test(line)).join("\n")
}

/** Replace {{KEY}} tokens in legal text with the values above. */
export function fillCompany(text: string): string {
  const src = COMPANY_DETAILS_READY ? text : withoutEntity(text)
  return src.replace(/\{\{([A-Z_]+)\}\}/g, (m, k: string) => (k in COMPANY ? COMPANY[k as keyof typeof COMPANY] : m))
}
