import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/dashboard"
  // Prevent open redirects: enforce internal relative path starting with / and not //
  const isSafeRelativePath = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":")
  const next = isSafeRelativePath ? rawNext : "/dashboard"
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
