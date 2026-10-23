#!/usr/bin/env node
// Website ↔ app drift check. Compares the website's contract (lib/shared/wizard-contract.ts) with the EZvisa app's
// copy of the same rules (mobile/lib/wizard.ts, data.ts, payments.ts, config.ts, app.json, app/app-return/page.tsx).
//
//   pnpm sync:check                         # app files from ./mobile, or from the mobile-app branch when absent
//   pnpm sync:check -- --mobile ../path     # app files from another checkout
//   pnpm sync:check -- --ref origin/mobile-app --contract-ref origin/main
//
// Exit code 1 on any drift. Runs on plain Node 22+ (type stripping), no build step, no network.
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL, fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
const opt = (name: string, def?: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def }
const ref = opt("--ref", "origin/mobile-app")!
const contractRef = opt("--contract-ref")
let mobileDir = opt("--mobile")

const git = (...a: string[]) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" })
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ezvisa-sync-"))
const fromGit = (r: string, file: string) => {
  const out = path.join(tmp, r.replace(/[^a-z0-9]/gi, "_"), file)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, git("show", `${r}:${file}`))
  return out
}
const APP_FILES = ["lib/wizard.ts", "lib/data.ts", "lib/payments.ts", "lib/config.ts", "lib/authErrors.ts", "app.json", "app/apply/index.tsx", "app/continue/[id].tsx"]
if (!mobileDir && fs.existsSync(path.join(ROOT, "mobile/lib/wizard.ts"))) mobileDir = path.join(ROOT, "mobile")
if (!mobileDir) {
  console.log(`app files: ${ref} (git)`)
  for (const f of APP_FILES) { try { fromGit(ref, `mobile/${f}`) } catch { /* optional file */ } }
  mobileDir = path.join(tmp, ref.replace(/[^a-z0-9]/gi, "_"), "mobile")
} else console.log(`app files: ${mobileDir}`)
const contractPath = contractRef ? fromGit(contractRef, "lib/shared/wizard-contract.ts") : path.join(ROOT, "lib/shared/wizard-contract.ts")
console.log(`contract:  ${contractRef ? `${contractRef}:lib/shared/wizard-contract.ts` : "lib/shared/wizard-contract.ts"}\n`)

const web: any = await import(pathToFileURL(contractPath).href)
const app: any = await import(pathToFileURL(path.join(mobileDir, "lib/wizard.ts")).href)
const read = (f: string) => { const p = path.join(mobileDir!, f); return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null }
const webFile = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8")

let failures = 0
const results: { ok: boolean; name: string; detail?: string }[] = []
const check = (name: string, ok: boolean, detail?: string) => { results.push({ ok, name, detail }); if (!ok) failures++ }
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const diff = (a: unknown, b: unknown) => `website=${JSON.stringify(a)}\n      app=${JSON.stringify(b)}`
const eq = (name: string, a: unknown, b: unknown) => check(name, same(a, b), same(a, b) ? undefined : diff(a, b))
// Calls a rule on both sides; a rule one side no longer exports is reported as drift, not a crash.
const both = (name: string, fn: string, ...args: unknown[]) => {
  const w = typeof web[fn] === "function", a = typeof app[fn] === "function"
  if (!w || !a) return check(name, false, `${fn}() is missing on ${!w && !a ? "both sides" : !w ? "the website (lib/shared/wizard-contract.ts)" : "the app (mobile/lib/wizard.ts)"}`)
  let wv: unknown, av: unknown
  try { wv = web[fn](...args) } catch (e) { wv = `throws: ${(e as Error).message}` }
  try { av = app[fn](...args) } catch (e) { av = `throws: ${(e as Error).message}` }
  eq(name, wv, av)
}

// 1. Lists and option values (value + label must match: the value is what is stored, the label what both show).
for (const k of ["SCHENGEN", "SCHENGEN_VISA_REQUIRED", "UAE_NATIONALITIES", "OTHER_NATIONALITY", "RESIDENCE_COUNTRIES", "DEFAULT_RESIDENCE", "UAE_EMIRATES", "MARITAL", "EMPLOYMENT", "SALARY", "PURPOSES", "COMPANIONS", "FUNDING", "BALANCE", "HOTELS", "STEP_TITLES"])
  eq(`${k}`, web[k], app[k])

// 2. Answer keys and defaults.
eq("answer keys (emptyAnswers vs emptyForm)", Object.keys(web.emptyAnswers).sort(), Object.keys(app.emptyForm).sort())
eq("answer defaults", web.emptyAnswers, app.emptyForm)

// 3. Step order and legacy slugs.
const married = { ...web.emptyAnswers, maritalStatus: "married", spouseAccompanying: "yes" }
both("visibleSteps (single)", "visibleSteps", web.emptyAnswers)
both("visibleSteps (spouse travels)", "visibleSteps", married)
for (const s of ["personal", "spouse", "employment", "trip-details", "payment", "documents", "nonsense", undefined])
  both(`parseStep(${JSON.stringify(s)})`, "parseStep", s)

// 4. Validation: same error keys and messages on the same fixtures.
const future = (months: number) => { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10) }
const valid = {
  ...web.emptyAnswers, destination: "France", nationality: "India", cityOfResidence: "Dubai", hasEmiratesId: "yes", firstName: "A", lastName: "B",
  email: "ab@example.com", phone: "+971501234567", dateOfBirth: "1990-01-01", hasValidPassport: "yes", passportExpiry: future(24), maritalStatus: "single",
  purposeOfTrip: "tourism", travelStartDate: future(2), travelEndDate: future(2).replace(/\d{2}$/, "20"), datesFlexible: "yes", travelingWith: "alone",
  hotelCategory: "3-star", fundingSource: "self", balanceRange: "under-10000", isFirstSchengenVisa: "yes", previousRefusals: "no",
}
const fixtures: Record<string, any> = {
  empty: web.emptyAnswers,
  valid,
  "visa-exempt nationality": { ...valid, nationality: "United Arab Emirates" },
  "bad email + phone": { ...valid, email: "a@gmial.com", phone: "12345678" },
  "no valid passport": { ...valid, hasValidPassport: "no" },
  "short passport": { ...valid, passportExpiry: future(1) },
  "married, no answer": { ...valid, maritalStatus: "married" },
  "spouse travels, empty": { ...married, ...valid, maritalStatus: "married", spouseAccompanying: "yes" },
  "trip too long": { ...valid, travelEndDate: future(6) },
  "trip too soon": { ...valid, travelStartDate: new Date().toISOString().slice(0, 10) },
  "refusal without details": { ...valid, previousRefusals: "yes" },
  "employed, incomplete": { ...valid, employmentStatus: "employed", jobTitle: "x" },
  "freelancer, incomplete": { ...valid, employmentStatus: "freelancer" },
  "student": { ...valid, employmentStatus: "student" },
}
for (const [name, f] of Object.entries(fixtures)) {
  for (const step of ["personal", "spouse", "employment", "trip-details"])
    both(`validateStep(${step}) on "${name}"`, "validateStep", step, f)
  both(`validatePassportNumber on "${name}"`, "validatePassportNumber", f)
  both(`continueComplete on "${name}"`, "continueComplete", f)
  both(`firstIncomplete on "${name}"`, "firstIncomplete", f)
}
both("passportCoversTrip (2 months)", "passportCoversTrip", { passportExpiry: future(2), travelEndDate: future(1) })
both("passportCoversTrip (5 months)", "passportCoversTrip", { passportExpiry: future(5), travelEndDate: future(1) })
both("coerceResidence", "coerceResidence", { countryOfResidence: "Qatar", cityOfResidence: "dubai", hasEmiratesId: "yes" })

// 5. Data layer: document types, statuses, bucket (regex on mobile/lib/data.ts; it imports native modules).
const data = read("lib/data.ts")
if (data) {
  const block = (name: string) => data.match(new RegExp(`(?:export )?const ${name}[^=]*=\\s*([\\s\\S]*?);\\n`))?.[1] ?? ""
  const flags = Object.fromEntries([...block("DOC_FLAG").matchAll(/(\w+):\s*"(has_\w+)"/g)].map((m) => [m[1], m[2]]))
  eq("DOC_FLAG", web.DOC_FLAG, flags)
  const types = [...block("DOC_TYPES").matchAll(/value:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)].map((m) => ({ value: m[1], label: m[2] }))
  eq("DOC_TYPES", web.DOC_TYPES, types)
  eq("UPLOAD_STATUSES", web.UPLOAD_STATUSES, JSON.parse(block("UPLOAD_STATUSES") || "[]"))
  eq("DOC_BUCKET", web.DOC_BUCKET, block("DOC_BUCKET").replace(/"/g, ""))
  const labels = Object.fromEntries([...block("STATUS_LABEL").matchAll(/(\w+):\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]))
  eq("STATUS_LABEL", web.STATUS_LABEL, labels)
  const reqs = [...block("REQS").matchAll(/document_type:\s*"([^"]+)",\s*title:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]])
  eq("REQUIREMENTS (type + title)", web.REQUIREMENTS.map((r: any) => [r.document_type, r.title]), reqs)
  eq("referenceOf", web.referenceOf("11111111-2222-4333-8444-555555555555"), (() => { const m = data.match(/export const referenceOf = \(id: string\) => `EZ-\$\{id\.replace\(\/-\/g, ""\)\.slice\(0, 8\)\.toUpperCase\(\)\}`/); return m ? "EZ-11111111" : "<different formula>" })())
  check("needsContinue statuses", /\["submitted", "draft", "reviewing"\]/.test(data) && same(web.CONTINUE_STATUSES, ["submitted", "draft", "reviewing"]), "mobile/lib/data.ts needsContinue() statuses differ from CONTINUE_STATUSES")
  check("isPaid rule", /payment_status === "paid" \|\| a\.payment_status === "completed"/.test(data), "mobile/lib/data.ts isPaid() differs")
} else check("mobile/lib/data.ts present", false)

// 6. Payments, config, deep links.
const payments = read("lib/payments.ts")
if (payments) {
  const open = JSON.parse(payments.match(/export const OPEN_INTENT = (\[[^\]]*\])/)?.[1] ?? "[]")
  const webOpen = JSON.parse(webFile("lib/ziina.ts").match(/export const OPEN_INTENT_STATUSES = (\[[^\]]*\])/)?.[1] ?? "[]")
  eq("open Ziina intent statuses (lib/ziina.ts vs app payments.ts)", webOpen, open)
  check("app sends no amount to create-payment", /body: JSON\.stringify\(\{ applicationId: appId, success_url: [^}]*cancel_url: [^}]*\}\)/.test(payments), "the app must let the server price the application")
  check("app returns via /app-return", /new URL\("\/app-return"/.test(payments))
}
const config = read("lib/config.ts")
if (config) {
  eq("official site URL", web.SITE_URL_OFFICIAL, config.match(/const OFFICIAL = "([^"]+)"/)?.[1])
  eq("WhatsApp number", web.WHATSAPP_NUMBER, config.match(/export const WHATSAPP = "([^"]+)"/)?.[1])
  eq("support email", web.SUPPORT_EMAIL, config.match(/export const EMAIL = "([^"]+)"/)?.[1])
}
const appJson = read("app.json")
if (appJson) check("app scheme is allowed by /app-return", web.APP_SCHEMES.includes(JSON.parse(appJson).expo.scheme), `scheme ${JSON.parse(appJson).expo.scheme} not in APP_SCHEMES`)
const appReturn = webFile("app/app-return/page.tsx")
check("/app-return accepts exactly APP_SCHEMES", same(appReturn.match(/\^\(([a-z|]+)\):/)?.[1].split("|"), [...web.APP_SCHEMES]), "APP_SCHEMES vs app/app-return/page.tsx regex")

// 7. Website server routes must use the contract's document types and price.
const upload = webFile("app/api/upload-document/route.ts")
check("upload-document uses the contract's DOC_FLAG / bucket / size", /DOC_FLAG,|DOC_FLAG\b/.test(upload) && /DOC_BUCKET/.test(upload) && /MAX_UPLOAD_BYTES/.test(upload) && !/const DOC_FLAGS/.test(upload), "import DOC_FLAG, DOC_BUCKET, MAX_UPLOAD_BYTES from lib/shared/wizard-contract.ts")
check("price constant (lib/currency basePrice = PRICE_AED)", /basePrice: PRICE_AED/.test(webFile("lib/currency.ts")))
eq("price rule (249 / 498)", [web.priceAed("no"), web.priceAed("yes")], [web.PRICE_AED, web.PRICE_AED * web.SPOUSE_MULTIPLIER])
check("payment-step takes the price from the contract", /priceAed\(/.test(webFile("components/apply/payment-step.tsx")))

// 8. The website must not keep its own copies of the lists.
for (const f of ["components/apply/nationality-step.tsx", "components/apply/trip-details-step.tsx", "components/hero-section.tsx", "components/site-header.tsx", "components/start-application-box.tsx", "components/how-it-works-content.tsx", "components/document-requirements-page.tsx"]) {
  const src = webFile(f)
  check(`${f} has no private nationality/destination list`, !/const (nationalityCountries|fromCountries|nationalities|schengenCountries|residenceCountries)\s*=\s*\[/.test(src), "import the list from lib/shared/wizard-contract.ts instead")
}

// 9. Auth: the short messages and the Supabase error-code table are the same on both platforms
//    (lib/auth/errors.ts vs mobile/lib/authErrors.ts), so a customer reads the same words in the app and on the site.
const authErrors = read("lib/authErrors.ts")
if (authErrors) {
  const block = (src: string, name: string) => Object.fromEntries([...(src.match(new RegExp(`${name}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "").matchAll(/"?([\w-]+)"?:\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]))
  const webAuth = webFile("lib/auth/errors.ts")
  eq("auth messages (AUTH_MESSAGE)", block(webAuth, "AUTH_MESSAGE"), block(authErrors, "AUTH_MESSAGE"))
  eq("auth error-code table (CODE)", block(webAuth, "const CODE"), block(authErrors, "const CODE"))
  eq("auth password minimum", webAuth.match(/MIN_PASSWORD = (\d+)/)?.[1], authErrors.match(/MIN_PASSWORD = (\d+)/)?.[1])
} else check("mobile/lib/authErrors.ts present", false)

// Report
for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name}${r.detail && !r.ok ? `\n      ${r.detail}` : ""}`)
console.log(`\n${results.length - failures}/${results.length} checks passed · contract ${web.CONTRACT_VERSION}`)
fs.rmSync(tmp, { recursive: true, force: true })
process.exit(failures ? 1 : 0)
