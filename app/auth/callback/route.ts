import { handleAuthCallback } from "@/lib/auth/handle-auth-callback"

export const dynamic = "force-dynamic"

/** OAuth return, and any email link that still points here. See lib/auth/handle-auth-callback.ts. */
export function GET(request: Request) {
  return handleAuthCallback(request)
}
