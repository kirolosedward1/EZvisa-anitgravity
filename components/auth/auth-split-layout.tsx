import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, FileCheck2, ShieldCheck, Smartphone, Upload } from "lucide-react"

import { IphoneFrame } from "@/components/app/iphone-frame"
import { SCREENS } from "@/components/app/content"

const POINTS = [
  { icon: FileCheck2, text: "Follow every step of your application" },
  { icon: Upload, text: "Upload your documents securely" },
  { icon: Smartphone, text: "Same account as the EZvisa app" },
]

/**
 * Two-column frame for the sign-in pages. Desktop: brand panel (left) with an app preview, form (right).
 * Mobile and tablet: the form alone, with the logo on top.
 */
export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-e border-border/70 bg-secondary lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:self-start">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-15 [background-image:radial-gradient(var(--primary)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_30%_20%,black_10%,transparent_70%)]"
        />
        <div className="relative flex flex-col gap-10 px-12 pt-12 xl:px-16">
          <Link href="/" className="inline-flex w-fit" aria-label="EZvisa home">
            <Image src="/images/logo-main.png" alt="EZvisa" width={140} height={44} className="h-9 w-auto" priority />
          </Link>

          <div className="flex max-w-md flex-col gap-6">
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Customer portal
            </span>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-foreground text-balance">
              Your Schengen visa, tracked in one place
            </h2>
            <ul className="flex flex-col gap-3">
              {POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm ring-1 ring-border/70">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              29 Schengen countries · Ready in 1–2 days
            </p>
          </div>
        </div>

        {/* App preview, bleeding off the bottom edge */}
        <div className="relative mt-auto flex justify-center pt-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_50%_90%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_60%)]" />
          <div className="relative -mb-40 w-60 xl:w-64">
            <IphoneFrame src={SCREENS.home.src} alt={SCREENS.home.alt} sizes="256px" className="w-full" />
          </div>
        </div>
      </aside>

      {/* Form column */}
      <main id="main-content" className="flex min-h-[100dvh] flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            Back to home
          </Link>
          <Link href="/" className="lg:hidden" aria-label="EZvisa home">
            <Image src="/images/logo-main.png" alt="EZvisa" width={110} height={34} className="h-7 w-auto" priority />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  )
}
