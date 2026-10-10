import type { Session } from "@supabase/supabase-js"
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { config } from "./config"
import { supabase } from "./supabase"

interface AuthState {
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/** Turns Supabase auth errors into copy a customer can act on. */
export function authErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match. Try again or reset your password."
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox for the link we sent."
  if (/already registered|already exists/i.test(msg)) return "An account with this email already exists. Sign in instead."
  if (/password should be at least/i.test(msg)) return "Use a password with at least 8 characters."
  if (/network|fetch/i.test(msg)) return "You're offline. Check your connection and try again."
  return msg || "Something went wrong. Please try again."
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      },
      async signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            // Confirmation link opens the website's login page; the user then signs in here.
            emailRedirectTo: `${config.siteUrl}/login`,
          },
        })
        if (error) throw error
        return { needsConfirmation: !data.session }
      },
      async signOut() {
        await supabase.auth.signOut()
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
