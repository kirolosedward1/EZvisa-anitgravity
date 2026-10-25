// Server-side helpers for reading a customer's application the same way the app does (lib/data.ts in mobile/):
// ownership = the row's email equals the signed-in user's email; tracking links are secret and stand in for a session.
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"
import { isDemoEmail, isDemoToken, getDemoApplicationByToken, getDemoApplicationsByEmail, DEMO_CONFIGS, type DemoScenario } from "@/lib/demo-data"
import type { VisaApplication } from "@/lib/types/visa-application"
import { metadataFullName } from "@/lib/auth/apple-profile"

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_ezvisaSUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export type SessionUser = { email: string; name?: string; demo: boolean; scenario?: DemoScenario }

/** The signed-in customer: a demo session cookie (only for the known demo accounts) or the Supabase session. */
export async function getSessionUser(demoParam?: string | null): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const demoCookie = cookieStore.get("ez_demo_session")
  if (demoCookie?.value) {
    try {
      const d = JSON.parse(demoCookie.value)
      if (d?.email && isDemoEmail(d.email)) return { email: String(d.email).toLowerCase(), name: d.name, demo: true, scenario: d.scenario }
    } catch {
      // ignore a malformed cookie
    }
  } else if (demoParam && demoParam in DEMO_CONFIGS) {
    const c = DEMO_CONFIGS[demoParam as DemoScenario]
    return { email: c.email, name: c.name, demo: true, scenario: c.id }
  }
  try {
    const supabase = await createServerClient()
    const { data } = await supabase.auth.getUser()
    if (data.user?.email) return { email: data.user.email.toLowerCase(), name: metadataFullName(data.user.user_metadata, data.user.email) || undefined, demo: false }
  } catch {
    // no session
  }
  return null
}

/** Every case of this customer, newest first (demo accounts come from lib/demo-data). */
export async function listApplicationsFor(user: SessionUser): Promise<VisaApplication[]> {
  if (user.demo) return getDemoApplicationsByEmail(user.email)
  const supabase = serviceClient()
  if (!supabase) return []
  const { data } = await supabase.from("visa_applications").select("*").ilike("email", user.email).order("created_at", { ascending: false })
  return (data ?? []).filter((r) => String(r.email ?? "").toLowerCase() === user.email) as VisaApplication[]
}

/** One case by id, only if it belongs to this customer. */
export async function getOwnApplication(user: SessionUser, id: string): Promise<VisaApplication | null> {
  if (!UUID_RE.test(id) && !user.demo) return null
  if (user.demo) return getDemoApplicationsByEmail(user.email).find((a) => a.id === id) ?? null
  const supabase = serviceClient()
  if (!supabase) return null
  const { data } = await supabase.from("visa_applications").select("*").eq("id", id).maybeSingle()
  if (!data || String(data.email ?? "").toLowerCase() !== user.email) return null
  return data as VisaApplication
}

/** One case by its secret tracking link. */
export async function getApplicationByToken(token: string): Promise<VisaApplication | null> {
  if (isDemoToken(token)) return getDemoApplicationByToken(token)
  const supabase = serviceClient()
  if (!supabase) return getDemoApplicationByToken(token)
  const { data } = await supabase.from("visa_applications").select("*").eq("tracking_token", token).maybeSingle()
  return (data as VisaApplication | null) ?? getDemoApplicationByToken(token)
}

/** Link to the upload desk of a case: the secret tracking link when the database has one, else the signed-in dashboard. */
export const uploadPath = (a: Pick<VisaApplication, "id" | "tracking_token">) => (a.tracking_token ? `/track/${a.tracking_token}/upload` : `/dashboard/upload?id=${a.id}`)
export const continuePath = (a: Pick<VisaApplication, "id" | "tracking_token">) => `/continue/${a.id}`
export const trackPath = (a: Pick<VisaApplication, "id" | "tracking_token">) => (a.tracking_token ? `/track/${a.tracking_token}` : `/dashboard?id=${a.id}`)
