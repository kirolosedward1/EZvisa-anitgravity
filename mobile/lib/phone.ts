// Phone numbers via libphonenumber-js (JS only). Stored as E.164 (+971563035666), shown formatted (+971 56 303 5666).
import { AsYouType, parsePhoneNumberFromString, getExampleNumber, type CountryCode } from "libphonenumber-js/min";
import examples from "libphonenumber-js/mobile/examples";
import { WORLD } from "./world";

export const GCC = ["SA", "KW", "QA", "BH", "OM"];
/** UAE first, then the GCC, then everyone else A to Z (only countries with a calling code). */
export const PHONE_COUNTRIES = (() => {
  const all = WORLD.filter((w) => w.dial > 0);
  const ae = all.filter((w) => w.iso2 === "AE"); const gcc = GCC.map((i) => all.find((w) => w.iso2 === i)!).filter(Boolean);
  return [...ae, ...gcc, ...all.filter((w) => w.iso2 !== "AE" && !GCC.includes(w.iso2)).sort((a, b) => a.name.localeCompare(b.name))];
})();
const dialOf = (iso: string) => WORLD.find((w) => w.iso2 === iso)?.dial ?? 971;
/** National digits only: drops the calling code if typed and a leading trunk 0 (e.g. "0563035666" -> "563035666"). */
export function nationalDigits(iso: string, raw: string): string {
  let d = raw.replace(/\D/g, ""); const dial = String(dialOf(iso));
  if (raw.trim().startsWith("+") || d.startsWith("00" + dial)) d = d.replace(new RegExp(`^(00)?${dial}`), "");
  return d.replace(/^0+/, "");
}
/** As-you-type national formatting: "563035666" -> "56 303 5666". */
export function formatNational(iso: string, digits: string) {
  if (!digits) return ""; const pre = `+${dialOf(iso)}`;
  const out = new AsYouType().input(pre + digits); // international formatting groups without the trunk 0
  return out.startsWith(pre) ? out.slice(pre.length).trim() : digits;
}
export const placeholderFor = (iso: string) => (iso === "AE" ? "56 303 5666" : getExampleNumber(iso as CountryCode, examples as any)?.formatNational().replace(/^0/, "") ?? "");
/** E.164 when valid for that country (UAE must be a mobile number: 5X XXX XXXX), else null. */
export function toE164(iso: string, digits: string): string | null {
  const p = parsePhoneNumberFromString(digits, iso as CountryCode);
  if (!p || !p.isValid()) return null;
  if (iso === "AE" && !/^5\d{8}$/.test(String(p.nationalNumber))) return null;
  return p.number as string;
}
/** A saved value (E.164, "+971 5x ...", or the old "+9710563035666") -> { iso, digits } for display/editing. Never writes. */
export function parseSaved(v?: string | null): { iso: string; digits: string } {
  const s = (v ?? "").trim(); if (!s) return { iso: "AE", digits: "" };
  const d = s.replace(/\D/g, "");
  const hit = PHONE_COUNTRIES.find((w) => d.startsWith(String(w.dial)) && s.startsWith("+")) ?? (d.startsWith("971") ? WORLD.find((w) => w.iso2 === "AE") : undefined);
  if (hit) return { iso: hit.iso2, digits: d.slice(String(hit.dial).length).replace(/^0+/, "") };
  return { iso: "AE", digits: nationalDigits("AE", s) };
}
/** Display: "+971 56 303 5666" (normalised on display only). */
export function displayPhone(v?: string | null): string {
  const { iso, digits } = parseSaved(v); if (!digits) return "";
  const p = parsePhoneNumberFromString(digits, iso as CountryCode);
  return p ? p.formatInternational() : `+${dialOf(iso)} ${digits}`;
}
export const phoneError = (iso: string) => (iso === "AE" ? "Enter a valid UAE mobile number" : "Enter a valid phone number");
