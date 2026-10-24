import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { DisplayLocale } from "@/lib/currency"
import { localizePath } from "@/lib/route-path"

/** Locale of this request. /ar is a rewrite that sets `x-ez-locale`. */
export async function requestLocale(): Promise<DisplayLocale> {
  return (await headers()).get("x-ez-locale") === "ar" ? "ar" : "en"
}

/** Send the visitor to the same page in the locale they are already on. `redirect()` never returns, so checks after it stay narrowed. */
export function redirectLocalized(path: string, arabic: boolean): never {
  redirect(localizePath(path, arabic))
}
