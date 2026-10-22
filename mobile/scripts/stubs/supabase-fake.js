// Fake Supabase for the privacy test: globalThis.__insert(table, rows) decides the response; default = offline.
export const supabase = { from: (table) => ({ insert: async (rows) => (globalThis.__insert ? globalThis.__insert(table, rows) : { error: { message: "Network request failed" }, status: 0 }) }) };
