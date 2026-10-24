import type { Metadata } from "next"
import { requestLocale } from "@/lib/request-locale"

type ArabicMeta = {
  title: string
  description?: string
  /** Absolute path on the Arabic site, starting with /ar. */
  path: string
}

/**
 * English metadata is returned unchanged. /ar replaces the title, description,
 * canonical URL and Open Graph locale.
 */
export async function withArabicMeta(en: Metadata, ar: ArabicMeta): Promise<Metadata> {
  if ((await requestLocale()) !== "ar") return en
  const url = `https://www.ezvisa.net${ar.path}`
  const description = ar.description ?? (typeof en.description === "string" ? en.description : undefined)
  const openGraph = typeof en.openGraph === "object" && en.openGraph ? en.openGraph : {}
  const twitter = typeof en.twitter === "object" && en.twitter ? en.twitter : undefined
  const alternates = typeof en.alternates === "object" && en.alternates ? en.alternates : {}
  return {
    ...en,
    title: ar.title,
    description,
    alternates: { ...alternates, canonical: url },
    openGraph: { ...openGraph, title: ar.title, description, url, locale: "ar" },
    ...(twitter ? { twitter: { ...twitter, title: ar.title, description } } : {}),
  }
}
