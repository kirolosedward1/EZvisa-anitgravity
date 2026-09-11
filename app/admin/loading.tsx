import { Loader2 } from "lucide-react"

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-slate-600 font-medium">Loading Operations Console...</p>
    </div>
  )
}
