/**
 * Grep rendered /ar HTML for leftover English sentences, Arabic-Indic digits, and "AED".
 *
 *   BASE_URL=http://127.0.0.1:3000 node scripts/check-ar-copy.mts
 *
 * Hidden English (lang="en" or class rtl:hidden) and script/style blocks are ignored.
 * Brand names in the allowlist do not count as an English sentence.
 */
import { readFileSync } from "node:fs"

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "")

const ALLOW = new Set(
  [
    "ezvisa", "whatsapp", "vfs", "global", "tlscontact", "tls", "bls", "international", "ziina",
    "iphone", "android", "pdf", "noc", "youtube", "tiktok", "crisp", "google", "play", "apple",
    "ios", "gdpr", "pdpl", "eur", "chf", "gmt", "uae", "qr", "hsbc", "vis", "faq", "face", "id",
    "app", "store", "net", "id",
  ].map((w) => w.toLowerCase()),
)

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"])

function destinationSlugs() {
  const src = readFileSync(new URL("../lib/destinations.ts", import.meta.url), "utf8")
  return [...src.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1])
}

function newsSlugs() {
  const src = readFileSync(new URL("../components/blog/news-copy.tsx", import.meta.url), "utf8")
  return [...src.matchAll(/"([a-z0-9-]+)": \{ title: "news\.post\./g)].map((m) => m[1])
}

function routes() {
  const slugs = destinationSlugs()
  const docs = slugs.map((slug) => `/ar/documents/required-documents-to-apply-for-a-tourist-visa-in-${slug}`)
  const dest = slugs.map((slug) => `/ar/destinations/${slug}`)
  const news = newsSlugs().map((slug) => `/ar/news/${slug}`)
  return [
    "/ar",
    "/ar/pricing",
    "/ar/contact",
    "/ar/app",
    "/ar/about",
    "/ar/tools",
    "/ar/tools/schengen-calculator",
    "/ar/tools/bank-balance-calculator",
    "/ar/tools/appointment-guide",
    "/ar/videos",
    "/ar/documents",
    "/ar/destinations",
    "/ar/how-it-works",
    "/ar/news",
    "/ar/cookie-policy",
    "/ar/privacy-policy",
    "/ar/refund-policy",
    "/ar/terms-of-service",
    "/ar/disclaimer",
    "/ar/login",
    ...docs,
    ...dest,
    ...news,
  ]
}

function decode(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function hiddenTag(name: string, attrs: string) {
  if (name === "script" || name === "style" || name === "noscript") return true
  if (/\blang\s*=\s*["']en["']/i.test(attrs)) return true
  if (/rtl:hidden/.test(attrs)) return true
  return false
}

function collect(html: string) {
  const out: string[] = []
  const skip: string[] = []
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9:-]+)\s*>|<([a-zA-Z0-9:-]+)([^>]*?)(\/?)>|([^<]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    if (m[0].startsWith("<!--")) continue
    if (m[1]) {
      const name = m[1].toLowerCase()
      const idx = skip.lastIndexOf(name)
      if (idx >= 0) skip.splice(idx)
      continue
    }
    if (m[2]) {
      const name = m[2].toLowerCase()
      const attrs = m[3] ?? ""
      const self = m[4] === "/" || VOID.has(name)
      if (skip.length === 0) {
        const take = (attr: string) => {
          const found = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']*)["']`, "i").exec(attrs)
          if (found) out.push(decode(found[1]))
        }
        if (name === "meta") {
          const key = /\b(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]?.toLowerCase() ?? ""
          if (["description", "og:title", "og:description", "twitter:title", "twitter:description", "og:image:alt"].includes(key)) {
            take("content")
          }
        } else {
          take("alt")
          take("aria-label")
          take("placeholder")
          if (name !== "link") take("title")
        }
      }
      if (!self && hiddenTag(name, attrs)) skip.push(name)
      continue
    }
    if (m[5] && skip.length === 0) {
      const text = decode(m[5]).replace(/\s+/g, " ").trim()
      if (text) out.push(text)
    }
  }
  return out
}

function latinSentences(text: string) {
  const cleaned = text.replace(/https?:\/\/\S+/g, " ").replace(/[\w.+-]+@[\w.-]+\b/g, " ")
  const words = cleaned.match(/[A-Za-z][A-Za-z'’-]+/g) ?? []
  const hits: string[] = []
  let run: string[] = []
  const flush = () => {
    if (run.length >= 4) hits.push(run.join(" "))
    run = []
  }
  for (const word of words) {
    if (ALLOW.has(word.toLowerCase())) flush()
    else run.push(word)
  }
  flush()
  return hits
}

const findings: string[] = []

for (const path of routes()) {
  const url = `${BASE}${path}`
  let res: Response
  try {
    res = await fetch(url, { redirect: "follow" })
  } catch (error) {
    findings.push(`${path}  fetch failed: ${error instanceof Error ? error.message : String(error)}`)
    continue
  }
  if (!res.ok) {
    findings.push(`${path}  HTTP ${res.status}`)
    continue
  }
  const html = await res.text()
  const chunks = collect(html)
  for (const chunk of chunks) {
    if (/[٠-٩۰-۹]/.test(chunk)) findings.push(`${path}  Arabic-Indic digits: ${chunk.slice(0, 180)}`)
    if (/\bAED\b/.test(chunk)) findings.push(`${path}  AED: ${chunk.slice(0, 180)}`)
    if (/\d+\s*درهمًا/.test(chunk)) findings.push(`${path}  tanween price: ${chunk.slice(0, 180)}`)
    for (const sentence of latinSentences(chunk)) {
      findings.push(`${path}  Latin: ${sentence}`)
    }
  }
}

if (findings.length) {
  console.error(`check:ar found ${findings.length} issue(s)\n`)
  console.error(findings.join("\n"))
  process.exit(1)
}

console.log(`check:ar ok (${routes().length} pages)`)
