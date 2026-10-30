// Website links (universal links: https://www.ezvisa.net/...) mapped to app screens. Pure, so it can be checked
// with plain node. Paths the app doesn't know stay as they are (custom-scheme links such as ezvisa://payment/... are
// already app paths); website pages with no app screen fall back to a sensible tab, never a blank screen.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const DOC_PREFIX = "/documents/required-documents-to-apply-for-a-tourist-visa-in-";

export function linkRoute(input: string): string {
  let url: URL;
  try { url = new URL(input, "https://www.ezvisa.net"); } catch { return input; }
  const web = /^(www\.)?ezvisa\.net$/i.test(url.host);
  if (!web && /^https?:$/.test(url.protocol)) return input;
  const path = url.pathname.replace(/^\/ar(?=\/|$)/, "").replace(/\/+$/, "") || "/";
  const q = url.searchParams;
  const id = (q.get("id") ?? "").toLowerCase();
  if (path === "/dashboard") return new RegExp(`^${UUID}$`).test(id) ? `/applications/${id}` : "/applications";
  if (path.startsWith("/track")) return "/applications";
  const cont = new RegExp(`^/continue/(${UUID})$`, "i").exec(path);
  if (cont) return `/continue/${cont[1].toLowerCase()}`;
  if (path === "/app-return") {
    const p = new URLSearchParams();
    const appId = (q.get("appId") ?? "").replace(/[^0-9a-f-]/gi, "").slice(0, 36);
    if (appId) p.set("appId", appId);
    p.set("r", q.get("r") === "cancel" ? "cancel" : "success");
    return `/payment-return?${p.toString()}`;
  }
  if (path.startsWith(DOC_PREFIX)) return `/country/${path.slice(DOC_PREFIX.length).replace(/[^a-z-]/gi, "")}`;
  const dest = /^\/destinations\/([a-z-]+)$/i.exec(path);
  if (dest) return `/country/${dest[1].toLowerCase()}`;
  return input;
}
