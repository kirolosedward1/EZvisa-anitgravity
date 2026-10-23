const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩"
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹"

/** Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits become 0-9. */
export function toWesternDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabic = ARABIC_INDIC.indexOf(digit)
    if (arabic >= 0) return String(arabic)
    const extended = EXTENDED_ARABIC_INDIC.indexOf(digit)
    return extended >= 0 ? String(extended) : digit
  })
}

/** Western digits, uppercase letters, spaces removed. */
export function normalizePassport(value: string) {
  return toWesternDigits(value).replace(/\s/g, "").toUpperCase()
}
