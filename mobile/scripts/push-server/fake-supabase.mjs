// For run-fn.mjs. In-memory stand-in for the service-role client notify-status uses (rpc, from().select().eq/in().maybeSingle(), delete().in()).
export const db = { apps: [], tokens: [], deleted: [], secret: "s3cret" };
function q(table) {
  let rows = table === "visa_applications" ? db.apps : db.tokens; let filters = []; let del = false;
  const api = {
    select() { return api; },
    delete() { del = true; return api; },
    eq(c, v) { filters.push((r) => r[c] === v); return api; },
    in(c, vs) { filters.push((r) => vs.includes(r[c])); if (del) { db.deleted.push(...vs); db.tokens = db.tokens.filter((r) => !vs.includes(r[c])); } return api; },
    async maybeSingle() { return { data: rows.filter((r) => filters.every((f) => f(r)))[0] ?? null }; },
    then(res) { return Promise.resolve({ data: rows.filter((r) => filters.every((f) => f(r))) }).then(res); },
  };
  return api;
}
export function createClient() { return { rpc: async (_n, { s }) => ({ data: s === db.secret }), from: q }; }
