// In-memory stand-in for lib/supabase.ts (scripts/test-profile.ts). Records every query so the test can check that
// each read is filtered by the signed-in user's email and each write goes to that user only.
export const db = { user: null, users: {}, rows: [], calls: [] };
const q = (table) => {
  const f = { table, eqs: [], order: null, limit: null, update: null, single: false };
  const run = () => {
    db.calls.push(f);
    // db.beforeUpdate(): runs once before the next update, to simulate another write landing between a read and a write.
    if (f.update && db.beforeUpdate) { const h = db.beforeUpdate; db.beforeUpdate = null; h(); }
    let rows = db.rows.filter((r) => f.eqs.every(([k, v]) => r[k] === v));
    // update(): applies the patch to the matching rows, like PostgREST with .select() (writable = db.writable(row), default true).
    if (f.update) { rows = rows.filter((r) => !db.writable || db.writable(r)); rows.forEach((r) => Object.assign(r, f.update)); }
    if (f.order) rows = [...rows].sort((a, b) => (f.order.ascending ? 1 : -1) * String(a[f.order.col]).localeCompare(String(b[f.order.col])));
    rows = rows.map((r) => ({ ...r })); // copies, like a real response (later writes don't change what was read)
    if (f.single) return Promise.resolve(rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: "not exactly one row" } });
    return Promise.resolve({ data: f.limit ? rows.slice(0, f.limit) : rows, error: null });
  };
  const b = { select: () => b, eq: (k, v) => (f.eqs.push([k, v]), b), order: (col, o) => ((f.order = { col, ...o }), b), limit: (n) => ((f.limit = n), b),
    update: (patch) => ((f.update = patch), b), single: () => ((f.single = true), b), then: (res, rej) => run().then(res, rej) };
  return b;
};
export const supabase = {
  from: q,
  auth: {
    getUser: async () => ({ data: { user: db.user }, error: null }),
    updateUser: async ({ data }) => {
      db.calls.push({ updateUser: db.user?.id, data });
      db.user.user_metadata = { ...db.user.user_metadata, ...data };
      db.users[db.user.id] = db.user;
      return { data: { user: db.user }, error: null };
    },
  },
};
