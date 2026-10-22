// Personal-data scrubber for anything that leaves the phone (analytics, crash reports, the support-email crash note).
// Two layers: (1) patterns (emails, phone numbers, passport-like ids, dates, tokens, ids, URL queries, file names);
// (2) the exact values the user typed in the wizard (names, passport number, email, phone), registered at runtime.
const PATTERNS: [RegExp, string][] = [
  [/eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}/g, "[token]"], // JWT
  [/\b(sb_[a-z]+_|sk_|pk_)[\w-]{8,}/gi, "[key]"],
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]"],
  [/\b[0-9a-f]{24,}\b/gi, "[id]"],
  [/\b\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?\b/g, "[date]"],
  [/\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b/g, "[date]"],
  [/\+?\d[\d\s().-]{7,}\d/g, "[number]"], // phone numbers, long digit runs (Emirates ID, card-like)
  [/\b(?=[A-Z0-9]*\d)[A-Z]{1,3}\d{5,9}\b/gi, "[doc]"], // passport-like: letters followed by digits
  [/([?&#][^=\s&#]+=)[^\s&#)]+/g, "$1[q]"], // URL query/hash values
  [/(file|content|ph|assets-library):\/\/\S+/gi, "$1://[file]"],
  [/[^\s/\\'"`]+\.(pdf|jpe?g|png|heic|webp|docx?)\b/gi, "[file]"],
];

let secrets: string[] = [];
/** Exact values to remove (wizard answers that are personal). Values shorter than 3 characters are ignored. */
export function registerSecrets(values: (string | null | undefined)[]) {
  const next = new Set<string>();
  for (const v of values) {
    const s = typeof v === "string" ? v.trim() : "";
    if (s.length >= 3) { next.add(s); s.split(/\s+/).forEach((w) => { if (w.length >= 3) next.add(w); }); }
  }
  secrets = [...next].sort((a, b) => b.length - a.length);
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function scrubText(input: unknown, max = 4000): string {
  let s = String(input ?? "");
  for (const v of secrets) s = s.replace(new RegExp(esc(v), "gi"), "[redacted]");
  for (const [re, to] of PATTERNS) s = s.replace(re, to);
  return s.length > max ? s.slice(0, max) : s;
}

/** Deep copy with every string scrubbed; drops keys that name personal fields outright. */
const PERSONAL_KEY = /^(e-?mail|phone|full_?name|first_?name|last_?name|name|passport.*|date_?of_?birth|dob|address|salary|income|token|password|user_?metadata)$/i;
export function scrubDeep<T>(v: T, depth = 0): T {
  if (depth > 6) return undefined as T;
  if (typeof v === "string") return scrubText(v) as T;
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => scrubDeep(x, depth + 1)) as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (!PERSONAL_KEY.test(k)) out[k] = scrubDeep(x, depth + 1);
    return out as T;
  }
  return v;
}
