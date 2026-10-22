// Local stand-in for the Supabase REST + Auth endpoints the app and the website use for drafts, so autosave, resume,
// conflicts and offline can be tested end to end without touching the live database.
// It emulates what matters for drafts on public.visa_applications: the updated_at trigger (server time, microseconds,
// "+00:00" format like Postgres), RLS (a signed-in user sees and updates only rows with their email; updates only while
// draft/submitted/reviewing; anon may insert), unique ids (23505), single()/maybeSingle() and the filters used.
// Test hooks: GET /__db (all rows), POST /__db/edit {id, patch} (another device saves), POST /__db/reset.
// Optional: STATIC_DIR + STATIC_PORT serve an `expo export --platform web` build (SPA fallback).
// Usage: node scripts/mock-supabase.mjs   (PORT=54321, users: any email with password "test-pass")
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT || 54321);
const SERVICE_KEY = process.env.SERVICE_KEY || "mock-service-role";
const NO_TRIGGER = process.env.NO_TRIGGER === "1"; // emulate a database without the updated_at trigger
let rows = [];
let clock = 0;

/** Postgres-like timestamptz text with microseconds, always increasing. */
function nowTs() {
  const ms = Date.now(); const us = Math.max(clock + 1, ms * 1000 + Math.floor(Math.random() * 1000)); clock = us;
  const d = new Date(Math.floor(us / 1000)).toISOString().replace("Z", "");
  return `${d.slice(0, 19)}.${String(us % 1_000_000).padStart(6, "0")}+00:00`;
}
/** Microseconds since epoch of a timestamp text (keeps the 6 fraction digits Date.parse drops). */
function micros(s) {
  const m = /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:?\d{2})?$/.exec(String(s));
  if (!m) return NaN;
  return Date.parse(`${m[1].replace(" ", "T")}${m[3] && m[3] !== "Z" ? m[3] : "Z"}`) * 1000 + Number((m[2] || "").padEnd(6, "0"));
}
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function jwt(email) {
  const sub = crypto.createHash("sha1").update(email).digest("hex").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*/, "$1-$2-$3-$4-$5");
  return { token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, email, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`, sub };
}
function claims(req) {
  const t = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (t === SERVICE_KEY || req.headers.apikey === SERVICE_KEY && !t) return { service: true };
  try { const p = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()); return p.email ? { email: String(p.email).toLowerCase(), sub: p.sub } : {}; } catch { return {}; }
}
const userOf = (c) => ({ id: c.sub, aud: "authenticated", role: "authenticated", email: c.email, app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" });
function session(email) {
  const { token, sub } = jwt(email);
  return { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `r.${b64({ email })}`, user: userOf({ email, sub }) };
}

function parseFilter(v) {
  if (v.startsWith("eq.")) return (x) => (x ?? null) !== null && (String(x) === v.slice(3) || (!isNaN(micros(x)) && micros(x) === micros(v.slice(3))));
  if (v.startsWith("neq.")) return (x) => String(x) !== v.slice(4);
  if (v.startsWith("is.null")) return (x) => x === null || x === undefined;
  if (v.startsWith("in.(")) { const set = v.slice(4, -1).split(",").map((s) => s.replace(/^"|"$/g, "")); return (x) => set.includes(String(x)); }
  if (v.startsWith("not.in.(")) { const set = v.slice(8, -1).split(",").map((s) => s.replace(/^"|"$/g, "")); return (x) => !set.includes(String(x)); }
  return () => true;
}
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
function query(url) {
  const filters = []; for (const [k, v] of url.searchParams) if (!RESERVED.has(k)) filters.push([k, parseFilter(v)]);
  return { filters, order: url.searchParams.get("order"), limit: Number(url.searchParams.get("limit") || 0), select: url.searchParams.get("select") || "*" };
}
const visible = (c, r) => c.service || (!!c.email && String(r.email).toLowerCase() === c.email);
function project(r, select) {
  if (!select || select === "*") return { ...r };
  const out = {}; for (const k of select.split(",").map((s) => s.trim())) out[k] = r[k] ?? null; return out;
}
function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", ...cors, ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
}
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "*" };
const readBody = (req) => new Promise((ok) => { let s = ""; req.on("data", (d) => (s += d)); req.on("end", () => { try { ok(s ? JSON.parse(s) : null); } catch { ok(null); } }); });

function rest(req, res, url, body) {
  const table = url.pathname.split("/")[3];
  const c = claims(req);
  const accept = req.headers.accept || "";
  const prefer = req.headers.prefer || "";
  const reply = (list) => {
    if (accept.includes("vnd.pgrst.object")) {
      if (list.length !== 1) return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${list.length} rows` });
      return send(res, 200, list[0]);
    }
    return send(res, 200, list);
  };
  if (table !== "visa_applications") return req.method === "GET" ? send(res, 200, []) : send(res, 201, prefer.includes("return=representation") ? [] : undefined);
  const q = query(url);
  const match = (r) => visible(c, r) && q.filters.every(([k, f]) => f(r[k]));
  if (req.method === "GET") {
    let list = rows.filter(match);
    if (q.order) { const [col, dir] = q.order.split("."); list.sort((a, b) => (micros(a[col]) - micros(b[col])) * (dir === "desc" ? -1 : 1)); }
    if (q.limit) list = list.slice(0, q.limit);
    return reply(list.map((r) => project(r, q.select)));
  }
  if (req.method === "POST") {
    const items = Array.isArray(body) ? body : [body];
    const made = [];
    for (const it of items) {
      if (!c.service && c.email && String(it.email).toLowerCase() !== c.email) return send(res, 403, { code: "42501", message: "new row violates row-level security policy" });
      const id = it.id || crypto.randomUUID();
      if (rows.some((r) => r.id === id)) return send(res, 409, { code: "23505", message: 'duplicate key value violates unique constraint "visa_applications_pkey"' });
      const now = nowTs();
      const r = { application_status: "submitted", payment_status: "pending", created_at: now, ...it, id, updated_at: NO_TRIGGER && it.updated_at ? it.updated_at : now };
      rows.push(r); made.push(r);
    }
    if (!prefer.includes("return=representation")) return send(res, 201, undefined);
    if (!c.service && !c.email) return send(res, 401, { code: "42501", message: "permission denied (anon cannot read back)" });
    return reply(made.map((r) => project(r, q.select)));
  }
  if (req.method === "PATCH") {
    const hit = rows.filter((r) => match(r) && (c.service || ["draft", "submitted", "reviewing"].includes(r.application_status)));
    for (const r of hit) Object.assign(r, body, { id: r.id, updated_at: NO_TRIGGER && body.updated_at ? body.updated_at : nowTs() });
    if (!prefer.includes("return=representation")) return send(res, 204, undefined);
    return reply(hit.map((r) => project(r, q.select)));
  }
  return send(res, 405, { message: "method not allowed" });
}

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, undefined);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const body = ["POST", "PATCH"].includes(req.method) ? await readBody(req) : null;
  const p = url.pathname;
  if (p === "/__db") return send(res, 200, rows);
  if (p === "/__db/reset") { rows = []; return send(res, 200, { ok: true }); }
  if (p === "/__db/edit") { const r = rows.find((x) => x.id === body.id); if (!r) return send(res, 404, {}); Object.assign(r, body.patch, { updated_at: nowTs() }); return send(res, 200, r); }
  if (p.startsWith("/rest/v1/")) return rest(req, res, url, body);
  if (p === "/auth/v1/token") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") return body?.password === "test-pass" ? send(res, 200, session(String(body.email).toLowerCase())) : send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials" });
    if (grant === "refresh_token") { try { const { email } = JSON.parse(Buffer.from(String(body.refresh_token).slice(2), "base64url").toString()); return send(res, 200, session(email)); } catch { return send(res, 400, { error: "invalid_grant" }); } }
  }
  if (p === "/auth/v1/user") { const c = claims(req); return c.email ? send(res, 200, userOf(c)) : send(res, 401, { message: "invalid token" }); }
  if (p === "/auth/v1/logout") return send(res, 204, undefined);
  if (p === "/auth/v1/settings") return send(res, 200, { external: { email: true, google: false, apple: false }, disable_signup: false });
  return send(res, 200, {});
}).listen(PORT, () => console.log(`mock supabase on :${PORT}${NO_TRIGGER ? " (no updated_at trigger)" : ""}`));

if (process.env.STATIC_DIR) {
  const dir = process.env.STATIC_DIR; const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".ttf": "font/ttf", ".json": "application/json", ".ico": "image/x-icon", ".svg": "image/svg+xml" };
  http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let f = path.join(dir, u);
    if (!f.startsWith(dir)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = fs.existsSync(`${f}.html`) ? `${f}.html` : fs.existsSync(path.join(f, "index.html")) ? path.join(f, "index.html") : path.join(dir, "index.html");
    res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
  }).listen(Number(process.env.STATIC_PORT || 8081), () => console.log(`static ${dir} on :${process.env.STATIC_PORT || 8081}`));
}
