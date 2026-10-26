"use client"

// Google, and Apple when NEXT_PUBLIC_APPLE_SIGNIN_ENABLED is "true".
// With Apple off, Google sits alone above one divider. The parent auth column uses the same
// gap-5 below this block, so the space above and below the divider matches.
import { AppleSignInButton } from "@/components/auth/apple-sign-in"
import { GoogleSignInButton } from "@/components/auth/google-sign-in"
import { appleSignInEnabled } from "@/lib/auth/apple-signin-flag"

export function SocialSignIn({
  next,
  appleLabel,
  googleLabel,
  linkingNote,
  divider,
  onAppleError,
  onGoogleError,
}: {
  next: string
  appleLabel: string
  googleLabel: string
  /** Shown under the buttons only while Apple sign-in is on. */
  linkingNote: string
  divider: string
  onAppleError?: (message: string) => void
  onGoogleError?: (message: string) => void
}) {
  const apple = appleSignInEnabled()

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <div className="flex w-full min-w-0 flex-col gap-3">
        {apple ? <AppleSignInButton next={next} label={appleLabel} onError={onAppleError} /> : null}
        <GoogleSignInButton next={next} label={googleLabel} onError={onGoogleError} />
        {apple ? <p className="text-center text-xs leading-relaxed text-muted-foreground">{linkingNote}</p> : null}
      </div>
      <div
        data-auth-divider={divider}
        className="flex w-full min-w-0 items-center gap-3 text-xs font-medium text-muted-foreground"
      >
        <span className="h-px min-w-0 flex-1 bg-border" />
        <span className="shrink-0">{divider}</span>
        <span className="h-px min-w-0 flex-1 bg-border" />
      </div>
    </div>
  )
}
