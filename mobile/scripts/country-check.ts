// Node-only checks for the country screen data (no device, no network). Run from mobile/: bun scripts/run-check.ts scripts/country-check.ts
// 1. countryInfo for all 29 countries: name, capital, photo, Arabic names, the website document page.
// 2. The copied visa centres match the website's APPOINTMENT_CENTERS (read from its source text).
// 3. The copied funds rules match the website's lib/bank-requirements.ts, and fundsTotal() equals the website
//    calculator's total for every country, trip length 1-90, with and without a hotel, 1-3 travellers.
// 4. The footer / "Your application" state: none, draft (phone or server), active, several, finished, discarded.
// 5. Every string the country screen translates has an Arabic entry.
import { readFileSync, readdirSync } from "fs";
import { COUNTRY_LIST, toSlug } from "../lib/countries";
import { countryApp, countryInfo, docsPath, footerKind } from "../lib/countryInfo";
import { VISA_CENTRES, centreFor } from "../lib/visaCentres";
import { FUNDS_CONFIRMED, FUNDS_NOTE, FUNDS_RULES, fundsTotal } from "../lib/funds";
import { AR } from "../lib/ar";
import { toApplication, type VisaRow } from "../lib/data";
import { emptyForm } from "../lib/wizard";
import { SCHENGEN_FUNDS_RULES, calculateRequiredFunds } from "../../lib/bank-requirements";
import { SCHENGEN } from "../../lib/shared/wizard-contract";
declare const process: any;

let fail = 0; let pass = 0;
const ok = (c: boolean, l: string) => { if (c) pass++; else { fail++; console.log(`FAIL  ${l}`); } };
const app = `${process.cwd()}/`; // run from mobile/ (the check is bundled to /tmp, so import.meta.url is not the repo)
const root = `${app}../`; // website repo root
const web = (p: string) => readFileSync(root + p, "utf8");

// ---- 1. countryInfo, all 29 ----
ok(COUNTRY_LIST.length === 29, `29 countries (got ${COUNTRY_LIST.length})`);
const webCountries = SCHENGEN;
ok(webCountries.length === 29, `shared contract SCHENGEN has 29 countries (got ${webCountries.length})`);
const webDocs = Object.fromEntries([...web("lib/destinations.ts").matchAll(/slug: "([^"]+)"[\s\S]*?documentPath: "([^"]+)"/g)].map((m) => [m[1], m[2]]));
for (const name of COUNTRY_LIST) {
  const i = countryInfo(toSlug(name));
  ok(!!i, `${name}: countryInfo exists`); if (!i) continue;
  ok(i.name === name && !!i.capital && i.photo != null, `${name}: name, capital, photo`);
  ok(!!i.nameAr && /[؀-ۿ]/.test(i.nameAr), `${name}: Arabic name`);
  ok(!!i.capitalAr && /[؀-ۿ]/.test(i.capitalAr), `${name}: Arabic capital (${i.capital})`);
  ok(i.docsUrl === `https://www.ezvisa.net${docsPath(i.slug)}`, `${name}: docs URL on www.ezvisa.net`);
  ok(webCountries.includes(name), `${name}: listed in the shared contract (SCHENGEN)`);
  ok(webDocs[i.slug] === docsPath(i.slug), `${name}: same path as web lib/destinations.ts (${webDocs[i.slug]})`);
}
ok(countryInfo("atlantis") === null && countryInfo("") === null, "unknown slug → null");

// ---- 2. visa centres equal the website copy ----
const src = web("components/tools/appointment-guide-client.tsx");
const lit = src.split(/const APPOINTMENT_CENTERS[^=]*=\s*/)[1].split(/\n}\n/)[0] + "\n}";
const WEB_CENTRES = new Function(`return (${lit});`)() as Record<string, { provider: string; countries: string[]; dubaiAddress: string; abuDhabiAddress: string }>;
ok(Object.keys(WEB_CENTRES).sort().join() === VISA_CENTRES.map((v) => v.key).sort().join(), "same providers as the website");
for (const v of VISA_CENTRES) {
  const w = WEB_CENTRES[v.key];
  ok(!!w && w.provider === v.provider, `${v.key}: provider name`);
  ok(!!w && JSON.stringify(w.countries) === JSON.stringify(v.countries), `${v.key}: country list`);
  ok(!!w && w.dubaiAddress === v.dubaiAddress && w.abuDhabiAddress === v.abuDhabiAddress, `${v.key}: addresses`);
}
const unmapped = COUNTRY_LIST.filter((n) => !centreFor(n));
ok(unmapped.join() === "Bulgaria,Estonia,Iceland,Latvia,Liechtenstein,Luxembourg,Malta,Romania,Slovakia,Slovenia", `unmapped countries hide the centre: ${unmapped.join(", ")}`);
for (const n of COUNTRY_LIST) ok(!!countryInfo(toSlug(n))!.provider === !!centreFor(n), `${n}: provider row follows the mapping`);

// ---- 3. funds equal the website copy and formula ----
ok(FUNDS_CONFIRMED === false, "funds stay hidden until the owner confirms a source");
ok(Object.keys(SCHENGEN_FUNDS_RULES).sort().join() === Object.keys(FUNDS_RULES).sort().join(), "same funds countries as the website");
for (const [k, w] of Object.entries(SCHENGEN_FUNDS_RULES)) {
  const a = FUNDS_RULES[k];
  ok(!!a && a.country === w.country && a.currency === w.currency && a.dailyRateWithHotel === w.dailyRateWithHotel && a.dailyRateNoHotel === w.dailyRateNoHotel && a.minimumTotal === w.minimumTotal, `${k}: rule numbers`);
  ok(!!FUNDS_NOTE[k] && !!AR[FUNDS_NOTE[k]], `${k}: plain note with Arabic`);
  let same = true;
  for (let d = 1; d <= 90; d++) for (const hotel of [true, false]) for (let tr = 1; tr <= 3; tr++)
    if (fundsTotal(k, d, hotel, tr) !== calculateRequiredFunds(k, d, tr, hotel).totalForeign) same = false;
  ok(same, `${k}: totals match the website calculator for 1-90 days, hotel / no hotel, 1-3 travellers`);
}
ok(fundsTotal("italy", 10) === 450 && fundsTotal("italy", 11) === 495 && fundsTotal("italy", 10, false) === 650, "Italy: minimum €450, then €45/day; €65/day without hotel");
const noFunds = COUNTRY_LIST.filter((n) => !FUNDS_RULES[toSlug(n)]);
ok(noFunds.length === 21 && noFunds.every((n) => fundsTotal(toSlug(n), 10) === null && !countryInfo(toSlug(n))!.funds), "21 countries without a rule: no total, no section (no France fallback)");

// ---- 4. the user's application for this country ----
const base: VisaRow = {
  id: "11111111-2222-4333-8444-555555555555", additional_notes: null, application_status: "submitted", created_at: "2026-10-01T08:00:00Z", updated_at: "2026-10-20T08:00:00Z",
  date_of_birth: "1990-01-01", destination_country: "Italy", duration_days: 10, email: "test@example.com", entry_date: "2026-12-10", exit_date: "2026-12-20", full_name: "Test Person",
  has_accommodation: null, has_bank_statements: false, has_employment_proof: false, has_flight_booking: null, has_passport: false, has_photos: false, has_travel_insurance: null,
  nationality: "India", noc_url: null, passport_number: "X1", passport_url: null, payment_amount: null, payment_id: null, payment_status: "pending", phone: "+971500000000", photo_url: null,
  previous_rejections: false, previous_schengen_visa: false, referrer: null, rejection_details: null, residency_url: null, search_vector: null, submission_ip: null, travel_purpose: "tourism", user_agent: null,
};
let n = 0;
const row = (p: Partial<VisaRow>) => toApplication({ ...base, id: `11111111-2222-4333-8444-${String(++n).padStart(12, "0")}`, ...p } as VisaRow);
const local = (dest: string, savedAt: number, draftId: string | null = null) => ({ key: `d${savedAt}`, form: { ...emptyForm, destination: dest, firstName: "A" }, savedAt, draftId });

const none = countryApp("Italy", [], []);
ok(none.kind === "none" && footerKind(none) === "apply", "no application → Apply");
ok(countryApp("Italy", null, []).kind === "none", "signed out (no apps) → Apply");
ok(countryApp("Italy", [row({ destination_country: "France" })], []).kind === "none", "an application for another country → Apply");
const sd = row({ application_status: "draft" });
const s1 = countryApp("Italy", [sd], []);
ok(s1.kind === "draft" && s1.app?.id === sd.id && footerKind(s1) === "continue", "server draft → Continue, opens that draft");
const s2 = countryApp("Italy", [], [local("Italy", 5)]);
ok(s2.kind === "draft" && s2.draftKey === "d5" && footerKind(s2) === "continue", "draft on this phone (guest) → Continue");
ok(countryApp("Italy", [], [{ ...local("Italy", 6), form: { ...emptyForm } }]).kind === "none", "a phone draft for no destination is not an Italy draft");
const act = row({ application_status: "submitted", payment_status: "paid" });
const s3 = countryApp("Italy", [act], []);
ok(s3.kind === "active" && s3.app.id === act.id && s3.count === 1 && footerKind(s3) === "view", "active case → View your application (no second Apply)");
const unpaid = row({ application_status: "submitted", payment_status: "pending" });
ok(countryApp("Italy", [unpaid], []).kind === "active", "submitted but unpaid → View (it is already an application)");
const older = row({ application_status: "reviewing", updated_at: "2026-10-05T08:00:00Z" });
const newer = row({ application_status: "submitted", updated_at: "2026-10-21T08:00:00Z" });
const s4 = countryApp("Italy", [older, newer, sd], [local("Italy", Date.parse("2026-10-22T08:00:00Z"))]);
ok(s4.kind === "active" && s4.app.id === newer.id && s4.count === 4, "several → the most recent active one, count for See all");
ok(countryApp("Italy", [act, sd], []).count === 2, "active + draft → count 2 (See all shows)");
const s5 = countryApp("Italy", [row({ application_status: "completed" }), row({ application_status: "rejected" }), row({ application_status: "cancelled", payment_status: "paid" })], []);
ok(s5.kind === "none", "only finished cases (granted, refused, cancelled) → Apply again");
const linked = row({ application_status: "submitted" });
const s6 = countryApp("Italy", [linked], [local("Italy", 9, linked.id)]);
ok(s6.kind === "active" && s6.count === 1, "a phone draft whose row was submitted is that case, not a second draft");
const sdl = row({ application_status: "draft" });
const s7 = countryApp("Italy", [sdl], [local("Italy", 10, sdl.id)]);
ok(s7.kind === "draft" && s7.draftKey === "d10" && s7.count === 1, "phone draft linked to its server draft counts once and opens on the phone");

// ---- 5. Arabic for every string the screen translates ----
const dir = `${app}components/country/`;
const files = [...readdirSync(dir).map((f) => dir + f), `${app}components/CountryDetail.tsx`];
const keys = new Set<string>();
for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(m[1]);
const tips = readFileSync(dir + "Requirements.tsx", "utf8").split("export const TIPS")[1].split("};")[0];
for (const m of tips.matchAll(/: "([^"]+)"/g)) keys.add(m[1]);
for (const k of ["Passport bio page", "Clear colour copy", "UAE residence visa / Emirates ID", "Personal photo", "White background", "Bank statement", "Last 3-6 months, stamped", "NOC / employment proof", "If you are employed", "Cover letter, itinerary & bookings", "{n} day", "{n} days"]) keys.add(k);
const missing = [...keys].filter((k) => !AR[k]);
ok(keys.size > 40 && missing.length === 0, `Arabic for all ${keys.size} strings${missing.length ? `; missing: ${missing.join(" | ")}` : ""}`);

console.log(`${fail ? "FAILED" : "ALL PASS"}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
