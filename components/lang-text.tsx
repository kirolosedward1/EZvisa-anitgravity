import type { ReactNode } from "react"

/** Both languages stay in the HTML. The route script sets dir=rtl on /ar before paint. */
export function LangText({ en, ar }: { en: ReactNode; ar: ReactNode }) {
  return (
    <>
      <span className="rtl:hidden">{en}</span>
      <span className="hidden rtl:inline">{ar}</span>
    </>
  )
}
