/** Keep a Latin fragment left-to-right inside Arabic text (LRI … PDI). */
export function ltr(text: string) {
  return `\u2066${text}\u2069`
}
