"use client"

// "Check your email" state shared by sign-in link, sign-up and password reset, with the same 60 s resend cooldown as the app.
import { useEffect, useState } from "react"
import { ArrowUpRight, Loader2, Mail } from "lucide-react"
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

// Webmail inboxes we can open directly, by the address's domain.
const INBOXES: { name: string; url: string; domains: string[] }[] = [
  { name: "Gmail", url: "https://mail.google.com/mail/u/0/#inbox", domains: ["gmail.com", "googlemail.com"] },
  { name: "Outlook", url: "https://outlook.live.com/mail/0/inbox", domains: ["outlook.com", "hotmail.com", "live.com", "msn.com"] },
  { name: "Yahoo Mail", url: "https://mail.yahoo.com", domains: ["yahoo.com", "ymail.com"] },
  { name: "iCloud Mail", url: "https://www.icloud.com/mail", domains: ["icloud.com", "me.com", "mac.com"] },
]

function inboxFor(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? ""
  return INBOXES.find((inbox) => inbox.domains.includes(domain))
}

export function EmailSent({
  email,
  note,
  onResend,
  resending,
  left = 0,
  onChangeEmail,
  title = "Check your email",
}: {
  email: string
  note: string
  onResend?: () => void
  resending?: boolean
  left?: number
  onChangeEmail?: () => void
  title?: string
}) {
  const inbox = inboxFor(email)

  return (
    <div className="flex flex-col gap-6" role="status">
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="panel-title panel-title-lg text-foreground">{title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We sent a link to <span className="ltr-isolate font-medium text-foreground">{email}</span>. {note}
          </p>
        </div>
      </div>

      {inbox && (
        <Button asChild className="h-12 w-full rounded-xl text-sm font-semibold">
          <a href={inbox.url} target="_blank" rel="noopener noreferrer">
            Open {inbox.name}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </Button>
      )}

      <div className="flex flex-col gap-2 border-t border-border/70 pt-5 text-sm text-muted-foreground">
        <p>Not there? Check your spam or promotions folder.</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {onResend && (
            <button
              type="button"
              onClick={onResend}
              disabled={resending || left > 0}
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
            >
              {resending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              {left > 0 ? `Resend in ${left}s` : "Resend email"}
            </button>
          )}
          {onChangeEmail && (
            <button type="button" onClick={onChangeEmail} className="font-medium text-primary hover:underline">
              Use a different email
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
