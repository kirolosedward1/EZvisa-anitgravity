"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

/** Shown by default. Set NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=false to hide it. */
export function GoogleSignInButton({ next = "/dashboard" }: { next?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "false") return null

  const signIn = async () => {
    setLoading(true)
    setError("")
    const supabase = createBrowserClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" className="h-11 w-full rounded-xl" onClick={signIn} disabled={loading}>
        {loading ? <Loader2 className="me-2 size-4 animate-spin" /> : null}
        Continue with Google
      </Button>
      {error ? <p className="text-center text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
