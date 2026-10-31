"use client"

import { useMemo, useState } from "react"
import {
  AsYouType,
  getExampleNumber,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js"
import examples from "libphonenumber-js/mobile/examples"
import { Label } from "@/components/ui/label"

/** A generic number spaced exactly as typing groups it: UAE 50 000 0000, elsewhere the library's example (test) number. */
function placeholderFor(country: CountryCode): string {
  if (country === "AE") return "50 000 0000"
  const example = getExampleNumber(country, examples)
  return example ? example.formatInternational().replace(`+${example.countryCallingCode}`, "").trim() : "Phone number"
}

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
  const [national, setNational] = useState(initial?.formatNational().replace(/^0/, "") || "")

  const apply = (nextCountry: CountryCode, raw: string) => {
    let digits = raw.replace(/\D/g, "")
    if (digits.startsWith("0")) digits = digits.replace(/^0+/, "")
    // Typed as international so the national part comes back grouped ("50 123 4567"); a national-only input with no
    // leading 0 is left unspaced by the library.
    const calling = getCountryCallingCode(nextCountry)
    const formatted = digits ? new AsYouType(nextCountry).input(`+${calling}${digits}`).replace(new RegExp(`^\\+${calling}\\s?`), "") : ""
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
          placeholder={placeholderFor(country)}
          value={national}
          onChange={(event) => apply(country, event.target.value)}
          className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground"
        />
      </div>
    </div>
  )
}
