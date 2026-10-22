// Fake lib/data for queue tests: a "server" whose bucket is $TEST_DIR/server.json, keyed by the real docPath().
// globalThis.__fault: "offline" (request never reaches the server) | "lost" (server stores it, response is lost) | "hang" | undefined.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- node-only test helper (no @types/node in the app)
const fs = require("node:fs") as { readFileSync(p: string, e: string): string; writeFileSync(p: string, d: string): void; existsSync(p: string): boolean; readdirSync(p: string): string[] };
export class UploadError extends Error { constructor(message: string, public network: boolean) { super(message); } }
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };
export const docPath = (a: string, t: string, id: string, type: string) => `${a}/${t}_${id}.${EXT[type] ?? "jpg"}`;
const file = () => process.env.TEST_DIR + "/server.json";
export const server = (): { objects: Record<string, number>; puts: number } => { try { return JSON.parse(fs.readFileSync(file(), "utf8")); } catch { return { objects: {}, puts: 0 }; } };
const save = (s: ReturnType<typeof server>) => fs.writeFileSync(file(), JSON.stringify(s));
const DOC_TYPES = ["passportCopy", "passportFront", "passportBack", "residencyCopy", "photo", "personalPhoto", "passportPhoto", "bankStatement", "nocCertificate", "salaryCertificate"];
export const isUploadType = (t: string) => DOC_TYPES.includes(t);
export async function uploadDocument(applicationId: string, f: { uri: string; mimeType?: string | null }, documentType: string, uploadId: string, onProgress?: (fraction: number) => void) {
  const fault = (globalThis as any).__fault;
  if (fault === "offline") throw new UploadError("Network request failed", true);
  if (fault === "hang") return new Promise<void>(() => {});
  onProgress?.(0.5);
  const s = server(); s.puts++;
  const p = docPath(applicationId, documentType, uploadId, f.mimeType ?? "image/jpeg");
  s.objects[p] = (s.objects[p] ?? 0) + 1; // same path again = overwrite, not a new object
  save(s);
  if (fault === "lost") throw new UploadError("Network request failed", true);
}
