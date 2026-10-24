// Social sign-in on the website.
// - Google is always offered (the main social login for EZvisa customers). It signs people in through Supabase OAuth,
//   so the Google provider must be enabled on the project (docs/AUTH_SETUP.md); until it is, the button explains that
//   instead of failing on an error page.
// - Apple is always offered on /login and /signup. The button is Apple's own JS artwork and the round trip is
//   Supabase OAuth back to /auth/callback. Until the Apple provider is enabled, the button says so. The project's
//   public /auth/v1/settings (the same check as mobile/lib/apple.ts) is what tells the button to stop early.
import { supabasePublicEnv } from "@/lib/supabase/client"

export type SocialProvider = "google" | "apple"
export type Providers = Record<SocialProvider, boolean>
/** Providers the website shows before (and regardless of) the settings lookup. */
export const ALWAYS_OFFERED: SocialProvider[] = ["google"]
const NONE: Providers = { google: false, apple: false }

let cache: Promise<Providers | null> | null = null

/** Which providers the Supabase project has enabled; null when the settings could not be read. */
export function enabledProviders(): Promise<Providers | null> {
  if (cache) return cache
  cache = (async () => {
    const { url, key, configured } = supabasePublicEnv()
    if (!configured) return NONE
    try {
      const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      if (!r.ok) return null
      const j = (await r.json()) as { external?: Record<string, boolean> }
      return { google: j?.external?.google === true, apple: j?.external?.apple === true }
    } catch {
      return null
    }
  })()
  return cache
}

export const PROVIDER_LABEL: Record<SocialProvider, string> = { google: "Google", apple: "Apple" }

export const NOT_SET_UP = (provider: SocialProvider) => `${PROVIDER_LABEL[provider]} sign-in isn't set up yet. Please use email for now.`

/** Clear message when a provider is switched off or the site isn't on the redirect allow list (same wording as the app). */
export function socialMessage(provider: SocialProvider, raw: string): string {
  const name = PROVIDER_LABEL[provider]
  if (/provider is not enabled|Unsupported provider|validation_failed/i.test(raw)) return NOT_SET_UP(provider)
  if (/redirect/i.test(raw)) return `This site isn't allowed to receive ${name} sign-ins yet. Please use email for now.`
  return raw
}
