import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse" />
          
          {/* Spinner */}
          <Loader2 className="h-10 w-10 text-primary animate-spin relative z-10" />
        </div>
        
        {/* Loading text */}
        <p className="text-sm font-semibold text-primary/80 animate-pulse">Loading...</p>
      </div>
    </div>
  )
}
