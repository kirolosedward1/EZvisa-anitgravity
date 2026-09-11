import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

async function handleSignOut(request: Request) {
  const cookieStore = await cookies()
  
  // Clear demo session cookies
  cookieStore.delete("ez_demo_session")
  cookieStore.delete("ez_demo_active")

  try {
    const supabase = await createServerClient()
    await supabase.auth.signOut()
  } catch (err) {
    // Graceful fallback
  }

  return NextResponse.redirect(new URL("/login", request.url), {
    status: 302,
  })
}

export async function POST(request: Request) {
  return handleSignOut(request)
}

export async function GET(request: Request) {
  return handleSignOut(request)
}

