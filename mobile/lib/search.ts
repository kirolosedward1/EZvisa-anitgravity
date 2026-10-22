// Country search for the picker sheets: partial words, any word order, accents ignored, Arabic names (lib/ar.ts) and
// common short names ("uae", "russia", "czechia", "ksa", "holland", "swiss"). Works whatever the app language is.
import { AR } from "./ar";

const ALIASES: Record<string, string[]> = {
  "United Arab Emirates": ["uae", "emirates"], "Russian Federation": ["russia"], "Czech Republic": ["czechia"], "Saudi Arabia": ["ksa"],
  Netherlands: ["holland"], Switzerland: ["swiss"], "United Kingdom": ["uk", "britain"], "United States": ["usa", "us", "america"],
};

/** Lower-case, strip Latin accents and Arabic diacritics, unify Arabic letter variants, collapse punctuation to spaces. */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ٰٟـ]/g, "") // tashkeel + tatweel
    .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
const stripAl = (w: string) => (w.startsWith("ال") && w.length > 3 ? w.slice(2) : w);

/** Every searchable spelling of a country: English, Arabic and aliases, folded. */
export const spellings = (name: string): string[] => [name, AR[name], ...(ALIASES[name] ?? [])].filter(Boolean).map((x) => fold(x as string));

/** 0 = no match, higher = better: whole name starts with the query > every query word starts a word > substring. */
export function countryScore(name: string, query: string): number {
  const q = fold(query); if (!q) return 1;
  const qw = q.split(" ").map(stripAl);
  let best = 0;
  for (const s of spellings(name)) {
    const words = s.split(" ").map(stripAl);
    if (s.startsWith(q) || words.join(" ").startsWith(qw.join(" "))) best = Math.max(best, 3);
    else if (qw.every((w) => words.some((x) => x.startsWith(w)))) best = Math.max(best, 2);
    else if (s.includes(q)) best = Math.max(best, 1);
  }
  return best;
}

/** Filter + rank `names` for `query` (stable for equal scores, so the list keeps its own order). */
export function searchCountries(names: string[], query: string): string[] {
  if (!fold(query)) return names;
  return names.map((n, i) => ({ n, i, s: countryScore(n, query) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.n);
}
