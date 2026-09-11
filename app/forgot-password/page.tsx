"use client"
import { useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createBrowserClient()


  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8 p-8 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-border/50">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Reset password</h2>
          <p className="text-muted-foreground mt-2">Enter your email to receive a reset link</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200">
              <AlertDescription>We've sent a password reset link to your email.</AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send reset link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
