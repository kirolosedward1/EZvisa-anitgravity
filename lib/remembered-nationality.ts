// The applicant's nationality, remembered so the wizard can preselect it next time: a first-party cookie on this
// device, and for signed-in customers their latest application (so a new device knows it too).
import { createBrowserClient, supabasePublicEnv } from "@/lib/supabase/client"
import { toCitizenshipIso } from "@/lib/nationalities"

const COOKIE = "ez_nationality"
const ONE_YEAR = 60 * 60 * 24 * 365

/** ISO alpha-2 nationality chosen on this device before, or "". */
export function readRememberedNationality(): string {
  if (typeof document === "undefined") return ""
  const match = document.cookie.match(/(?:^|;\s*)ez_nationality=([^;]*)/)
  return match ? toCitizenshipIso(decodeURIComponent(match[1])) : ""
}

export function rememberNationality(value: string) {
  const iso = toCitizenshipIso(value)
  if (!iso || typeof document === "undefined") return
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${COOKIE}=${encodeURIComponent(iso)}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax${secure}`
}

/** Nationality on the signed-in customer's latest application, or "" (signed out, none yet, or offline). */
export async function fetchAccountNationality(): Promise<string> {
  if (!supabasePublicEnv().configured) return ""
  try {
    const supabase = createBrowserClient()
    const { data: auth } = await supabase.auth.getSession()
    const email = auth.session?.user?.email
    if (!email) return ""
    const { data } = await supabase
      .from("visa_applications")
      .select("nationality")
      .ilike("email", email)
      .not("nationality", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    return toCitizenshipIso(data?.nationality)
  } catch {
    return ""
  }
}
