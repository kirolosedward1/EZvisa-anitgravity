'use client'

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface CustomDatePickerProps {
  value?: string // YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  min?: string // YYYY-MM-DD
  max?: string // YYYY-MM-DD
  className?: string
  id?: string
}

export function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  min,
  max,
  className,
  id,
}: CustomDatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse YYYY-MM-DD in local time
  const parseDateString = React.useCallback((dateStr?: string) => {
    if (!dateStr) return undefined
    const [year, month, day] = dateStr.split("-").map(Number)
    return new Date(year, month - 1, day)
  }, [])

  // Format to YYYY-MM-DD in local time
  const formatDateString = React.useCallback((date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }, [])

  const selectedDate = React.useMemo(() => parseDateString(value), [value, parseDateString])
  const minDate = React.useMemo(() => parseDateString(min), [min, parseDateString])
  const maxDate = React.useMemo(() => parseDateString(max), [max, parseDateString])

  const disabledMatcher = React.useCallback((date: Date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    if (minDate) {
      const minD = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
      if (d < minD) return true
    }
    if (maxDate) {
      const maxD = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
      if (d > maxD) return true
    }
    return false
  }, [minDate, maxDate])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(formatDateString(date))
    } else {
      onChange("")
    }
    setOpen(false)
  }

  // Format display text
  const displayText = selectedDate ? format(selectedDate, "PPP") : ""

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "h-14 rounded-xl border border-border/80 bg-background/50 backdrop-blur-sm px-4 text-base font-medium text-foreground transition-all duration-300 hover:border-blue-500/50 hover:bg-background/80 focus-visible:border-blue-500 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:outline-none shadow-sm flex items-center justify-between text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/10 w-full select-none",
            !value && "text-muted-foreground/60 font-normal",
            className
          )}
        >
          {displayText || placeholder}
          <CalendarIcon className="h-5 w-5 text-muted-foreground/60 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={disabledMatcher}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
