// Where a tapped notification may lead. Pure (no React Native imports) so it can be checked with plain node.
// Pushes from notify-status carry only { type, applicationId, url }; local reminders carry { url }. Anything else is ignored.
// Every push opens its own screen (canvas rule), never Home: the application, its after-payment questions, the
// appointment, the trip plan or the receipt.
const APPLICATION = /^\/(applications|continue|appointment|trip|receipt|countdown)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL = new Set(["/account", "/apply"]);

export function notificationRoute(data: unknown): string | null {
  const url = data && typeof data === "object" ? (data as Record<string, unknown>).url : null;
  if (typeof url !== "string") return null;
  return APPLICATION.test(url) || LOCAL.has(url) ? url : null;
}

/** Application screens need the owner's session (RLS); they open after sign-in. */
export const needsSession = (url: string) => /^\/(applications|continue|appointment|trip|receipt|countdown)\//.test(url);
