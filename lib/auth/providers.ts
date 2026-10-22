// Social sign-in availability, read from the project's public auth settings exactly like the app does
// (mobile/lib/google.ts, mobile/lib/apple.ts): a provider's button is shown only when it is enabled in Supabase
// (Auth → Providers), so enabling Google or Apple there switches the buttons on for the website and the app together.
import { supabasePublicEnv } from "@/lib/supabase/client"

export type SocialProvider = "google" | "apple"
export type Providers = Record<SocialProvider, boolean>
const NONE: Providers = { google: false, apple: false }

let cache: Promise<Providers> | null = null

export function enabledProviders(): Promise<Providers> {
  if (cache) return cache
  cache = (async () => {
    const { url, key, configured } = supabasePublicEnv()
    if (!configured) return NONE
    try {
      const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      if (!r.ok) return NONE
      const j = (await r.json()) as { external?: Record<string, boolean> }
      return { google: j?.external?.google === true, apple: j?.external?.apple === true }
    } catch {
      return NONE
    }
  })()
  return cache
}

export const PROVIDER_LABEL: Record<SocialProvider, string> = { google: "Google", apple: "Apple" }

/** Clear message when a provider is switched off or the site isn't on the redirect allow list (same wording as the app). */
export function socialMessage(provider: SocialProvider, raw: string): string {
  const name = PROVIDER_LABEL[provider]
  if (/provider is not enabled|Unsupported provider|validation_failed/i.test(raw)) return `${name} sign-in isn't set up yet. Please use email for now.`
  if (/redirect/i.test(raw)) return `This site isn't allowed to receive ${name} sign-ins yet. Please use email for now.`
  return raw
}
