// Everything the country screen shows about a destination, from data already in the repo (no new facts here):
// name and capital (lib/countries.ts, lib/capitals.ts, Arabic in lib/ar.ts), photo (lib/photos.ts), visa centre
// (lib/visaCentres.ts, copied from the website), proof of funds (lib/funds.ts, copied from the website) and the
// website's document page for the country (lib/destinations.ts documentPath on the website).
// Also: which of the user's applications belongs to this country, which drives the "Your application" card and the
// footer button. Checked by scripts/country-check.ts.
import { fromSlug, toSlug } from "./countries";
import { CAPITALS } from "./capitals";
import { PHOTOS } from "./photos";
import { AR } from "./ar";
import { siteUrl } from "./config";
import { centreFor, type VisaCentre } from "./visaCentres";
import { FUNDS_NOTE, FUNDS_RULES, type FundsRule } from "./funds";
import { isUserDiscarded } from "./timeline";
import { hasAnswers, type WizardForm } from "./wizard";
import type { Application } from "./data";

export type CountryInfo = {
  slug: string; name: string; nameAr: string; capital: string; capitalAr: string;
  photo: number; provider?: VisaCentre; funds?: FundsRule & { note: string }; docsUrl: string;
};

/** Website page with the country's document list (same path as web lib/destinations.ts documentPath). */
export const docsPath = (slug: string) => `/documents/required-documents-to-apply-for-a-tourist-visa-in-${slug}`;

export function countryInfo(slug: string): CountryInfo | null {
  const name = fromSlug(slug ?? "");
  if (!name) return null;
  const s = toSlug(name); const capital = CAPITALS[name]?.city ?? "";
  const rule = FUNDS_RULES[s];
  return {
    slug: s, name, nameAr: AR[name] ?? "", capital, capitalAr: AR[capital] ?? "",
    photo: PHOTOS[s], provider: centreFor(name), funds: rule ? { ...rule, note: FUNDS_NOTE[s] } : undefined, docsUrl: siteUrl(docsPath(s)),
  };
}

// ---- The user's application for this country ----
type DraftLike = { key: string; form: Pick<WizardForm, "destination"> & Partial<WizardForm>; savedAt: number; draftId?: string | null };
/** none: no application → Apply. draft: only unsubmitted drafts → Continue. active: a submitted or later case that is
 *  not finished → View (never a second Apply by accident). `count` = all open items for this country (drafts + cases). */
export type CountryApp =
  | { kind: "none"; count: 0 }
  | { kind: "draft"; app?: Application; draftKey?: string; count: number }
  | { kind: "active"; app: Application; count: number };

const FINISHED = ["completed", "rejected", "cancelled"];
const at = (a: Application) => Date.parse((a as any).updated_at ?? a.created_at ?? "") || 0;
const countryOf = (a: Application) => a.countries?.name ?? a.destination_country ?? "";

/** `apps`: the signed-in user's visible applications (useApps), `drafts`: this phone's drafts (useForm). */
export function countryApp(country: string, apps: Application[] | null | undefined, drafts: DraftLike[] = []): CountryApp {
  const mine = (apps ?? []).filter((a) => countryOf(a) === country && !FINISHED.includes(a.status) && !isUserDiscarded(a)).sort((x, y) => at(y) - at(x));
  const active = mine.filter((a) => a.status !== "draft");
  const byId = new Map(mine.map((a) => [a.id, a]));
  // A phone draft linked to a server row that is no longer a draft is that case, not a separate draft (same rule as Home).
  const local = drafts.filter((d) => (d.form.destination === country) && hasAnswers(d.form as WizardForm)
    && !(d.draftId && (apps ?? []).some((a) => a.id === d.draftId && a.status !== "draft"))).sort((x, y) => y.savedAt - x.savedAt);
  const linked = new Set(local.map((d) => d.draftId).filter(Boolean) as string[]);
  const server = mine.filter((a) => a.status === "draft" && !linked.has(a.id));
  const count = active.length + local.length + server.length;
  if (active.length) return { kind: "active", app: active[0], count };
  const d = local[0]; const s = server[0];
  if (d && (!s || d.savedAt >= at(s))) return { kind: "draft", draftKey: d.key, app: d.draftId ? byId.get(d.draftId) : undefined, count };
  if (s) return { kind: "draft", app: s, count };
  return { kind: "none", count: 0 };
}

export type FooterKind = "apply" | "continue" | "view";
/** The footer button for the user's applications to this country: Apply, Continue (draft) or View (open case). */
export const footerKind = (s: CountryApp): FooterKind => (s.kind === "active" ? "view" : s.kind === "draft" ? "continue" : "apply");
