"use client"

import { useMemo, useState } from "react"
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js"
import { Label } from "@/components/ui/label"

const COUNTRIES = getCountries()
  .map((iso) => ({ iso, calling: getCountryCallingCode(iso) }))
  .sort((a, b) => a.iso.localeCompare(b.iso))

export function PhoneField({
  id = "phone",
  value,
  onChange,
}: {
  id?: string
  /** E.164 value, or empty. */
  value: string
  onChange: (e164: string, valid: boolean) => void
}) {
  const initial = useMemo(() => parsePhoneNumberFromString(value || ""), [value])
  const [country, setCountry] = useState<CountryCode>(initial?.country || "AE")
  const [national, setNational] = useState(initial ? initial.formatInternational().replace(`+${initial.countryCallingCode}`, "").trim() : "")

  const apply = (nextCountry: CountryCode, raw: string) => {
    let digits = raw.replace(/\D/g, "")
    if (digits.startsWith("0")) digits = digits.replace(/^0+/, "")
    // Grouped as you type, without the trunk 0: "501234567" -> "50 123 4567" (same as the app). AsYouType with a
    // country and no trunk 0 leaves the digits ungrouped, so format the international number and drop the dial code.
    const dial = `+${getCountryCallingCode(nextCountry)}`
    const intl = digits ? new AsYouType().input(dial + digits) : ""
    const formatted = intl.startsWith(dial) ? intl.slice(dial.length).trim() : digits
    setCountry(nextCountry)
    setNational(formatted)
    const parsed = digits ? parsePhoneNumberFromString(digits, nextCountry) : undefined
    onChange(parsed?.number || "", Boolean(parsed?.isValid()))
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Phone number</Label>
      <div className="flex gap-2">
        <select
          aria-label="Country code"
          value={country}
          onChange={(event) => apply(event.target.value as CountryCode, national)}
          className="h-12 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
        >
          {COUNTRIES.map((item) => (
            <option key={item.iso} value={item.iso}>
              {item.iso} +{item.calling}
            </option>
          ))}
        </select>
        <input
          id={id}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={country === "AE" ? "50 123 4567" : "Phone number"}
          value={national}
          onChange={(event) => apply(country, event.target.value)}
          className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground"
        />
      </div>
    </div>
  )
}
