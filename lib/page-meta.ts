import type { Metadata } from "next"
import { requestLocale } from "@/lib/request-locale"
import { OG_LOCALE, SITE_URL, defaultOgImage } from "@/lib/seo"

type ArabicMeta = {
  title: string
  description?: string
  /** Absolute path on the Arabic site, starting with /ar. */
  path: string
  /**
   * False when the Arabic page only translates the page chrome, not its main content (e.g. a news post
   * without an Arabic body). The /ar URL then canonicalises to the English page and no hreflang pair is published.
   */
  translated?: boolean
}

function isNoindex(meta: Metadata): boolean {
  return typeof meta.robots === "object" && meta.robots !== null && meta.robots.index === false
}

/**
 * English metadata keeps its own title and description. /ar replaces the title, description,
 * canonical URL and Open Graph locale. Indexable pages also get the en/ar hreflang pair, and every
 * page gets a complete Open Graph block (a page's openGraph replaces the root one entirely, so a
 * missing image or URL would otherwise fall back to nothing or to the homepage's).
 */
export async function withArabicMeta(en: Metadata, ar: ArabicMeta): Promise<Metadata> {
  const arabic = (await requestLocale()) === "ar"
  const translated = ar.translated !== false
  const enPath = ar.path.replace(/^\/ar(?=\/|$)/, "") || "/"
  const enUrl = `${SITE_URL}${enPath}`
  const arUrl = `${SITE_URL}${ar.path}`

  const alternates = typeof en.alternates === "object" && en.alternates ? en.alternates : {}
  const languages = translated && !isNoindex(en) ? { en: enUrl, ar: arUrl, "x-default": enUrl } : undefined
  const openGraph = typeof en.openGraph === "object" && en.openGraph ? en.openGraph : {}
  const twitter = typeof en.twitter === "object" && en.twitter ? en.twitter : undefined

  const title = arabic ? ar.title : typeof en.title === "string" ? en.title : undefined
  const description = arabic
    ? ar.description ?? (typeof en.description === "string" ? en.description : undefined)
    : typeof en.description === "string"
      ? en.description
      : undefined
  const canonical = arabic ? (translated ? arUrl : enUrl) : (alternates.canonical ?? enUrl)

  const completeOpenGraph = {
    siteName: "EZvisa",
    type: "website",
    ...openGraph,
    ...(arabic ? { title: ar.title, description } : { title: openGraph.title ?? title, description: openGraph.description ?? description }),
    url: arabic ? arUrl : (openGraph.url ?? enUrl),
    locale: OG_LOCALE[arabic ? "ar" : "en"],
    alternateLocale: OG_LOCALE[arabic ? "en" : "ar"],
    images: openGraph.images ?? [defaultOgImage(arabic)],
  } as Metadata["openGraph"]

  return {
    ...en,
    ...(arabic ? { title: ar.title, description } : {}),
    alternates: { ...alternates, canonical, ...(languages ? { languages } : {}) },
    openGraph: completeOpenGraph,
    ...(arabic && twitter ? { twitter: { ...twitter, title: ar.title, description } } : {}),
  }
}
