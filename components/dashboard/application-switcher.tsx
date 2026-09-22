import Image from "next/image"
import Link from "next/link"
import { getFlagSrc, getStatusLabel } from "@/lib/application-status"
import { cn } from "@/lib/utils"
import type { VisaApplication } from "@/lib/types/visa-application"

export function ApplicationSwitcher({
  apps,
  activeId,
  hrefFor,
}: {
  apps: VisaApplication[]
  activeId?: string
  hrefFor: (app: VisaApplication) => string
}) {
  if (apps.length < 2) return null

  return (
    <nav aria-label="Your applications" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 rounded-2xl border border-border/60 bg-card p-1.5 shadow-sm">
        {apps.map((app) => {
          const isActive = app.id === activeId
          const status = getStatusLabel(app)
          return (
            <li key={app.id}>
              <Link
                href={hrefFor(app)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors",
                  isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-secondary",
                )}
              >
                <span className="relative size-7 shrink-0 overflow-hidden rounded-full border border-border/60">
                  <Image src={getFlagSrc(app.destination_country)} alt="" fill sizes="28px" className="object-cover" />
                </span>
                <span className="flex flex-col">
                  <span className="whitespace-nowrap text-sm font-semibold">{app.destination_country}</span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-xs",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {app.full_name} · {status.label}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
