import { PRICE_LABEL } from "./content"
import { StoreBadges } from "./store-badges"

export function DownloadSection() {
  return (
    <div className="flex flex-col gap-8 rounded-3xl border border-border bg-card p-8 shadow-sm md:flex-row md:items-center md:justify-between md:p-12">
      <div className="flex max-w-lg flex-col gap-3 text-start">
        <h2 id="app-download-heading" className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
          Get the EZvisa app
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Free to download. {PRICE_LABEL} per application, paid in the app when you are ready, with a money-back
          guarantee if the visa is denied.
        </p>
      </div>
      <StoreBadges size="lg" className="shrink-0" />
    </div>
  )
}
