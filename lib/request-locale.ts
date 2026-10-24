import { headers } from "next/headers"
import type { DisplayLocale } from "@/lib/currency"

/** Locale of this request. /ar is a rewrite that sets `x-ez-locale`. */
export async function requestLocale(): Promise<DisplayLocale> {
  return (await headers()).get("x-ez-locale") === "ar" ? "ar" : "en"
}
