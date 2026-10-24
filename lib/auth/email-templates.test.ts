import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { ARABIC_ACCOUNT_LANDING, confirmDestination, confirmNextFromQuery } from "./confirm-next.ts"

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), "../../supabase/templates")

const TEMPLATES = [
  ["magiclink.html", "magiclink"],
  ["signup.html", "signup"],
  ["recovery.html", "recovery"],
  ["email_change.html", "email_change"],
  ["invite.html", "invite"],
] as const

/** Same fields Supabase passes. Values are inserted raw, which is the unencoded `{{ .RedirectTo }}` case. */
const SAMPLE = {
  Token: "12345678",
  TokenHash: "hash_sample",
  RedirectTo: "https://www.ezvisa.net/ar/dashboard",
}

function render(html: string, values: Record<string, string>): string {
  return html.replace(/\{\{\s*\.(\w+)\s*\}\}/g, (_, key: string) => values[key] ?? "")
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/\shref="([^"]*)"/g)].map((match) => match[1])
}

test("each template's confirmation hrefs point at /auth/confirm with that template's type", () => {
  const subjects = JSON.parse(readFileSync(join(templatesDir, "subjects.json"), "utf8")) as Record<
    string,
    { subject?: string }
  >
  const staticHrefs = new Set(["https://wa.me/971547109533", "https://www.ezvisa.net"])

  for (const [file, type] of TEMPLATES) {
    const html = readFileSync(join(templatesDir, file), "utf8")
    assert.equal(typeof subjects[file.replace(".html", "")]?.subject, "string", file)
    const rendered = render(html, SAMPLE)
    const links = hrefs(rendered)
    const confirmLinks = links.filter((href) => href.includes("/auth/confirm"))
    assert.equal(confirmLinks.length, 2, file)
    for (const href of links) {
      if (staticHrefs.has(href)) continue
      const url = new URL(href)
      assert.equal(`${url.origin}${url.pathname}`, "https://www.ezvisa.net/auth/confirm", href)
      assert.equal(url.searchParams.get("type"), type, href)
      assert.equal(url.searchParams.get("token_hash"), SAMPLE.TokenHash, href)
      assert.equal(url.searchParams.get("next"), SAMPLE.RedirectTo, href)
      assert.equal(url.searchParams.getAll("next").length, 1, href)
    }
    if (html.includes("{{ .Token }}")) assert.equal(rendered.includes(SAMPLE.Token), true, file)
    assert.equal(rendered.includes("supabase.co"), false, file)
  }
})

test("a rendered unencoded RedirectTo that contains & falls back instead of following the split", () => {
  const redirectTo = "https://www.ezvisa.net/ar/dashboard?a=1&b=2"
  for (const [file, type] of TEMPLATES) {
    const html = readFileSync(join(templatesDir, file), "utf8")
    const rendered = render(html, { ...SAMPLE, RedirectTo: redirectTo })
    const confirmLinks = hrefs(rendered).filter((href) => href.includes("/auth/confirm"))
    assert.equal(confirmLinks.length, 2, file)
    for (const href of confirmLinks) {
      const read = confirmNextFromQuery(new URL(href).searchParams)
      assert.equal(read.rawNext, null, href)
      assert.equal(read.splitArabic, true, href)
      const landing = type === "recovery" ? "/ar/reset-password" : ARABIC_ACCOUNT_LANDING
      assert.equal(confirmDestination(type, read.rawNext, read.splitArabic), landing, href)
    }
  }
})
