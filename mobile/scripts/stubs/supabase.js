// In-memory stand-in for lib/supabase.ts (scripts/test-profile.ts). Records every query so the test can check that
// each read is filtered by the signed-in user's email and each write goes to that user only.
export const db = { user: null, users: {}, rows: [], calls: [] };
const q = (table) => {
  const f = { table, eqs: [], order: null, limit: null };
  const run = () => {
    db.calls.push(f);
    let rows = db.rows.filter((r) => f.eqs.every(([k, v]) => r[k] === v));
    if (f.order) rows = [...rows].sort((a, b) => (f.order.ascending ? 1 : -1) * String(a[f.order.col]).localeCompare(String(b[f.order.col])));
    return Promise.resolve({ data: f.limit ? rows.slice(0, f.limit) : rows, error: null });
  };
  const b = { select: () => b, eq: (k, v) => (f.eqs.push([k, v]), b), order: (col, o) => ((f.order = { col, ...o }), b), limit: (n) => ((f.limit = n), b), then: (res, rej) => run().then(res, rej) };
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
