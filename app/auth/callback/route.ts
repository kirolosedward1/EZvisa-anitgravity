import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { safeNextPath } from "@/lib/safe-next"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Prevent open redirects (also rejects "/\\evil.com", which browsers read as "//evil.com").
  const next = safeNextPath(searchParams.get("next"))
  const type = searchParams.get("type") // e.g. "recovery"

  if (code) {
    const supabase = await createServerClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?error=Invalid+verification+link`)
}
