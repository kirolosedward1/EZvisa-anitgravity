"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatDisplayDate, parseCalendarDate } from "@/lib/dates"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface CustomDatePickerProps {
  value?: string // YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  min?: string // YYYY-MM-DD
  max?: string // YYYY-MM-DD
  className?: string
  id?: string
  invalid?: boolean
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
  invalid = false,
}: CustomDatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const parseDateString = React.useCallback((dateStr?: string) => {
    const parsed = parseCalendarDate(dateStr)
    if (!parsed) return undefined
    const [year, month, day] = parsed.iso.split("-").map(Number)
    return new Date(year, month - 1, day)
  }, [])

  const formatDateString = React.useCallback((date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }, [])

  const selectedDate = React.useMemo(() => parseDateString(value), [value, parseDateString])
  const minDate = React.useMemo(() => parseDateString(min), [min, parseDateString])
  const maxDate = React.useMemo(() => parseDateString(max), [max, parseDateString])

  const disabledMatcher = React.useCallback(
    (date: Date) => {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true
      if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true
      return false
    },
    [minDate, maxDate],
  )

  const handleSelect = (date: Date | undefined) => {
    onChange(date ? formatDateString(date) : "")
    setOpen(false)
  }

  const displayText = formatDisplayDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-14 w-full cursor-pointer select-none items-center justify-between rounded-xl border border-[#E3E7EF] bg-[#FFFFFF] px-4 text-left text-[15px] font-normal text-[#0A0F1F] outline-none transition-colors focus-visible:border-[#0436DC] disabled:cursor-not-allowed disabled:opacity-50",
            !displayText && "text-[#5B6475]",
            invalid && "border-[#B83200]",
            className,
          )}
        >
          {displayText || placeholder}
          <CalendarIcon className="ml-2 h-5 w-5 shrink-0 text-[#5B6475]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-50 w-auto rounded-xl p-0" align="start">
        <Calendar mode="single" selected={selectedDate} onSelect={handleSelect} disabled={disabledMatcher} initialFocus />
      </PopoverContent>
    </Popover>
  )
}
