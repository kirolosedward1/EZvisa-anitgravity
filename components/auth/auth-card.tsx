import { LocaleLink } from "@/components/locale-link"
import { Image } from "@/components/image"

/** Shared frame for the sign-in, sign-up and password pages. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <LocaleLink href="/" className="mb-6 inline-flex items-center" aria-label="EZvisa home">
        <Image src="/images/logo-main.png" alt="EZvisa" width={120} height={36} className="h-9 w-auto" priority />
      </LocaleLink>
      <div className="w-full max-w-md flex flex-col gap-6 p-6 sm:p-8 bg-card rounded-2xl shadow-xl border border-border/60">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-xs md:text-sm mt-1.5 leading-relaxed">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  )
}
