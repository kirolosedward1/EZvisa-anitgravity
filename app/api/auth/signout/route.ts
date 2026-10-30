import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

async function handleSignOut(request: Request) {
  const cookieStore = await cookies()
  
  // Clear demo session cookies
  cookieStore.delete("ez_demo_session")
  cookieStore.delete("ez_demo_active")
  cookieStore.delete("ez_demo_staff")

  try {
    const supabase = await createServerClient()
    await supabase.auth.signOut()
  } catch (err) {
    // Graceful fallback
  }

  const referer = request.headers.get("referer")
  let refererArabic = false
  if (referer) {
    try {
      const path = new URL(referer).pathname
      refererArabic = path === "/ar" || path.startsWith("/ar/")
    } catch {
      refererArabic = false
    }
  }
  const arabic = request.headers.get("x-ez-locale") === "ar" || refererArabic
  return NextResponse.redirect(new URL(arabic ? "/ar/login" : "/login", request.url), {
    status: 302,
  })
}

export async function POST(request: Request) {
  return handleSignOut(request)
}

export async function GET(request: Request) {
  return handleSignOut(request)
}

