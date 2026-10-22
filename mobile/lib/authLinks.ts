// Email links (confirm sign-up, magic link, password reset) open the app at /auth/callback.
// Production: ezvisa://auth/callback. Expo Go: exp://<host>/--/auth/callback. Supabase only redirects to URLs on its
// allow list (Auth -> URL Configuration), otherwise it falls back to the Site URL. See HANDOFF "Redirect URLs".
// PKCE: the app that asked for the link keeps the code verifier in SecureStore, so a link opened on another phone (or
// in a browser) can't sign in there. That case gets its own message.
import * as ExpoLinking from "expo-linking";
import { supabase } from "./supabase";
import { classifyAuthError, type AuthIssue } from "./authErrors";

export type LinkType = "signup" | "magiclink" | "recovery";
export const authRedirect = (type: LinkType) => ExpoLinking.createURL("auth/callback", { queryParams: { type } });

export type LinkParams = { code?: string; type?: string; error?: string; error_code?: string; error_description?: string; access_token?: string; refresh_token?: string };
export type LinkResult = { ok: true; recovery: boolean } | { ok: false; issue: AuthIssue };

/** Query and fragment parameters of an auth redirect URL (Supabase puts errors in either). */
export function parseAuthUrl(url: string | null | undefined): LinkParams {
  if (!url) return {};
  const [beforeHash, hash = ""] = url.split("#");
  const query = beforeHash.includes("?") ? beforeHash.slice(beforeHash.indexOf("?") + 1) : "";
  const out: Record<string, string> = {};
  for (const part of [query, hash]) new URLSearchParams(part).forEach((v, k) => { out[k] = v; });
  return out;
}

// One exchange per code, even if the screen and the OAuth helper both see the same URL (a code works only once).
const inflight = new Map<string, Promise<LinkResult>>();

export function completeAuth(p: LinkParams): Promise<LinkResult> {
  if (!supabase) return Promise.resolve({ ok: false, issue: "unknown" });
  if (p.error || p.error_code || p.error_description) return Promise.resolve({ ok: false, issue: classifyAuthError({ code: p.error_code, message: p.error_description ?? p.error }) });
  const sb = supabase;
  if (p.code) {
    const code = p.code;
    if (!inflight.has(code)) inflight.set(code, (async (): Promise<LinkResult> => {
      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      if (error) return { ok: false, issue: classifyAuthError(error) };
      return { ok: true, recovery: (data as { redirectType?: string | null }).redirectType === "recovery" || p.type === "recovery" };
    })());
    return inflight.get(code)!;
  }
  if (p.access_token && p.refresh_token) // implicit-flow links (e.g. a template that still uses them)
    return sb.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token })
      .then(({ error }) => (error ? { ok: false as const, issue: classifyAuthError(error) } : { ok: true as const, recovery: p.type === "recovery" }));
  return Promise.resolve({ ok: false, issue: "link-expired" });
}

export const completeAuthFromUrl = (url: string) => completeAuth(parseAuthUrl(url));
