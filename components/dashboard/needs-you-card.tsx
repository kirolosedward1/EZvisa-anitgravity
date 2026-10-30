import { CircleAlert } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { Button } from "@/components/ui/button"
import { DashPill } from "@/components/dashboard/dash-pill"
import { DOC_TITLE_KEY, customerTodos, type CustomerTodo } from "@/lib/dashboard-state"
import { REQUIREMENTS } from "@/lib/shared/wizard-contract"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import type { DocumentReviews } from "@/lib/document-reviews"
import type { VisaApplication } from "@/lib/types/visa-application"

/**
 * "What we need from you": every item on the case that waits on the customer, numbered, each with its own button.
 * Shown only with two or more items; a single item is already the case card's next step.
 */
export function NeedsYouCard({ app, reviews, arabic }: { app: VisaApplication; reviews?: DocumentReviews; arabic: boolean }) {
  const locale = arabic ? "ar" : "en"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const todos = customerTodos(app, reviews)
  if (todos.length < 2 || !app.id) return null

  const docName = (type: string, lower = false) => {
    if (arabic && DOC_TITLE_KEY[type]) return t(DOC_TITLE_KEY[type])
    const title = REQUIREMENTS.find((r) => r.document_type === type)?.title ?? type
    return lower ? title.toLocaleLowerCase("en") : title
  }
  const uploadHref = (type?: string) =>
    app.tracking_token ? `/track/${app.tracking_token}/upload${type ? `?type=${type}` : ""}` : `/dashboard/upload?id=${app.id}`

  const item = (todo: CustomerTodo): { title: string; hint: string; hintAuto?: boolean; href: string; action: string } => {
    switch (todo.kind) {
      case "redo":
        return { title: t("need.redo", { doc: docName(todo.doc, true) }), hint: todo.note || t("need.redoHint"), hintAuto: !!todo.note, href: uploadHref(todo.doc), action: t("need.redoBtn") }
      case "upload":
        return {
          title: todo.docs.length === 1 ? t("need.upload1", { doc: docName(todo.docs[0], true) }) : t("need.uploadN", { n: todo.docs.length }),
          hint: todo.docs.map((d) => docName(d)).join(arabic ? "، " : ", "),
          href: uploadHref(todo.docs[0]),
          action: t("status.upload"),
        }
      case "details":
        return { title: t("need.details"), hint: t("need.detailsHint"), href: `/continue/${app.id}`, action: t("need.detailsBtn") }
      case "appointment":
        return { title: t("need.appt"), hint: t("need.apptHint"), href: `/appointment/${app.id}`, action: t("need.apptBtn") }
    }
  }

  return (
    <section aria-labelledby="needs-you-title" className="ez-dash-card overflow-hidden border-[#f3dcae]">
      <div className="flex items-center justify-between gap-3 bg-[#fffaf0] px-4 py-3.5 sm:px-5">
        <h2 id="needs-you-title" className="ez-dash-panel flex items-center gap-2 text-[15px] text-foreground">
          <CircleAlert className="size-[18px] text-[#d98a00]" aria-hidden="true" />
          {t("need.title")}
        </h2>
        <DashPill tone="warning" dot={false}>{t("need.count", { n: todos.length })}</DashPill>
      </div>
      <ol>
        {todos.map((todo, index) => {
          const row = item(todo)
          return (
            <li key={`${todo.kind}-${index}`} className="flex flex-wrap items-center gap-3 border-t border-[#eef1f6] px-4 py-3 sm:flex-nowrap sm:px-5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#d98a00] text-xs font-semibold text-[#7a4b00]" aria-hidden="true">
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="text-sm font-medium text-foreground">{row.title}</span>
                <span className="text-xs text-muted-foreground" dir={row.hintAuto ? "auto" : undefined}>{row.hint}</span>
              </span>
              <Button asChild variant={index === 0 ? "default" : "outline"} className="h-9 w-full px-3.5 text-sm sm:w-auto">
                <LocaleLink href={row.href}>{row.action}</LocaleLink>
              </Button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
