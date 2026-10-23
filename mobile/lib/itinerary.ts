import { paidStatus } from "./stage";
// Trip plan: optional questions + a deterministic, local template engine (no AI, no network, no keys).
// The output is generic ideas per day ("Ideas, not bookings"): it never names venues, prices, opening hours or bookings.
// Stored on the phone and in visa_applications.additional_notes.itinerary (no schema change; RLS allows the update
// while the case is draft/submitted, the guard trigger doesn't touch additional_notes).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CAPITALS } from "./capitals";
import { patchNotes, type Application } from "./data";
import { translate, type Lang } from "./i18n";

export type Interest = "food" | "culture" | "shopping" | "nature" | "nightlife" | "family";
export const INTERESTS: { value: Interest; label: string; icon: string }[] = [
  { value: "food", label: "Food", icon: "fork.knife" }, { value: "culture", label: "Culture", icon: "building.columns.fill" }, { value: "shopping", label: "Shopping", icon: "bag.fill" },
  { value: "nature", label: "Nature", icon: "leaf.fill" }, { value: "nightlife", label: "Nightlife", icon: "moon.stars.fill" }, { value: "family", label: "Family", icon: "person.2.fill" },
];
export const BUDGETS = [{ value: "budget", label: "Budget" }, { value: "mid", label: "Mid-range" }, { value: "premium", label: "Premium" }] as const;
export const WHO = [{ value: "solo", label: "Just me" }, { value: "couple", label: "Couple" }, { value: "family", label: "Family with kids" }, { value: "friends", label: "Friends" }] as const;
export type Prefs = { cities: string[]; budget: "" | "budget" | "mid" | "premium"; who: "" | "solo" | "couple" | "family" | "friends"; interests: Interest[] };
export type Slot = "Morning" | "Afternoon" | "Evening";
export type Item = { id: string; time: Slot; text: string };
export type Day = { id: string; n: number; date: string | null; city: string; title: string; items: Item[] };
export type Plan = { v: 1; label: "Ideas, not bookings"; lang: Lang; prefs: Prefs; generatedAt: string; updatedAt: string; days: Day[] };
export const emptyPrefs: Prefs = { cities: [], budget: "", who: "", interests: [] };

const DAY = 864e5;
const isoD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return isoD(d); };
let seq = 0; export const newId = () => `i${Date.now().toString(36)}${(seq++).toString(36)}`;

/** City suggestions: the capitals of the destination and the extra Schengen countries from the application. */
export function suggestedCities(a: Application): string[] {
  const out: string[] = [];
  const dest = a.destination_country ?? a.countries?.name ?? "";
  if (CAPITALS[dest]) out.push(CAPITALS[dest].city);
  for (const x of a.notes.wizard?.additionalCountries ?? []) if (CAPITALS[x.country] && !out.includes(CAPITALS[x.country].city)) out.push(CAPITALS[x.country].city);
  return out;
}

// Idea pools. {city} is filled in; budget picks the variant. Generic on purpose (no venue names or facts).
type Pool = Record<Interest, { budget: string[]; mid: string[]; premium: string[] }>;
const P: Pool = {
  food: {
    budget: ["Browse a local food market in {city}", "Try local street food", "Picnic with local bread, cheese and fruit"],
    mid: ["Eat at a local bistro in {city}", "Try a regional speciality", "Coffee and pastries in a neighbourhood café", "Lunch at a covered food hall", "Cooking class for a local dish"],
    premium: ["Book a tasting menu in {city}", "Join a guided food tour", "Wine or tea tasting session"],
  },
  culture: {
    budget: ["Free walking tour of {city}'s old town", "Visit a church or cathedral", "Explore a historic square and its side streets"],
    mid: ["Visit a major museum in {city}", "Guided tour of a historic site", "See a local exhibition or gallery", "Climb a tower or dome for a view over {city}", "Visit a palace or castle and its gardens"],
    premium: ["Private guided tour of {city}", "Evening concert or opera", "Skip-the-line museum visit"],
  },
  shopping: {
    budget: ["Wander a flea or street market", "Window-shop the main shopping street"],
    mid: ["Shop for local crafts and souvenirs in {city}", "Explore independent boutiques"],
    premium: ["Designer shopping district in {city}", "Personal shopping or department-store visit"],
  },
  nature: {
    budget: ["Walk in a large city park", "Sunset at a viewpoint over {city}"],
    mid: ["Half-day trip to a nearby lake, coast or hills", "Bike ride along a river or waterfront", "Botanical garden visit in {city}"],
    premium: ["Private day trip into the countryside near {city}", "Scenic boat trip"],
  },
  nightlife: {
    budget: ["Evening stroll and live music in the centre", "Find a lively local square after dinner"],
    mid: ["Cocktails in a rooftop bar in {city}", "Jazz or live-music bar"],
    premium: ["Dinner and a show", "Late-night lounge with a view"],
  },
  family: {
    budget: ["Playground and park time", "Ice cream and a slow walk by the water"],
    mid: ["Visit a zoo, aquarium or science museum in {city}", "Family-friendly boat or tram ride"],
    premium: ["Theme-park or adventure day", "Private family tour with kid-friendly stops"],
  },
};
const SLOTS: Slot[] = ["Morning", "Afternoon", "Evening"];

/** Deterministic plan: same application + answers -> same plan. */
export function generatePlan(a: Application, prefs: Prefs, lang: Lang): Plan {
  if (!planAllowed(a)) throw new Error("Your trip plan unlocks after payment");
  const t = (s: string, v?: Record<string, string | number>) => translate(lang, s, v);
  const start = a.entry_date ?? null, end = a.exit_date ?? null;
  const nDays = start && end ? Math.max(1, Math.min(90, Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1)) : 5;
  const cities = prefs.cities.length ? prefs.cities : suggestedCities(a).slice(0, 1).concat(suggestedCities(a).length ? [] : [a.destination_country ?? ""]);
  const interests: Interest[] = prefs.interests.length ? prefs.interests : prefs.who === "family" ? ["family", "culture", "nature"] : ["culture", "food", "nature"];
  const tier = prefs.budget || "mid";
  const per = Math.max(1, Math.floor(nDays / cities.length)); let extra = nDays - per * cities.length;
  const cityOf: string[] = [];
  cities.forEach((c) => { const k = per + (extra-- > 0 ? 1 : 0); for (let i = 0; i < k; i++) cityOf.push(c); });
  const usedIn: Record<string, Set<string>> = {};
  // Nightlife only in the evening; evenings prefer nightlife when chosen. Each pool cycles so ideas don't repeat early.
  const pick = (want: Interest, city: string, _k: number, slot: Slot = "Afternoon") => {
    let interest = want;
    if (slot === "Evening" && interests.includes("nightlife")) interest = "nightlife";
    else if (slot !== "Evening" && interest === "nightlife") interest = interests.find((x) => x !== "nightlife") ?? "culture";
    // Never repeat an idea in the same city: this tier first, then the other tiers, then the other interests.
    const tiers = [tier, ...(["mid", "budget", "premium"] as const).filter((x) => x !== tier)];
    const order: Interest[] = [interest, ...interests.filter((x) => x !== interest && x !== "nightlife"), ...(Object.keys(P) as Interest[]).filter((x) => x !== interest && x !== "nightlife" && !interests.includes(x))];
    const seen = (usedIn[city] ??= new Set<string>());
    for (const it of slot === "Evening" && interest === "nightlife" ? ["nightlife" as Interest, ...order] : order)
      for (const tr of tiers) for (const idea of P[it][tr]) if (!seen.has(idea)) { seen.add(idea); return t(idea, { city }); }
    return t("Free time to explore {city} at your own pace", { city });
  };
  const days: Day[] = [];
  for (let d = 0; d < nDays; d++) {
    const city = cityOf[d] ?? cities[cities.length - 1];
    const prev = d > 0 ? cityOf[d - 1] : null;
    const items: Item[] = [];
    const add = (time: Slot, text: string) => items.push({ id: newId(), time, text });
    let title: string;
    if (d === 0) {
      title = t("Arrive in {city}", { city });
      add("Afternoon", t("Arrive and check in")); add("Evening", pick(interests[0], city, 0, "Evening"));
    } else if (d === nDays - 1 && nDays > 1) {
      title = t("Departure day");
      add("Morning", pick(interests[d % interests.length], city, d, "Morning")); add("Afternoon", t("Pack, check out and head to the airport with time to spare"));
    } else if (prev && prev !== city) {
      title = t("{from} → {to}", { from: prev, to: city });
      add("Morning", t("Travel from {from} to {to}", { from: prev, to: city })); add("Afternoon", t("Check in and explore the area around your stay")); add("Evening", pick(interests[(d + 1) % interests.length], city, d, "Evening"));
    } else {
      const a1 = interests[d % interests.length], a2 = interests[(d + 1) % interests.length], a3 = interests[(d + 2) % interests.length];
      title = t("{city}: {theme}", { city, theme: t(INTERESTS.find((x) => x.value === a1)!.label) });
      SLOTS.forEach((s, i) => add(s, pick([a1, a2, a3][i], city, d, s)));
    }
    days.push({ id: newId(), n: d + 1, date: start ? addDays(start, d) : null, city, title, items });
  }
  const now = new Date().toISOString();
  return { v: 1, label: "Ideas, not bookings", lang, prefs, generatedAt: now, updatedAt: now, days };
}

const key = (id: string) => `ezvisa.itinerary.v1.${id}`;
/** Trip plans are a paid feature (lib/stage.ts rule). */
export const planAllowed = (a: { payment_status?: string | null }) => paidStatus(a.payment_status);
export async function loadPlan(a: Application): Promise<Plan | null> {
  if (!planAllowed(a)) throw new Error("Your trip plan unlocks after payment");
  const local = await AsyncStorage.getItem(key(a.id)).then((s) => (s ? (JSON.parse(s) as Plan) : null)).catch(() => null);
  const remote = (a.notes as any).itinerary as Plan | undefined;
  const ok = (p: any): p is Plan => p && p.v === 1 && Array.isArray(p.days);
  if (ok(remote) && (!local || remote.updatedAt > local.updatedAt)) return remote;
  return ok(local) ? local : null;
}
/** Saves on the phone first, then to the account. Returns whether the account copy was updated. */
export async function savePlan(a: Application, plan: Plan): Promise<{ synced: boolean; error?: string }> {
  if (!planAllowed(a)) return { synced: false, error: "Your trip plan unlocks after payment" };
  const p = { ...plan, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(key(a.id), JSON.stringify(p)).catch(() => {});
  try { const r = await patchNotes(a.id, { itinerary: p }); return { synced: r.synced }; }
  catch (e: any) { return { synced: false, error: e?.message ?? String(e) }; }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
/** Printable HTML for expo-print (A4). */
export function planHtml(a: Application, plan: Plan, lang: Lang): string {
  const t = (s: string, v?: Record<string, string | number>) => translate(lang, s, v);
  const fmt = (s: string | null) => (s ? new Date(s + "T12:00:00").toLocaleDateString(lang === "ar" ? "ar" : "en-GB", { weekday: "short", day: "numeric", month: "short" }) : "");
  const dir = lang === "ar" ? "rtl" : "ltr";
  const days = plan.days.map((d) => `<section><h2>${esc(t("Day {n}", { n: d.n }))}${d.date ? ` · ${esc(fmt(d.date))}` : ""}<span>${esc(d.city)}</span></h2><h3>${esc(d.title)}</h3><ul>${d.items.map((i) => `<li><b>${esc(t(i.time))}</b> ${esc(i.text)}</li>`).join("")}</ul></section>`).join("");
  return `<!doctype html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0A0A0A;margin:32px}h1{font-size:24px;margin:0}p.sub{color:#636369;margin:4px 0 4px}
    .badge{display:inline-block;background:#FFF4E5;color:#C93400;border-radius:8px;padding:4px 8px;font-size:12px;font-weight:600;margin:8px 0 16px}
    section{border-top:1px solid #E5E5EA;padding:12px 0;page-break-inside:avoid}h2{font-size:15px;margin:0;display:flex;justify-content:space-between}h2 span{color:#636369;font-weight:500}
    h3{font-size:14px;margin:4px 0;color:#0436DC}ul{margin:4px 0;padding-inline-start:18px}li{font-size:13px;margin:3px 0}footer{color:#8E8E93;font-size:11px;margin-top:16px}
  </style></head><body><h1>${esc(t("Trip plan"))}: ${esc(t(a.destination_country ?? ""))}</h1>
  <p class="sub">${esc(a.reference)}${a.entry_date ? ` · ${esc(fmt(a.entry_date))} – ${esc(fmt(a.exit_date))}` : ""}</p>
  <div class="badge">${esc(t("Ideas, not bookings"))}</div>${days}
  <footer>${esc(t("Generated on your phone by the EZvisa app. Check opening times and book separately."))}</footer></body></html>`;
}
