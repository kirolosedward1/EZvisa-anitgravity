import { Loader2 } from "lucide-react"
import { LangText } from "@/components/lang-text"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div role="status" className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" aria-hidden="true" />
        <p className="text-muted-foreground"><LangText en="Loading your application…" ar="جارٍ تحميل طلبك…" /></p>
      </div>
    </div>
  )
}
