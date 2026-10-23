"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

/**
 * Shown only when Supabase reports Google as an external provider,
 * or when NEXT_PUBLIC_ENABLE_GOOGLE_AUTH is explicitly true.
 */
export function GoogleSignInButton({ next = "/dashboard" }: { next?: string }) {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true") {
      setEnabled(true)
      return
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.external?.google === true) setEnabled(true)
      })
      .catch(() => {
        setEnabled(false)
      })
  }, [])

  if (!enabled) return null

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
