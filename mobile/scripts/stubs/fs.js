// expo-file-system stub backed by node fs (Paths.document = $TEST_DIR/doc).
import fs from "node:fs"; import path from "node:path"; import { createHash } from "node:crypto";
const strip = (u) => String(u).replace(/^file:\/\//, "");
const join = (parts) => path.join(...parts.map((p) => (typeof p === "string" ? strip(p) : p.uri ? strip(p.uri) : String(p))));
export class Directory { constructor(...p) { this.uri = join(p); } get exists() { return fs.existsSync(this.uri); } create() { fs.mkdirSync(this.uri, { recursive: true }); } }
export class File {
  constructor(...p) { this.uri = join(p); }
  get exists() { return fs.existsSync(this.uri); }
  get size() { return fs.statSync(this.uri).size; }
  get md5() { return createHash("md5").update(fs.readFileSync(this.uri)).digest("hex"); }
  async copy(d) { fs.copyFileSync(this.uri, d.uri); }
  delete() { fs.rmSync(this.uri); }
}
export const Paths = { get document() { return new Directory(process.env.TEST_DIR, "doc"); } };
