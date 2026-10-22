// AsyncStorage stub persisted to $TEST_DIR/storage.json, so a second process sees what the first one saved (= app restart).
import fs from "node:fs";
const f = () => process.env.TEST_DIR + "/storage.json";
const read = () => { try { return JSON.parse(fs.readFileSync(f(), "utf8")); } catch { return {}; } };
export default { getItem: async (k) => read()[k] ?? null, setItem: async (k, v) => { const d = read(); d[k] = v; fs.writeFileSync(f(), JSON.stringify(d)); }, removeItem: async (k) => { const d = read(); delete d[k]; fs.writeFileSync(f(), JSON.stringify(d)); } };
