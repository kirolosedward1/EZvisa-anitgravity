// Document viewer board: one document full size with zoom, rotate and highlight boxes, and the shared DocumentReview
// panel. The key is "<case id>~<document type>".
import { notFound } from "next/navigation"
import { DocViewer } from "@/components/staff/doc-viewer"
import { PermissionDenied } from "@/components/staff/states"
import { loadCaseDetail } from "@/lib/staff/case-detail"
import { sectionAccess } from "@/lib/staff/guard"
import { can } from "@/lib/staff/roles"

export const dynamic = "force-dynamic"

export default async function ViewerPage({ params }: { params: Promise<{ key: string }> }) {
  const { staff, allowed } = await sectionAccess("documents")
  if (!allowed) return <PermissionDenied what="Document review is not part of your role" role={staff.role} who="Specialists and admins decide on documents." />
  const { key } = await params
  const [caseId, type] = decodeURIComponent(key).split("~")
  if (!caseId || !type) notFound()
  const detail = await loadCaseDetail(staff, caseId)
  const doc = detail?.docs.find((d) => d.type === type)
  if (!detail || !doc) notFound()
  const latest = doc.files[0]
  const docs = detail.docs.filter((d) => d.state !== "missing")
  return (
    <DocViewer
      caseId={caseId}
      doc={doc}
      file={{ url: latest?.url ?? null, name: latest?.name ?? null }}
      customerFirst={detail.c.name.split(/\s+/)[0]}
      reviewer={staff.name.split(/\s+/)[0]}
      caseRef={detail.c.ref}
      siblings={docs.map((d) => ({ key: `${caseId}~${d.type}`, title: d.title, current: d.type === type }))}
      canDecide={can(staff.role, "docs")}
      demo={staff.demo}
    />
  )
}
