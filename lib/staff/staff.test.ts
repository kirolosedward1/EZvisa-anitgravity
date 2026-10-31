import assert from "node:assert/strict"
import { test } from "node:test"
import { addBusinessDays, dubaiWeekStart, dueLabel, slaLabel } from "./sla.ts"
import { byUrgency, isOver, toStaffCase } from "./cases.ts"
import { can, canOpen, navFor } from "./roles.ts"
import { overviewFor, greeting } from "./overview.ts"
import { deviceLabel } from "./audit-format.ts"

const H = 3_600_000
const NOW = Date.parse("2026-10-30T10:00:00Z") // Friday 14:00 in Dubai

test("SLA labels read 'over' or 'left'", () => {
  assert.deepEqual(slaLabel(new Date(NOW - 28 * H).toISOString(), NOW), { text: "1d 4h over", over: true })
  assert.deepEqual(slaLabel(new Date(NOW + 2 * H).toISOString(), NOW), { text: "2h left", over: false })
  assert.deepEqual(slaLabel(new Date(NOW + 19 * H + 20 * 60_000).toISOString(), NOW), { text: "19h left", over: false })
  assert.equal(slaLabel(new Date(NOW - 5 * 60_000).toISOString(), NOW).text, "5m over")
})

test("business days skip the Dubai weekend", () => {
  // Thursday 10:00 Dubai + 2 business days = Monday 10:00 Dubai.
  assert.equal(addBusinessDays("2026-10-29T06:00:00Z", 2), "2026-11-02T06:00:00.000Z")
  // Saturday counts from Monday: Monday + 2 = Wednesday.
  assert.equal(addBusinessDays("2026-10-31T06:00:00Z", 2), "2026-11-04T06:00:00.000Z")
  // Monday + 2 = Wednesday.
  assert.equal(addBusinessDays("2026-11-02T06:00:00Z", 2), "2026-11-04T06:00:00.000Z")
})

test("due labels and the Dubai week", () => {
  assert.equal(dueLabel("2026-10-30T15:00:00Z", NOW), "Due today")
  assert.equal(dueLabel("2026-10-31T09:00:00Z", NOW), "Due tomorrow")
  assert.equal(dueLabel("2026-11-02T09:00:00Z", NOW), "Due Mon")
  assert.equal(dueLabel("2026-11-12T09:00:00Z", NOW), "Due 12 Nov")
  // Week starts Monday 26 Oct 00:00 Dubai = 25 Oct 20:00 UTC.
  assert.equal(new Date(dubaiWeekStart(NOW)).toISOString(), "2026-10-25T20:00:00.000Z")
})

const notes = (uploads: { type: string; at: string }[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ employmentStatus: "employed", uploads: uploads.map((u) => ({ ...u, name: "f.pdf", path: `x/${u.type}` })), ...extra })
const app = (over: Record<string, unknown> = {}) => ({
  id: "11111111-1111-1111-1111-111111111111",
  tracking_token: "ez-abcdef123",
  full_name: "Test Person",
  email: "t@example.com",
  phone: "",
  nationality: "Egypt",
  destination_country: "France",
  travel_purpose: "tourism",
  payment_status: "paid",
  application_status: "submitted",
  created_at: "2026-10-20T08:00:00Z",
  updated_at: "2026-10-28T08:00:00Z",
  ...over,
})

test("an unpaid application is a draft with no clock", () => {
  const c = toStaffCase(app({ payment_status: "pending", application_status: "draft" }))
  assert.equal(c.stage, "payment")
  assert.equal(c.side, "draft")
  assert.equal(c.dueAt, null)
  assert.equal(c.ref, "EZ-ABCDEF12")
  assert.equal(toStaffCase(app({ payment_status: "failed", application_status: "draft" })).paymentFailed, true)
})

test("an upload waiting for a check is ours, 24 hours from the oldest waiting upload", () => {
  const c = toStaffCase(
    app({ has_passport: true, has_photos: true, additional_notes: notes([{ type: "passportCopy", at: "2026-10-29T06:00:00Z" }, { type: "photo", at: "2026-10-29T08:00:00Z" }]) }),
  )
  assert.equal(c.stage, "documents")
  assert.equal(c.side, "us")
  assert.equal(c.task, "review")
  assert.equal(c.since, "2026-10-29T06:00:00Z")
  assert.equal(c.dueAt, "2026-10-30T06:00:00.000Z")
  assert.equal(isOver(c, NOW), true)
})

test("nothing uploaded, or a document sent back, waits on the customer", () => {
  const missing = toStaffCase(app())
  assert.equal(missing.side, "customer")
  assert.match(missing.what, /^Waiting for /)
  const flags = { has_passport: true, has_photos: true, has_bank_statements: true, has_employment_proof: true }
  const sentBack = toStaffCase(app({ ...flags, additional_notes: notes([{ type: "photo", at: "2026-10-20T06:00:00Z" }]) }), {
    passportCopy: { status: "approved", note: null, reviewedAt: "2026-10-21T06:00:00Z" },
    residencyCopy: { status: "approved", note: null, reviewedAt: "2026-10-21T06:00:00Z" },
    photo: { status: "rejected", note: "Blurry", reviewedAt: "2026-10-21T06:00:00Z" },
    bankStatement: { status: "approved", note: null, reviewedAt: "2026-10-21T06:00:00Z" },
    nocCertificate: { status: "approved", note: null, reviewedAt: "2026-10-21T06:00:00Z" },
  })
  assert.equal(sentBack.side, "customer")
  assert.equal(sentBack.what, "Personal photo sent back")
})

test("a row that shares a flag but has no upload of its own is still missing", () => {
  // has_passport covers both the passport and the residence visa; only the passport was uploaded and approved.
  const c = toStaffCase(
    app({ has_passport: true, additional_notes: notes([{ type: "passportCopy", at: "2026-10-27T06:00:00Z" }]) }),
    { passportCopy: { status: "approved", note: null, reviewedAt: "2026-10-28T06:00:00Z" } },
  )
  assert.equal(c.side, "customer")
  assert.equal(c.task, null)
  assert.match(c.what, /^Waiting for /)
})

test("preparation is due 2 business days after the last approval", () => {
  const c = toStaffCase(app({ application_status: "preparation" }), { photo: { status: "approved", note: null, reviewedAt: "2026-10-29T06:00:00Z" } })
  assert.equal(c.task, "files")
  assert.equal(c.dueAt, "2026-11-02T06:00:00.000Z")
})

test("ready cases: help requests are ours for 8 hours, otherwise the customer's turn", () => {
  const help = toStaffCase(app({ application_status: "ready", appointment_help_status: "requested", appointment_help_requested_at: "2026-10-30T01:00:00Z" }))
  assert.equal(help.task, "help")
  assert.equal(help.dueAt, "2026-10-30T09:00:00.000Z")
  assert.equal(toStaffCase(app({ application_status: "ready" })).side, "customer")
  assert.equal(toStaffCase(app({ application_status: "ready", appointment_at: "2026-11-05T06:00:00Z" })).side, "none")
})

test("closed cases and no outcome stage", () => {
  assert.equal(toStaffCase(app({ application_status: "completed" })).side, "closed")
  assert.equal(toStaffCase(app({ application_status: "cancelled" })).stage, "cancelled")
  // The legacy "rejected" status is shown as Closed; there is no refused/outcome stage.
  assert.equal(toStaffCase(app({ application_status: "rejected" })).stage, "closed")
  assert.equal(toStaffCase(app({ application_status: "appointment_booked" })).stage, "appointment")
})

test("queue order: past SLA first, then the nearest deadline", () => {
  const mk = (id: string, due: number) => ({ ...toStaffCase(app({ id })), side: "us" as const, dueAt: new Date(NOW + due * H).toISOString() })
  const sorted = [mk("a", 5), mk("b", -1), mk("c", 2), mk("d", -10)].sort(byUrgency(NOW)).map((c) => c.id)
  assert.deepEqual(sorted, ["d", "b", "c", "a"])
})

test("roles: matrix, sidebars per role", () => {
  assert.equal(can("admin", "team"), true)
  assert.equal(can("specialist", "docs"), true)
  assert.equal(can("support", "docs"), false)
  assert.equal(can("support", "msg"), true)
  assert.equal(can("finance", "refund"), true)
  assert.equal(can("finance", "msg"), false)
  const keys = (role: Parameters<typeof navFor>[0]) => navFor(role).flatMap((g) => g.items.map((i) => i.key))
  // Support desk board sidebar.
  assert.deepEqual(keys("support"), ["notifications", "overview", "cases", "appointments", "customers", "messaging", "analytics"])
  // Finance desk board sidebar.
  assert.deepEqual(keys("finance"), ["notifications", "overview", "cases", "customers", "payments", "insurance", "analytics", "reports", "audit"])
  assert.equal(keys("admin").length, 15)
  assert.equal(canOpen("specialist", "payments"), false)
})

test("overview numbers", () => {
  const cases = [
    { ...toStaffCase(app({ id: "1", has_passport: true, additional_notes: notes([{ type: "passportCopy", at: "2026-10-28T06:00:00Z" }]) }), {}, "s1"), createdAt: "2026-10-28T06:00:00Z" },
    toStaffCase(app({ id: "2", application_status: "preparation" }), {}, "s2"),
    toStaffCase(app({ id: "3", payment_status: "failed", application_status: "draft", created_at: "2026-10-01T06:00:00Z" })),
    toStaffCase(app({ id: "4", application_status: "ready", appointment_at: "2026-10-30T11:30:00Z", appointment_centre: "VFS Dubai" })),
    toStaffCase(app({ id: "5", application_status: "completed" })),
  ]
  const team = [{ id: "s1", name: "Ann Lee", role: "specialist" }, { id: "s2", name: "Bo Kim", role: "specialist" }]
  const o = overviewFor(cases, team, { now: NOW })
  assert.equal(o.kpi.needsUs, 2)
  assert.equal(o.kpi.overdue, 2)
  assert.equal(o.kpi.files, 1)
  assert.equal(o.kpi.apptsThisWeek, 1)
  assert.deepEqual(o.kpi.nextAppt, { at: "2026-10-30T11:30:00Z", centre: "VFS Dubai" })
  assert.equal(o.kpi.failedPayments, 1)
  assert.equal(o.counts.staleDrafts, 1)
  assert.equal(o.counts.unassigned, 1)
  assert.deepEqual(o.workload.map((w) => [w.name, w.open]), [["Ann Lee", 1], ["Bo Kim", 1]])
  assert.equal(o.byStage.find((s) => s.stage === "ready")?.n, 1)
  assert.equal(o.chart.length, 14)
  const mine = overviewFor(cases, team, { now: NOW, mine: "s1" })
  assert.equal(mine.kpi.needsUs, 1)
  assert.equal(mine.kpi.failedPayments, 1, "money figures stay team-wide")
  assert.equal(greeting(NOW), "Good afternoon")
})

test("device labels", () => {
  assert.equal(deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36"), "Chrome on macOS")
  assert.equal(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"), "Safari on iPhone")
  assert.equal(deviceLabel(null), "")
})

test("queue: tabs, filters, search and sort", async () => {
  const { applyQueue, parseFilters, tabCounts, matches, toCsv, travelLabel, agoLabel, slaCell } = await import("./queue.ts")
  const mk = (id: string, over: Record<string, unknown>, owner: string | null = null) => toStaffCase(app({ id, ...over }), {}, owner)
  const cases = [
    mk("a", { full_name: "Rania Khalil", phone: "+971 50 123 4567", has_passport: true, additional_notes: notes([{ type: "passportCopy", at: "2026-10-29T06:00:00Z" }]) }, "s1"),
    mk("b", { full_name: "Omar Said", destination_country: "Italy" }),
    mk("c", { full_name: "Hana Fathy", application_status: "completed" }),
    mk("d", { full_name: "Lina Draft", payment_status: "pending", application_status: "draft" }),
  ]
  const counts = tabCounts(cases, NOW)
  assert.equal(counts.all, 3)
  assert.equal(counts.us, 1)
  assert.equal(counts.customer, 1)
  assert.equal(counts.sla, 1)
  assert.equal(counts.unassigned, 1, "unpaid drafts are not 'unassigned'")
  assert.equal(counts.closed, 1)
  assert.deepEqual(applyQueue(cases, parseFilters({ country: "Italy" }), NOW).map((c) => c.id), ["b"])
  assert.deepEqual(applyQueue(cases, parseFilters({ owner: "none", tab: "all" }), NOW).map((c) => c.id).sort(), ["b", "d"])
  assert.equal(parseFilters({ tab: "nope", sort: "x" }).tab, "all")
  assert.equal(matches(cases[0], "050 123 4567".slice(1)), true, "phone digits match across formatting")
  assert.equal(matches(cases[0], "ez-abcdef"), true)
  assert.equal(matches(cases[0], "rania"), true)
  assert.equal(matches(cases[0], "nobody"), false)
  assert.equal(slaCell(cases[0], NOW).tone, "red")
  assert.equal(slaCell(cases[2], NOW).text, "Closed")
  assert.equal(travelLabel("2026-12-14", "2026-12-28"), "14 to 28 Dec")
  assert.equal(travelLabel("2026-12-28", "2027-01-04"), "28 Dec to 4 Jan")
  assert.equal(travelLabel(null, null), "Not set")
  assert.equal(agoLabel(new Date(NOW - 3 * 86_400_000).toISOString(), NOW), "3d ago")
  assert.equal(toCsv([["=SUM(A1)", 'a "b"', "x,y"]]), `'=SUM(A1),"a ""b""","x,y"\r\n`)
})

test("document queue: waiting uploads oldest first, re-uploads and SLA", async () => {
  const { docQueue, queueTag } = await import("./doc-queue.ts")
  const { checklistFor, QUICK_REASONS } = await import("./checklists.ts")
  const a = app({ id: "q1", has_passport: true, has_photos: true, additional_notes: notes([{ type: "passportCopy", at: "2026-10-30T08:00:00Z" }, { type: "photo", at: "2026-10-28T08:00:00Z" }]) })
  const reviews = { q1: { photo: { status: "rejected" as const, note: "Blurry", reviewedAt: "2026-10-27T08:00:00Z" } } }
  const c = toStaffCase(a, reviews.q1)
  const q = docQueue([c], [a], reviews, NOW)
  assert.deepEqual(q.map((x) => x.type), ["photo", "passportCopy"], "oldest first; the residence row shares the passport flag but has no upload")
  assert.equal(q[0].reupload, true)
  assert.equal(queueTag(q[0], NOW).text, "Over SLA")
  assert.equal(queueTag(q[1], NOW).text, "2h")
  assert.ok(checklistFor("bankStatement").length >= 4)
  assert.equal(QUICK_REASONS.length, 4)
})

test("file preparation: parts, text from templates, PDF assembly", async () => {
  const { partsFrom, htmlToText, assemblePdf, fileKind } = await import("./file-prep.ts")
  const parts = partsFrom([{ part: "cover_letter", state: "done", body: "Hi", file_name: null, file_path: null, updated_by: "Ann" }])
  assert.equal(parts.length, 6)
  assert.equal(parts.find((p) => p.key === "cover_letter")?.state, "done")
  assert.equal(parts.find((p) => p.key === "flight")?.state, "todo")
  assert.equal(htmlToText("<h1>Title</h1><p>One &amp; two</p><ul><li>A</li></ul>"), "Title\nOne & two\n• A")
  const { pages, skipped } = await assemblePdf([
    { kind: "text", title: "Cover letter", body: "Line one\n\n" + "word ".repeat(2000) + "\nمرحبا" },
    { kind: "pdf", title: "Broken", bytes: new Uint8Array([1, 2, 3]) },
  ])
  assert.ok(pages >= 2, "long text flows onto more pages; unsupported characters are replaced")
  assert.deepEqual(skipped, ["Broken"])
  assert.equal(fileKind("a.PDF"), "pdf")
  assert.equal(fileKind("a.heic"), null)
})

test("refund policy", async () => {
  const { refundPolicy } = await import("./refunds.ts")
  const c = (stage: string) => ({ stage: stage as never, amount: 249, docsToCheck: 0 })
  assert.deepEqual(refundPolicy(c("documents"), false), { key: "full", label: "Before review, full refund", amount: 249 })
  assert.equal(refundPolicy(c("review"), true).amount, 124.5)
  assert.equal(refundPolicy(c("preparation"), true).key, "half")
  assert.equal(refundPolicy(c("ready"), true).amount, 0)
  assert.equal(refundPolicy(c("ready"), true, "Duplicate payment").amount, 249, "duplicate charges are always full")
})

test("message templates fill variables and keep unknown ones", async () => {
  const { fillTemplate, waUrl, TEMPLATES } = await import("./templates.ts")
  assert.equal(fillTemplate("Hi {first_name}, {reference} {nope}", { first_name: "Ann", reference: "EZ-1" }), "Hi Ann, EZ-1 {nope}")
  assert.equal(waUrl("+971 50 123 4567", "a b"), "https://wa.me/971501234567?text=a%20b")
  assert.equal(waUrl("12"), null)
  for (const t of Object.values(TEMPLATES)) assert.ok(t.en && t.ar)
})

test("analytics: median, delta, sources and funnel", async () => {
  const { median, delta, sourceOf, marketing } = await import("./analytics.ts")
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([1, 2, 3, 4]), 2.5)
  assert.equal(median([]), null)
  assert.equal(delta(12, 10), 20)
  assert.equal(delta(5, 0), null)
  assert.equal(sourceOf("https://www.google.com/search?q=x"), "Google")
  assert.equal(sourceOf(null, "walk_in"), "Staff, walk in")
  assert.equal(sourceOf(null, null, "ios"), "Mobile app")
  assert.equal(sourceOf("not a url"), "Direct")
  const cs = [toStaffCase(app({ id: "m1", created_at: "2026-10-29T08:00:00Z", paid_at: "2026-10-29T09:00:00Z", payment_amount: 249 })), toStaffCase(app({ id: "m2", created_at: "2026-10-29T08:00:00Z", payment_status: "pending", application_status: "draft" }))]
  const m = marketing(cs, 7, NOW)
  assert.equal(m.cur.started, 2)
  assert.equal(m.cur.paid, 1)
  assert.equal(m.cur.revenue, 249)
  assert.equal(m.funnel[1].n, 1)
})
