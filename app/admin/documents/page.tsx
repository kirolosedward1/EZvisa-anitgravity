// Document review board: the queue of uploads waiting for a decision (oldest first), the file, and the shared
// DocumentReview panel. "My cases" narrows to cases you own; ?case= opens one case's documents first.
import { ReviewDesk, type DeskItem } from "@/components/staff/review-desk"
import { PermissionDenied } from "@/components/staff/states"
import { serviceClient } from "@/lib/applications"
import { SCHENGEN_META } from "@/lib/countries"
import { DOC_BUCKET, parseNotes, type WizardAnswers } from "@/lib/shared/wizard-contract"
import { loadConsoleData } from "@/lib/staff/data"
import { docQueue, queueTag } from "@/lib/staff/doc-queue"
import { sectionAccess } from "@/lib/staff/guard"
import { can } from "@/lib/staff/roles"

export const dynamic = "force-dynamic"
const SIGNED = 40

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ scope?: string; case?: string }> }) {
  const { staff, allowed } = await sectionAccess("documents")
  if (!allowed) return <PermissionDenied what="Document review is not part of your role" role={staff.role} who="Documents are view only for your role; specialists and admins decide on them." />
  const sp = await searchParams
  const mine = sp.scope === "mine"
  const { cases, apps, reviews } = await loadConsoleData(staff)
  const now = Date.now()
  let queue = docQueue(cases, apps, reviews, now)
  if (mine) queue = queue.filter((q) => q.ownerId && q.ownerId === staff.staffId)
  if (sp.case) queue = [...queue.filter((q) => q.caseId === sp.case), ...queue.filter((q) => q.caseId !== sp.case)]

  // Sign the files of the first items (15 minutes); the rest are signed when the page is reloaded.
  const client = staff.demo ? null : serviceClient()
  const byId = new Map(apps.map((a) => [a.id ?? "", a]))
  const items: DeskItem[] = await Promise.all(
    queue.map(async (q, i) => {
      const app = byId.get(q.caseId)
      const notes = parseNotes(app?.additional_notes)
      const w = (notes.wizard ?? {}) as Partial<WizardAnswers>
      let url: string | null = null
      if (client && i < SIGNED) {
        const path = (notes.uploads ?? []).filter((u) => u.type === q.type && typeof u.path === "string").sort((a, b) => String(b.at).localeCompare(String(a.at)))[0]?.path
        if (path?.startsWith(`${q.caseId}/`)) url = (await client.storage.from(DOC_BUCKET).createSignedUrl(path, 15 * 60)).data?.signedUrl ?? null
      }
      return {
        key: q.key,
        caseId: q.caseId,
        type: q.type,
        title: q.title,
        name: q.name,
        ref: q.ref,
        country: q.country,
        iso: SCHENGEN_META[q.country]?.iso,
        at: q.at,
        fileName: q.fileName,
        tag: queueTag(q, now),
        url,
        compare: { name: q.name, passport: app?.passport_number ?? null, employer: w.companyName || null },
      }
    }),
  )

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1>Document review</h1>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {items.length} {items.length === 1 ? "document" : "documents"} waiting · oldest first · <kbd className="ezc-kbd">A</kbd> approve <kbd className="ezc-kbd">R</kbd> send back <kbd className="ezc-kbd">J</kbd>/<kbd className="ezc-kbd">K</kbd> next and previous
          </p>
        </div>
        <nav className="seg" aria-label="Scope">
          <a className="tab" href="/staff/documents?scope=mine" aria-current={mine ? "page" : undefined}>My cases</a>
          <a className="tab" href="/staff/documents" aria-current={!mine ? "page" : undefined}>Whole team</a>
        </nav>
      </div>
      <ReviewDesk items={items} canDecide={can(staff.role, "docs")} demo={staff.demo} />
    </>
  )
}
