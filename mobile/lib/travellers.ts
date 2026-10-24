// Saved travellers: the people this account applied for, kept by the website (public.travellers, lib/travellers.ts on
// the website). Read through GET /api/travellers with the session's Bearer token, so the list is exactly the one the
// website's "Who is travelling?" drop-down shows (built from past applications the first time). Read-only here.
import { supabase } from "./supabase";
import { siteUrl } from "./config";
import { defaultTraveller, type Traveller } from "./wizard";

/** The account's saved travellers, the default one (self, else most recently used) first. Empty when signed out or offline. */
export async function listTravellers(): Promise<Traveller[]> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  if (!token) return [];
  try {
    const r = await fetch(siteUrl("/api/travellers"), { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (!r.ok) return [];
    const j: any = await r.json().catch(() => ({}));
    const list: Traveller[] = Array.isArray(j?.travellers) ? j.travellers.filter((t: any) => t && typeof t.id === "string") : [];
    const first = defaultTraveller(list);
    return first ? [first, ...list.filter((t) => t.id !== first.id)] : list;
  } catch {
    return [];
  }
}
