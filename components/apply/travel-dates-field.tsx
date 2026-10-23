"use client"

import { useMemo } from "react"
import { Calendar } from "@/components/ui/calendar"
import { LangText } from "@/components/lang-text"
import { ChoiceList, ChoiceRow, FieldError } from "@/components/apply/wizard-choices"
import { cn } from "@/lib/utils"
import {
  TRIP_LENGTHS,
  formatShortDate,
  schengenEndDate,
  schengenStayDays,
  upcomingTravelMonths,
  flexibleEntryDate,
} from "@/lib/dates"
import type { FormData, FormDataUpdate } from "@/lib/form-types"

type TravelDatesFieldProps = {
  formData: FormData
  updateFormData: (data: FormDataUpdate) => void
  showErrors: boolean
  onClearErrors: () => void
}

function isoFromDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function dateFromIso(iso?: string) {
  if (!iso) return undefined
  const [year, month, day] = iso.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function minDepartureIso() {
  const date = new Date()
  date.setDate(date.getDate() + 15)
  return isoFromDate(date)
}

function StayLine({ start, end, stay }: { start: string; end: string; stay: number }) {
  return (
    <p className="text-[15px] text-[#0A0F1F]" dir="ltr">
      {formatShortDate(start)} – {formatShortDate(end)} · {stay} <LangText en="days" ar="يومًا" />
    </p>
  )
}

export function TravelDatesField({ formData, updateFormData, showErrors, onClearErrors }: TravelDatesFieldProps) {
  const months = useMemo(() => upcomingTravelMonths(12), [])
  const minIso = minDepartureIso()
  const flexible = formData.datesFlexible === "yes"
  const fixed = formData.datesFlexible === "no"
  const start = formData.travelStartDate || ""
  const end = formData.travelEndDate || ""
  const stay = start && end ? schengenStayDays(start, end) : 0

  const setMode = (mode: "yes" | "no") => {
    onClearErrors()
    updateFormData({
      datesFlexible: mode,
      travelStartDate: "",
      travelEndDate: "",
      travelMonth: "",
      tripLength: "",
    })
  }

  const applyFixed = (nextStart: string, nextEnd: string) => {
    onClearErrors()
    updateFormData({
      datesFlexible: "no",
      travelStartDate: nextStart,
      travelEndDate: nextEnd,
      travelMonth: "",
      tripLength: "",
    })
  }

  const onRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    const from = range?.from ? isoFromDate(range.from) : ""
    let to = range?.to ? isoFromDate(range.to) : ""
    if (from && to && to < from) {
      applyFixed(to, "")
      return
    }
    if (from && to && to === from) to = ""
    applyFixed(from, to)
  }

  const applyLength = (days: number) => {
    if (!fixed) return
    onClearErrors()
    if (!start) {
      updateFormData({ tripLength: String(days) })
      return
    }
    updateFormData({
      tripLength: String(days),
      travelEndDate: schengenEndDate(start, days) || "",
    })
  }

  const applyMonth = (value: string) => {
    onClearErrors()
    const length = Number(formData.tripLength)
    const entry = flexibleEntryDate(value)
    updateFormData({
      datesFlexible: "yes",
      travelMonth: value,
      travelStartDate: length ? entry : "",
      travelEndDate: length ? schengenEndDate(entry, length) || "" : "",
    })
  }

  const applyFlexibleLength = (days: number) => {
    onClearErrors()
    const entry = formData.travelMonth ? flexibleEntryDate(formData.travelMonth) : ""
    updateFormData({
      datesFlexible: "yes",
      tripLength: String(days),
      travelStartDate: entry,
      travelEndDate: entry ? schengenEndDate(entry, days) || "" : "",
    })
  }

  const modeMissing = showErrors && !formData.datesFlexible
  const fixedMissing = showErrors && fixed && (!start || !end)
  const fixedOrder = showErrors && fixed && !!start && !!end && end <= start
  const fixedLong = showErrors && fixed && stay > 90
  const monthMissing = showErrors && flexible && !formData.travelMonth
  const lengthMissing = showErrors && flexible && !formData.tripLength

  return (
    <div className="space-y-6">
      <ChoiceList label="Fixed dates or flexible dates">
        <ChoiceRow
          title="Fixed dates"
          titleAr="مواعيد محددة"
          description="You know the departure and the return."
          descriptionAr="تعرف تاريخ المغادرة وتاريخ العودة."
          selected={fixed}
          onSelect={() => setMode("no")}
        />
        <ChoiceRow
          title="Flexible"
          titleAr="مواعيد مرنة"
          description="You know the month and how long you will stay."
          descriptionAr="تعرف الشهر ومدة الإقامة."
          selected={flexible}
          onSelect={() => setMode("yes")}
        />
      </ChoiceList>
      {modeMissing ? (
        <FieldError>
          <LangText en="Choose fixed dates or flexible dates." ar="اختر مواعيد محددة أو مواعيد مرنة." />
        </FieldError>
      ) : null}

      {fixed ? (
        <div className="space-y-4 border-t border-[#E3E7EF] pt-6">
          <div className={cn("overflow-x-auto", (fixedMissing || fixedOrder || fixedLong) && "rounded-xl border border-[#B83200]")}>
            <Calendar
              mode="range"
              defaultMonth={dateFromIso(minIso)}
              selected={{ from: dateFromIso(start), to: dateFromIso(end) }}
              onSelect={onRangeSelect}
              disabled={{ before: dateFromIso(minIso) as Date }}
              numberOfMonths={2}
              className="w-full p-0 [--cell-size:2.75rem] md:[--cell-size:2.15rem]"
              classNames={{
                root: "w-full",
                months: "relative flex w-full flex-col gap-4 md:flex-row",
                month: "flex w-full min-w-0 flex-col gap-3 md:flex-1",
              }}
              components={{
                Month: ({ calendarMonth: _calendarMonth, displayIndex, className, children, ...props }) => (
                  <div
                    {...props}
                    data-month-index={displayIndex}
                    className={cn(className, (displayIndex ?? 0) > 0 && "max-md:!hidden")}
                  >
                    {children}
                  </div>
                ),
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Trip length">
            {TRIP_LENGTHS.map((length) => {
              const selected = !!start && end === schengenEndDate(start, length.days)
              return (
                <button
                  key={length.days}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => applyLength(length.days)}
                  className={cn(
                    "h-11 min-w-[4.5rem] flex-1 rounded-full border px-3 text-[15px] font-medium",
                    selected ? "border-[#0436DC] bg-[#F2F5FF] text-[#0436DC]" : "border-[#E3E7EF] bg-[#FFFFFF] text-[#0A0F1F]",
                  )}
                >
                  <LangText en={length.en} ar={length.ar} />
                </button>
              )
            })}
          </div>
          {start && end && stay > 1 ? <StayLine start={start} end={end} stay={stay} /> : null}
          {fixedMissing ? (
            <FieldError>
              <LangText en="Select a departure date, then a return date." ar="اختر تاريخ المغادرة ثم تاريخ العودة." />
            </FieldError>
          ) : null}
          {fixedOrder ? (
            <FieldError>
              <LangText en="Choose a return date after your departure." ar="اختر تاريخ عودة بعد المغادرة." />
            </FieldError>
          ) : null}
          {fixedLong ? (
            <FieldError>
              <LangText en="A tourist stay can be 90 days at most." ar="الإقامة السياحية لا تتجاوز ٩٠ يومًا." />
            </FieldError>
          ) : null}
        </div>
      ) : null}

      {flexible ? (
        <div className="space-y-6 border-t border-[#E3E7EF] pt-6">
          <div>
            <p className="mb-3 text-[13px] font-medium text-[#0A0F1F]">
              <LangText en="When do you plan to travel?" ar="متى تخطط للسفر؟" />
            </p>
            <div className={cn("flex flex-wrap gap-2", monthMissing && "rounded-xl border border-[#B83200] p-2")}>
              {months.map((month) => {
                const selected = formData.travelMonth === month.value
                return (
                  <button
                    key={month.value}
                    type="button"
                    onClick={() => applyMonth(month.value)}
                    className={cn(
                      "h-11 rounded-full border px-3 text-[15px] font-medium",
                      selected ? "border-[#0436DC] bg-[#F2F5FF] text-[#0436DC]" : "border-[#E3E7EF] bg-[#FFFFFF] text-[#0A0F1F]",
                    )}
                  >
                    <LangText en={month.en} ar={month.ar} />
                  </button>
                )
              })}
            </div>
            {monthMissing ? (
              <FieldError>
                <LangText en="Choose the month you plan to travel." ar="اختر شهر السفر." />
              </FieldError>
            ) : null}
          </div>
          <div>
            <p className="mb-3 text-[13px] font-medium text-[#0A0F1F]">
              <LangText en="Trip length" ar="مدة الرحلة" />
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Trip length">
              {TRIP_LENGTHS.map((length) => {
                const selected = formData.tripLength === String(length.days)
                return (
                  <button
                    key={length.days}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => applyFlexibleLength(length.days)}
                    className={cn(
                      "h-11 min-w-[4.5rem] flex-1 rounded-full border px-3 text-[15px] font-medium",
                      selected ? "border-[#0436DC] bg-[#F2F5FF] text-[#0436DC]" : "border-[#E3E7EF] bg-[#FFFFFF] text-[#0A0F1F]",
                      lengthMissing && "border-[#B83200]",
                    )}
                  >
                    <LangText en={length.en} ar={length.ar} />
                  </button>
                )
              })}
            </div>
            {lengthMissing ? (
              <FieldError>
                <LangText en="Choose how long you plan to stay." ar="اختر مدة الإقامة." />
              </FieldError>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
