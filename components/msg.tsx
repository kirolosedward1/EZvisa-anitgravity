import { message, type MessageKey } from "@/messages"

/** Both languages stay in the HTML. Direction decides which one is visible. */
export function Msg({
  id,
  values,
  valuesAr,
}: {
  id: MessageKey
  values?: Record<string, string | number>
  valuesAr?: Record<string, string | number>
}) {
  return (
    <>
      <span className="rtl:hidden">{message("en", id, values)}</span>
      <span className="hidden rtl:inline">{message("ar", id, valuesAr ?? values)}</span>
    </>
  )
}
