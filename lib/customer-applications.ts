/**
 * Who is looking at the customer pages and which applications they own: the signed-in Supabase user, a demo login
 * (cookie, or ?demo=<scenario>), or the preview-only empty account (?demo=empty). Shared by /dashboard and
 * /dashboard/applications so both list exactly the same cases. Redirects to sign-in when there is nobody.
 */
import { cookies } from "next/headers"
import { createServerClient } from "@/lib/supabase/server"
import { redirectLocalized } from "@/lib/request-locale"
import { DEMO_CONFIGS, getDemoApplicationsByEmail, isDemoEmail, type DemoScenario } from "@/lib/demo-data"
import { visibleApplications } from "@/lib/active-applications"
import type { VisaApplication } from "@/lib/types/visa-application"

// Demo shortcuts are for previews and local testing, not real customers
export const SHOW_DEMO_ACCESS = process.env.VERCEL_ENV !== "production"

export type CustomerViewer = { email: string; user_metadata?: Record<string, unknown> | null }
export type DemoSession = { email: string; name: string; scenario: DemoScenario }

export async function loadCustomerApplications({ demoParam, arabic, next }: { demoParam?: string; arabic: boolean; next: string }) {
  const demoCookie = (await cookies()).get("ez_demo_session")

  let demoSession: DemoSession | null = null
  if (demoCookie?.value) {
    try {
      const parsed = JSON.parse(demoCookie.value)
      // The cookie is client-editable: only honour it for demo accounts
      const config = DEMO_CONFIGS[parsed?.scenario as DemoScenario]
      if (config && parsed.email === config.email) demoSession = parsed
    } catch {
      // ignore JSON parse error
    }
  } else if (demoParam && demoParam in DEMO_CONFIGS) {
    const config = DEMO_CONFIGS[demoParam as DemoScenario]
    demoSession = { email: config.email, name: config.name, scenario: config.id }
  }

  let user: CustomerViewer | null = null
  // Preview builds only: ?demo=empty shows the pages of an account with no applications.
  const emptyPreview = SHOW_DEMO_ACCESS && demoParam === "empty"

  if (emptyPreview) {
    user = { email: "demo.empty@ezvisa.net", user_metadata: { full_name: "Demo Visitor" } }
  } else if (demoSession) {
    user = { email: demoSession.email, user_metadata: { full_name: demoSession.name } }
  } else {
    try {
      const supabase = await createServerClient()
      const { data } = await supabase.auth.getUser()
      if (data.user?.email) user = { email: data.user.email, user_metadata: data.user.user_metadata }
    } catch {
      // Fallback if supabase client fails
    }
  }

  if (!user?.email) redirectLocalized(`/login?next=${next}`, arabic)

  const isDemo = isDemoEmail(user.email)
  let apps: VisaApplication[] = []

  if (emptyPreview) {
    apps = []
  } else if (isDemo) {
    apps = getDemoApplicationsByEmail(user.email)
  } else {
    try {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from("visa_applications")
        .select("*")
        .eq("email", user.email)
        .order("created_at", { ascending: false })
      if (!error && data && data.length > 0) apps = data
    } catch {
      // Fallback
    }
  }

  return { user, demoSession, isDemo, emptyPreview, apps: visibleApplications(apps) }
}
