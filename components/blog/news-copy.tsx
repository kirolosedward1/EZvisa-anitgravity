import { LangText } from "@/components/lang-text"
import { Msg } from "@/components/msg"
import { message, type MessageKey } from "@/messages"

const CATEGORY: Record<string, MessageKey> = {
  All: "news.cat.all",
  "Visa Guides": "news.cat.visaGuides",
  "Travel Tips": "news.cat.travelTips",
  "Country Guides": "news.cat.countryGuides",
  "Success Stories": "news.cat.success",
  Updates: "news.cat.updates",
  "Schengen Visa Guides": "news.cat.schengenGuides",
  "Visa Tips": "news.cat.visaTips",
  "Document Checklists": "news.cat.checklists",
  "Application Strategies": "news.cat.strategies",
}

const POST: Record<string, { title: MessageKey; excerpt: MessageKey }> = {
  "apply-schengen-visa-uae-2026": { title: "news.post.apply.title", excerpt: "news.post.apply.excerpt" },
  "schengen-visa-with-uae-golden-visa": { title: "news.post.golden.title", excerpt: "news.post.golden.excerpt" },
  "easiest-schengen-countries-uae": { title: "news.post.easiest.title", excerpt: "news.post.easiest.excerpt" },
  "perfect-noc-schengen-visa-uae": { title: "news.post.noc.title", excerpt: "news.post.noc.excerpt" },
  "family-schengen-visa-uae": { title: "news.post.family.title", excerpt: "news.post.family.excerpt" },
  "ultimate-schengen-visa-checklist-uae": { title: "news.post.checklist.title", excerpt: "news.post.checklist.excerpt" },
  "schengen-visa-rejection-reasons": { title: "news.post.rejection.title", excerpt: "news.post.rejection.excerpt" },
  "true-cost-schengen-visa-uae": { title: "news.post.cost.title", excerpt: "news.post.cost.excerpt" },
  "importance-cover-letter-itinerary": { title: "news.post.letter.title", excerpt: "news.post.letter.excerpt" },
  "multi-country-schengen-itinerary-rules": { title: "news.post.multi.title", excerpt: "news.post.multi.excerpt" },
}

const TAG: Record<string, MessageKey> = {
  "UAE residents": "news.tag.uaeResidents",
  "Schengen application": "news.tag.application",
  "visa guide": "news.tag.guide",
  Dubai: "news.tag.dubai",
  "golden visa": "news.tag.golden",
  "schengen requirements": "news.tag.requirements",
  "visa free": "news.tag.visaFree",
  "easiest schengen visa": "news.tag.easiest",
  "approval rates": "news.tag.approval",
  UAE: "news.tag.uae",
  "fast processing": "news.tag.fast",
  "schengen processing times": "news.tag.processing",
  NOC: "news.tag.noc",
  "required documents": "news.tag.requiredDocs",
  "employer letter": "news.tag.employer",
  "family visa": "news.tag.family",
  dependents: "news.tag.dependents",
  "nanny visa": "news.tag.nanny",
  "document checklist": "news.tag.checklist",
  "bank statements": "news.tag.bank",
  "UAE checklist": "news.tag.uaeChecklist",
  "visa rejection": "news.tag.rejection",
  "refusal reasons": "news.tag.refusal",
  tips: "news.tag.tips",
  "visa fees": "news.tag.fees",
  "hidden costs": "news.tag.hidden",
  budgeting: "news.tag.budget",
  "cover letter": "news.tag.cover",
  "travel itinerary": "news.tag.itinerary",
  "expert advice": "news.tag.advice",
  "visa secrets": "news.tag.secrets",
  "itinerary planning": "news.tag.planning",
  "multiple countries": "news.tag.multi",
  "first entry rule": "news.tag.firstEntry",
  "main destination": "news.tag.mainDest",
}

export function NewsCategory({ category }: { category: string }) {
  const id = CATEGORY[category]
  return id ? <Msg id={id} /> : category
}

export function NewsTitle({ slug, fallback }: { slug: string; fallback: string }) {
  const id = POST[slug]?.title
  return id ? <Msg id={id} /> : fallback
}

export function NewsExcerpt({ slug, fallback }: { slug: string; fallback: string }) {
  const id = POST[slug]?.excerpt
  return id ? <Msg id={id} /> : fallback
}

export function newsTitleText(locale: "en" | "ar", slug: string, fallback: string) {
  const id = POST[slug]?.title
  return locale === "ar" && id ? message("ar", id) : fallback
}

export function newsExcerptText(locale: "en" | "ar", slug: string, fallback: string) {
  const id = POST[slug]?.excerpt
  return locale === "ar" && id ? message("ar", id) : fallback
}

export function NewsTag({ tag }: { tag: string }) {
  const id = TAG[tag]
  return id ? <Msg id={id} /> : tag
}

export function NewsDate({ iso }: { iso: string }) {
  const date = new Date(iso)
  const base = { day: "numeric" as const, year: "numeric" as const, timeZone: "UTC", numberingSystem: "latn" as const }
  const en = new Intl.DateTimeFormat("en-GB", { ...base, month: "short" }).format(date)
  const ar = new Intl.DateTimeFormat("ar-EG", { ...base, month: "long" }).format(date)
  return <LangText en={en} ar={ar} />
}

export function NewsReadTime({ value }: { value: string }) {
  const n = value.match(/\d+/)?.[0] ?? value
  return <Msg id="news.readTime" values={{ n }} />
}
