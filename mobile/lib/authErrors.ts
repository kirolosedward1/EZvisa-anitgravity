// Short, plain auth messages (English keys; Arabic comes from lib/ar.ts through t()).
// Supabase error codes: node_modules/@supabase/auth-js/dist/module/lib/error-codes.d.ts.
import { isAuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";

export type AuthIssue =
  | "offline" | "wrong-credentials" | "unconfirmed" | "rate-limited" | "exists" | "weak-password" | "same-password"
  | "link-expired" | "other-device" | "session-ended" | "invalid-email" | "disabled" | "unknown";

export const AUTH_MESSAGE: Record<AuthIssue, string> = {
  offline: "You're offline. Connect to the internet and try again.",
  "wrong-credentials": "Wrong email or password.",
  unconfirmed: "Confirm your email first. Check your inbox for the link.",
  "rate-limited": "Too many tries. Wait a minute, then try again.",
  exists: "This email already has an account. Sign in instead.",
  "weak-password": "Choose a stronger password (at least 8 characters).",
  "same-password": "Choose a password you haven't used before.",
  "link-expired": "This link has expired or was already used. Ask for a new one.",
  "other-device": "Open the link on the phone where you asked for it, or ask for a new one here.",
  "session-ended": "Your session ended. Please sign in again.",
  "invalid-email": "Enter a valid email.",
  disabled: "This sign-in option isn't available right now.",
  unknown: "Something went wrong. Try again.",
};

const CODE: Record<string, AuthIssue> = {
  invalid_credentials: "wrong-credentials", email_not_confirmed: "unconfirmed",
  over_request_rate_limit: "rate-limited", over_email_send_rate_limit: "rate-limited",
  user_already_exists: "exists", email_exists: "exists", identity_already_exists: "exists",
  weak_password: "weak-password", same_password: "same-password",
  otp_expired: "link-expired", flow_state_expired: "link-expired", flow_state_not_found: "link-expired", bad_code_verifier: "link-expired",
  pkce_code_verifier_not_found: "other-device",
  session_not_found: "session-ended", session_expired: "session-ended", refresh_token_not_found: "session-ended", refresh_token_already_used: "session-ended",
  user_not_found: "session-ended", user_banned: "session-ended", reauthentication_needed: "session-ended",
  email_address_invalid: "invalid-email", validation_failed: "invalid-email",
  otp_disabled: "disabled", signup_disabled: "disabled", email_provider_disabled: "disabled", provider_disabled: "disabled",
};

/** True for "couldn't reach the server" (airplane mode, DNS, timeouts), as opposed to the server saying no. */
export function isNetworkError(e: unknown): boolean {
  if (!e) return false;
  if (isAuthRetryableFetchError(e)) return true;
  const m = String((e as any)?.message ?? e);
  return /network request failed|failed to fetch|network ?error|load failed|timed? ?out|internet connection appears to be offline/i.test(m);
}

/** Maps a Supabase error (or a redirect's error_code / error_description) to one of the messages above. */
export function classifyAuthError(e: unknown): AuthIssue {
  if (!e) return "unknown";
  if (isNetworkError(e)) return "offline";
  const code = String((e as any)?.code ?? (e as any)?.error_code ?? "");
  if (CODE[code]) return CODE[code];
  if ((e as any)?.name === "AuthPKCECodeVerifierMissingError") return "other-device";
  if (isAuthApiError(e) && e.status === 429) return "rate-limited";
  const m = String((e as any)?.message ?? (e as any)?.error_description ?? e);
  if (/invalid login credentials/i.test(m)) return "wrong-credentials";
  if (/email not confirmed/i.test(m)) return "unconfirmed";
  if (/rate limit|too many|security purposes/i.test(m)) return "rate-limited";
  if (/already registered|already exists/i.test(m)) return "exists";
  if (/expired|invalid.*(link|token|grant|flow)|already (been )?used/i.test(m)) return "link-expired";
  if (/code verifier/i.test(m)) return "other-device";
  if (/password.*(at least|should|weak|characters)/i.test(m)) return "weak-password";
  if (/different from the old/i.test(m)) return "same-password";
  if (/invalid.*email|email.*invalid/i.test(m)) return "invalid-email";
  if (/not (enabled|allowed)|disabled/i.test(m)) return "disabled";
  return "unknown";
}

export const authMessage = (e: unknown) => AUTH_MESSAGE[classifyAuthError(e)];
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 8;
