/** Pure helper for reads that tolerate optional columns missing from a database (lib/staff/data.ts). */

/** The column a "does not exist" error names (Postgres 42703 or PostgREST PGRST204), if it is one we asked for. */
export function missingColumn(error: { code?: string; message?: string } | null, asked: string[]): string | null {
  if (!error || !["42703", "PGRST204"].includes(error.code ?? "")) return null
  const msg = error.message ?? ""
  return asked.find((c) => new RegExp(`(^|[^a-z_])${c}([^a-z_]|$)`).test(msg)) ?? null
}
