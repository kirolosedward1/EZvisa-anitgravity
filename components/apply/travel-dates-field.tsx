"use client"

import { useMemo } from "react"
import { Calendar } from "@/components/ui/calendar"
import { LangText } from "@/components/lang-text"
import { cn } from "@/lib/utils"
import {
  TRIP_LENGTHS,
  formatDisplayDate,
  schengenEndDate,
  schengenStayDays,
  upcomingTravelMonths,
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

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[12px] leading-4 text-[#B83200]">{children}</p>
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
    const entry = `${value}-01`
    updateFormData({
      datesFlexible: "yes",
      travelMonth: value,
      travelStartDate: length ? entry : "",
      travelEndDate: length ? schengenEndDate(entry, length) || "" : "",
    })
  }

  const applyFlexibleLength = (days: number) => {
    onClearErrors()
    const entry = formData.travelMonth ? `${formData.travelMonth}-01` : ""
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
    <div className="space-y-4 rounded-2xl border border-[#E3E7EF] bg-[#FFFFFF] p-4 md:p-6">
      <div>
        <p className="type-eyebrow mb-2 text-[#5B6475]">
          <LangText en="Are your travel dates flexible?" ar="هل مواعيد سفرك مرنة؟" />
        </p>
        <div className={cn("grid grid-cols-2 gap-2 rounded-xl", modeMissing && "rounded-xl ring-1 ring-[#B83200]")}>
          <button
            type="button"
            onClick={() => setMode("no")}
            className={cn(
              "h-12 rounded-xl border text-[15px] font-semibold",
              fixed ? "border-[#0436DC] bg-[#0436DC] text-white" : "border-[#E3E7EF] bg-[#FFFFFF] text-[#3A4150]",
            )}
          >
            <LangText en="Fixed dates" ar="مواعيد محددة" />
          </button>
          <button
            type="button"
            onClick={() => setMode("yes")}
            className={cn(
              "h-12 rounded-xl border text-[15px] font-semibold",
              flexible ? "border-[#0436DC] bg-[#0436DC] text-white" : "border-[#E3E7EF] bg-[#FFFFFF] text-[#3A4150]",
            )}
          >
            <LangText en="Flexible" ar="مرنة" />
          </button>
        </div>
        {modeMissing ? (
          <FieldError>
            <LangText en="Choose fixed dates or flexible dates." ar="اختر مواعيد محددة أو مواعيد مرنة." />
          </FieldError>
        ) : null}
      </div>

      {fixed ? (
        <div>
          <p className="type-eyebrow mb-2 text-[#5B6475]">
            <LangText en="Departure and return" ar="المغادرة والعودة" />
          </p>
          <div className={cn("overflow-hidden rounded-xl border border-[#E3E7EF]", (fixedMissing || fixedOrder) && "border-[#B83200]")}>
            <Calendar
              mode="range"
              selected={{ from: dateFromIso(start), to: dateFromIso(end) }}
              onSelect={onRangeSelect}
              disabled={{ before: dateFromIso(minIso) as Date }}
              numberOfMonths={1}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Trip length">
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
                    "h-11 min-w-[4.5rem] flex-1 rounded-full border px-3 text-[15px] font-semibold",
                    selected ? "border-[#0436DC] bg-[#0436DC]/10 text-[#0436DC]" : "border-[#E3E7EF] bg-[#FFFFFF] text-[#0A0F1F]",
                  )}
                >
                  <LangText en={length.en} ar={length.ar} />
                </button>
              )
            })}
          </div>
          {start ? (
            <p className="mt-3 text-[15px] text-[#3A4150]">
              {formatDisplayDate(start)}
              {end ? ` – ${formatDisplayDate(end)}` : ""}
            </p>
          ) : null}
          {fixedMissing ? (
            <FieldError>
              <LangText en="Select a departure date, then a return date." ar="اختر تاريخ المغادرة ثم تاريخ العودة." />
            </FieldError>
          ) : null}
          {fixedOrder ? (
            <FieldError>
              <LangText en="Return date can't be earlier than the departure date." ar="لا يمكن أن يسبق تاريخ العودة تاريخ المغادرة." />
            </FieldError>
          ) : null}
          {fixedLong ? (
            <FieldError>
              <LangText en="Schengen tourist visas permit a maximum stay of 90 days." ar="تأشيرة شنغن السياحية تسمح بإقامة لا تتجاوز ٩٠ يومًا." />
            </FieldError>
          ) : null}
        </div>
      ) : null}

      {flexible ? (
        <div className="space-y-4">
          <div>
            <p className="type-eyebrow mb-2 text-[#5B6475]">
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
                      "h-11 rounded-full border px-3 text-[15px] font-semibold",
                      selected ? "border-[#0436DC] bg-[#0436DC]/10 text-[#0436DC]" : "border-[#E3E7EF] bg-[#FFFFFF] text-[#0A0F1F]",
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
            <p className="type-eyebrow mb-2 text-[#5B6475]">
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
                      "h-11 min-w-[4.5rem] flex-1 rounded-full border px-3 text-[15px] font-semibold",
                      selected ? "border-[#0436DC] bg-[#0436DC]/10 text-[#0436DC]" : "border-[#E3E7EF] bg-[#FFFFFF] text-[#0A0F1F]",
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

      {stay > 1 && stay <= 90 ? (
        <p className="text-[15px] leading-relaxed text-[#3A4150]">
          <LangText en="Total Stay Duration:" ar="مدة الإقامة:" />{" "}
          <span className="font-semibold text-[#0A0F1F]">
            {stay} <LangText en="days" ar="يومًا" />
          </span>
        </p>
      ) : null}
    </div>
  )
}
