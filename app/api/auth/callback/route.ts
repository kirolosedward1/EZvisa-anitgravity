import { handleAuthCallback } from "@/lib/auth/handle-auth-callback"

export const dynamic = "force-dynamic"

/** Older sign-up emails pointed here. Same rules as /auth/callback, including a session that is already signed in. */
export function GET(request: Request) {
  return handleAuthCallback(request)
}
