// `node --import ./scripts/ts-resolve.mjs`: lets Node's built-in TypeScript stripping load lib/*.ts, whose relative
// imports have no extension (Metro style). Used by `npm test`; no extra packages.
import { register } from "node:module";
const hook = `export async function resolve(s, c, next) {
  try { return await next(s, c); }
  catch (e) { if (/^\\.\\.?\\//.test(s) && !/\\.[cm]?[jt]sx?$/.test(s)) return next(s + ".ts", c); throw e; }
}`;
register("data:text/javascript," + encodeURIComponent(hook));
