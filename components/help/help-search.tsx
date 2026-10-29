"use client"

import { useId, useMemo, useState } from "react"
import { ArrowRight, Search, X } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { searchHelp, type HelpSearchItem } from "@/lib/help/search"

/** Search box for the help center home. Results are plain links; an empty box shows nothing (the topics are below). */
export function HelpSearch({ items, arabic }: { items: HelpSearchItem[]; arabic: boolean }) {
  const [query, setQuery] = useState("")
  const results = useMemo(() => searchHelp(items, query), [items, query])
  const id = useId()
  const pick = (en: string, ar: string) => (arabic ? ar : en)
  const searching = query.trim().length > 1

  return (
    <div className="w-full max-w-xl">
      <label htmlFor={`${id}-input`} className="sr-only">{pick("Search the help center", "ابحث في مركز المساعدة")}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id={`${id}-input`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={pick("Search, e.g. refund, upload, insurance", "ابحث، مثلًا: استرداد، رفع، تأمين")}
          autoComplete="off"
          aria-controls={`${id}-results`}
          className="h-14 w-full rounded-full border border-border bg-background pe-12 ps-12 text-base text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={pick("Clear search", "مسح البحث")}
            className="absolute end-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div id={`${id}-results`} aria-live="polite">
        {searching && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border/70 bg-background text-start shadow-lg">
            {results.length ? (
              <ul>
                {results.map((result) => (
                  <li key={result.href} className="border-b border-border/70 last:border-0">
                    <LocaleLink href={result.href} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/60">
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-medium text-foreground group-hover:text-primary">{result.title}</span>
                        <span className="truncate text-sm text-muted-foreground">{result.topic}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-muted-foreground">
                {pick("No articles match that. Try another word, or message us on WhatsApp.", "لا توجد مقالات مطابقة. جرّب كلمة أخرى، أو راسلنا عبر واتساب.")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
