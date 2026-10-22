import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { completeAuth, parseAuthUrl } from "./authLinks";
import { AUTH_MESSAGE } from "./authErrors";
import { supabase } from "./supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

WebBrowser.maybeCompleteAuthSession();

/** True only when Google is enabled on the live project (GET /auth/v1/settings). It is currently off, like on the website. */
export async function googleEnabled(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try { const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } }); const j = await r.json(); return j?.external?.google === true; } catch { return false; }
}

/** Google sign-in via Supabase OAuth (PKCE). Works in Expo Go (exp://…) and standalone (ezvisa://…). */
export async function signInWithGoogle(): Promise<"ok" | "cancel"> {
  if (!supabase) throw new Error("Sign-in isn't configured.");
  const redirectTo = makeRedirectUri({ scheme: "ezvisa", path: "auth/callback" });
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
  if (error) throw friendly(error.message);
  if (!data?.url) throw new Error("Google sign-in isn't available yet.");
  // Check the provider is enabled first so users get a clear message instead of an error page.
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } });
    const j = await r.json();
    if (j?.external && j.external.google === false) throw friendly("provider is not enabled");
  } catch (e: any) { if (e?.isFriendly) throw e; }
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== "success") return "cancel";
  const p = parseAuthUrl(res.url);
  if (p.error_description) throw friendly(p.error_description);
  // Shared with the /auth/callback screen, so the code is exchanged once even if the OS also routes the URL there.
  const r = await completeAuth(p);
  if (r.ok) return "ok";
  throw friendly(r.issue === "offline" ? AUTH_MESSAGE.offline : "Google sign-in didn't complete. Please try again.");
}

function friendly(msg: string) {
  const m = /provider is not enabled|Unsupported provider|validation_failed/i.test(msg) ? "Google sign-in isn't set up yet. Please use email for now." : /redirect/i.test(msg) ? "This app isn't allowed to receive Google sign-ins yet. Please use email for now." : msg;
  const e: any = new Error(m); e.isFriendly = true; return e;
}
