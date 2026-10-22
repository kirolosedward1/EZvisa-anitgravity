// Upload queue tests on the REAL lib/uploads.ts + pure helpers (lib/capture.ts, components/CropBox.tsx dragRect, lib/data.ts docPath).
// Phase "a": offline queueing, airplane mode mid-upload with a lost response, duplicate file, then the app is killed mid-upload.
// Phase "b" (a NEW process = app restart): the killed upload resumes and finishes; the bucket has no duplicates.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- node-only test helper (no @types/node in the app)
const fs = require("node:fs") as { readFileSync(p: string, e: string): string; writeFileSync(p: string, d: string): void; existsSync(p: string): boolean; readdirSync(p: string): string[] };
import { enqueueUpload, startUploadQueue, restore, backoffMs } from "../lib/uploads";
import { server } from "./stubs/data-server";

const log = (ok: boolean, step: string, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${step}${info ? "  " + info : ""}`); if (!ok) process.exitCode = 1; };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const saved = () => JSON.parse(JSON.parse(fs.readFileSync(process.env.TEST_DIR + "/storage.json", "utf8"))["ezvisa.uploads.v1"]) as any[];
const net = (on: boolean) => (globalThis as any).__net.set(on);
const fault = (f?: string) => ((globalThis as any).__fault = f);
const until = async (cond: () => boolean, ms = 8000) => { const t0 = Date.now(); while (!cond() && Date.now() - t0 < ms) await wait(50); return cond(); };
const APP = "11111111-2222-4333-8444-555555555555";
const mk = (name: string, body: string) => { const p = `${process.env.TEST_DIR}/${name}`; fs.writeFileSync(p, body); return { uri: `file://${p}`, name, mimeType: name.endsWith(".pdf") ? "application/pdf" : "image/jpeg", size: body.length }; };

(async () => {
  const phase = process.argv[2];
  if (phase === "pure") {
    const { fileKind } = await import("../lib/capture");
    const { dragRect } = await import("../components/CropBox");
    const { docPath } = await import("../lib/data");
    log(fileKind({ name: "a.pdf", mimeType: "application/pdf" }) === "pdf", "PDF accepted");
    log(fileKind({ name: "IMG_1.HEIC", mimeType: "image/heic" }) === "image", "HEIC accepted (converted to JPEG)");
    log(fileKind({ name: "x.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }) === null, "Word file rejected");
    log(fileKind({ name: "clip.mov", mimeType: "video/quicktime" }) === null, "video rejected");
    log(fileKind({ name: "notes.txt", mimeType: null }) === null, "unknown type rejected");
    const r = dragRect({ originX: 100, originY: 100, width: 800, height: 600 }, "tl", -500, 50, 1000, 800, 150);
    log(r.originX === 0 && r.originY === 150 && r.width === 900 && r.height === 550, "crop corner clamps to the image", JSON.stringify(r));
    const m = dragRect({ originX: 100, originY: 100, width: 800, height: 600 }, "move", 900, 900, 1000, 800, 150);
    log(m.originX === 200 && m.originY === 200, "crop box move stays inside the image", JSON.stringify(m));
    const s = dragRect({ originX: 0, originY: 0, width: 800, height: 600 }, "br", -790, -590, 1000, 800, 150);
    log(s.width === 150 && s.height === 150, "crop box keeps a minimum size");
    log(docPath(APP, "passportCopy", "u-1", "image/jpeg") === `${APP}/passportCopy_u-1.jpg`, "object path = application/type_uploadId.ext");
    const re = restore([{ id: "1697-abc", state: "waiting" }, { id: "9b2e0f7e-1c2d-4e5f-8a9b-0c1d2e3f4a5b", state: "uploading" }, { id: "9b2e0f7e-1c2d-4e5f-8a9b-0c1d2e3f4a5c", state: "done", doneAt: 0 }], 2 * 864e5, () => "00000000-0000-4000-8000-000000000000");
    log(re.length === 2 && re.every((j) => j.state === "queued") && re[0].id === "00000000-0000-4000-8000-000000000000", "restore: killed/old jobs back to queued, legacy id gets a UUID, old done rows dropped");
    log(backoffMs(1) >= 1600 && backoffMs(1) <= 2400 && backoffMs(10) <= 72000, "backoff 2s first, capped at 60s (+jitter)");
    return;
  }
  if (phase === "a") {
    startUploadQueue();
    net(false); // airplane mode on before adding
    const r1 = await enqueueUpload(APP, mk("passport.jpg", "PASSPORT-BYTES"), "passportCopy");
    await wait(200);
    log(saved()[0]?.state === "queued" && saved()[0]?.offline === true, "offline: item saved as queued (waiting for connection)");
    log(server().puts === 0, "offline: nothing sent");
    const dup = await enqueueUpload(APP, mk("passport-again.jpg", "PASSPORT-BYTES"), "passportCopy");
    log(dup.duplicate && dup.id === r1.id && saved().length === 1, "same file added twice: rejected as duplicate");
    // Airplane mode mid-upload: the server receives the bytes but the response is lost, and the device goes offline.
    fault("lost"); net(true);
    await until(() => server().puts >= 1);
    fault("offline"); net(false); await wait(300);
    log(saved()[0].state === "queued", "connection lost mid-upload: item back to queued", `attempts=${saved()[0].attempts}`);
    fault(undefined); net(true); // airplane mode off
    log(await until(() => saved()[0].state === "done"), "back online: retried and done");
    const objs = Object.entries(server().objects);
    log(objs.length === 1 && objs[0][0].endsWith(`passportCopy_${r1.id}.jpg`), "no duplicate object in storage (retry overwrote the same path)", `objects=${objs.length} puts=${server().puts}`);
    // Kill the app while a second upload is in flight.
    fault("hang");
    await enqueueUpload(APP, mk("bank.pdf", "%PDF-1.7 BANK"), "bankStatement");
    log(await until(() => saved().some((j) => j.name === "bank.pdf" && j.state === "uploading")), "second upload in flight");
    console.log("--- app killed ---");
    process.exit();
  }
  if (phase === "b") {
    log(saved().some((j) => j.name === "bank.pdf" && j.state === "uploading"), "after restart: saved queue still has the in-flight item");
    startUploadQueue();
    log(await until(() => saved().find((j) => j.name === "bank.pdf")?.state === "done"), "after restart: item resumed and finished");
    const objs = Object.keys(server().objects);
    log(objs.length === 2 && saved().filter((j) => j.state === "done").length === 2, "queue survived the restart; 2 files, 2 objects, no duplicates", objs.map((o) => o.split("/")[1]).join(", "));
    const copies = fs.existsSync(process.env.TEST_DIR + "/doc/uploads") ? fs.readdirSync(process.env.TEST_DIR + "/doc/uploads") : [];
    log(copies.length === 0, "local copies removed after upload");
    process.exit();
  }
})();
