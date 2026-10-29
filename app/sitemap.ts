import type { MetadataRoute } from "next"
import { SCHENGEN_COUNTRIES } from "@/lib/countries"
import { getAllPostsForBuild } from "@/lib/blog"
import { ARABIC_POSTS } from "@/lib/blog-ar"
import { SITE_URL } from "@/lib/seo"

type Entry = MetadataRoute.Sitemap[number]
type Page = {
  /** English path. The Arabic page is the same path under /ar. */
  path: string
  changeFrequency: Entry["changeFrequency"]
  priority: number
  lastModified?: Date
  /** False when the /ar page has no Arabic main content and canonicalises to English. */
  arabic?: boolean
}

// Indexable public pages. Account, payment, tracking and wizard pages are noindex and stay out.
const STATIC_PAGES: Page[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/destinations", changeFrequency: "weekly", priority: 0.9 },
  { path: "/documents", changeFrequency: "weekly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.85 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.8 },
  { path: "/news", changeFrequency: "weekly", priority: 0.8 },
  { path: "/tools", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/schengen-calculator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/bank-balance-calculator", changeFrequency: "monthly", priority: 0.75 },
  { path: "/tools/appointment-guide", changeFrequency: "monthly", priority: 0.75 },
  { path: "/videos", changeFrequency: "monthly", priority: 0.7 },
  { path: "/app", changeFrequency: "monthly", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.3 },
  { path: "/refund-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/disclaimer", changeFrequency: "yearly", priority: 0.3 },
]

const countrySlug = (country: string) => country.toLowerCase().replace(/\s+/g, "-")

function urls(path: string) {
  return {
    en: `${SITE_URL}${path === "/" ? "/" : path}`,
    ar: `${SITE_URL}/ar${path === "/" ? "" : path}`,
  }
}

/** One entry per language, each listing both versions (hreflang) when the page is translated. */
function entries(page: Page): MetadataRoute.Sitemap {
  const { en, ar } = urls(page.path)
  const common = {
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    ...(page.lastModified ? { lastModified: page.lastModified } : {}),
  }
  if (page.arabic === false) return [{ url: en, ...common }]
  const alternates = { languages: { en, ar, "x-default": en } }
  return [
    { url: en, ...common, alternates },
    { url: ar, ...common, alternates },
  ]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Destination landing pages and country document checklists: the main search entry points.
  const destinationPages: Page[] = SCHENGEN_COUNTRIES.map((country) => ({
    path: `/destinations/${countrySlug(country)}`,
    changeFrequency: "monthly",
    priority: 0.85,
  }))
  const documentPages: Page[] = SCHENGEN_COUNTRIES.map((country) => ({
    path: `/documents/required-documents-to-apply-for-a-tourist-visa-in-${countrySlug(country)}`,
    changeFrequency: "monthly",
    priority: 0.85,
  }))

  const posts = await getAllPostsForBuild()
  const blogPages: Page[] = posts.map((post) => ({
    path: `/news/${post.slug}`,
    changeFrequency: "monthly",
    priority: 0.75,
    lastModified: new Date(post.publishedAt),
    arabic: post.slug in ARABIC_POSTS,
  }))

  return [...STATIC_PAGES, ...destinationPages, ...documentPages, ...blogPages].flatMap(entries)
}
