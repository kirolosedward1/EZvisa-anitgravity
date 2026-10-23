"use client"

// "Check your email" state shared by sign-up, magic link and password reset, with the same 60 s resend cooldown as the app.
import { useEffect, useState } from "react"
import { MailCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RESEND_SECONDS } from "@/lib/auth/errors"

export function useCooldown() {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const id = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [left])
  return { left, start: () => setLeft(RESEND_SECONDS) }
}

export function EmailSent({ email, note, onResend, resending, left, onChangeEmail }: { email: string; note: string; onResend: () => void; resending?: boolean; left: number; onChangeEmail: () => void }) {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center flex flex-col items-center gap-3" role="status">
      <div className="w-10 h-10 bg-emerald-600 text-primary-foreground rounded-full flex items-center justify-center">
        <MailCheck className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="font-semibold text-sm text-foreground">Check your email</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        We sent a link to <strong className="text-foreground">{email}</strong>. {note}
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onResend} disabled={resending || left > 0}>
          {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {left > 0 ? `Resend in ${left}s` : "Resend email"}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="text-xs text-primary" onClick={onChangeEmail}>
          Use another email
        </Button>
      </div>
    </div>
  )
}
