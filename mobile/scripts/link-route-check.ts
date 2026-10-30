// Node-only checks for lib/linkRoute.ts (universal links -> app screens). Run: bun scripts/run-check.ts scripts/link-route-check.ts
import { linkRoute } from "../lib/linkRoute";
declare const process: any;
let fail = 0;
const ok = (got: string, want: string, l: string) => { const c = got === want; console.log(`${c ? "PASS" : "FAIL"}  ${l}${c ? "" : ` (got ${got})`}`); if (!c) fail++; };
const ID = "11111111-2222-4333-8444-555555555555";
ok(linkRoute(`https://www.ezvisa.net/dashboard?id=${ID}`), `/applications/${ID}`, "dashboard with id opens that application");
ok(linkRoute("https://www.ezvisa.net/dashboard"), "/applications", "dashboard opens Applications");
ok(linkRoute(`https://ezvisa.net/ar/continue/${ID.toUpperCase()}`), `/continue/${ID}`, "Arabic continue link, bare domain, upper case id");
ok(linkRoute("https://www.ezvisa.net/track/abc123"), "/applications", "track link opens Applications");
ok(linkRoute(`https://www.ezvisa.net/app-return?r=cancel&appId=${ID}&to=ezvisa://x`), `/payment-return?appId=${ID}&r=cancel`, "payment return keeps only appId and r");
ok(linkRoute("https://www.ezvisa.net/documents/required-documents-to-apply-for-a-tourist-visa-in-france"), "/country/france", "document guide opens the country");
ok(linkRoute("https://www.ezvisa.net/destinations/italy"), "/country/italy", "destination opens the country");
ok(linkRoute("/payment/abc?returned=success"), "/payment/abc?returned=success", "app paths unchanged");
ok(linkRoute("ezvisa://auth/callback?code=1"), "ezvisa://auth/callback?code=1", "custom scheme unchanged");
ok(linkRoute("https://evil.example/dashboard"), "https://evil.example/dashboard", "other hosts untouched");
console.log(fail ? `${fail} FAILED` : "ALL PASS"); if (fail) process.exit(1);
