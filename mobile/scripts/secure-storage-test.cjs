// node scripts/secure-storage-test.cjs - unit test for lib/secureStorage.ts on the native path, with SecureStore and AsyncStorage faked.
/* global __dirname, Buffer */ // node-only test script
const path = require("path"); const ROOT = path.resolve(__dirname, "..");
const ts = require(path.join(ROOT, "node_modules/typescript"));
const fs = require("fs"); const Module = require("module");
const src = fs.readFileSync(path.join(ROOT, "lib/secureStorage.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const secure = new Map(); const async = new Map(); let maxBytes = 0; let writes = 0;
const mocks = {
  "react-native": { Platform: { OS: "ios" } },
  "expo-secure-store": {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
    getItemAsync: async (k) => (secure.has(k) ? secure.get(k) : null),
    setItemAsync: async (k, v) => { if (!/^[\w.-]+$/.test(k)) throw new Error("bad key " + k); const b = Buffer.byteLength(v); if (b > 2048) throw new Error("value over 2048 bytes"); maxBytes = Math.max(maxBytes, b); writes++; secure.set(k, v); },
    deleteItemAsync: async (k) => { secure.delete(k); },
  },
  "@react-native-async-storage/async-storage": { __esModule: true, default: {
    getItem: async (k) => (async.has(k) ? async.get(k) : null), setItem: async (k, v) => { async.set(k, v); }, removeItem: async (k) => { async.delete(k); },
    multiGet: async (ks) => ks.map((k) => [k, async.has(k) ? async.get(k) : null]),
  } },
};
const m = new Module("secureStorage"); const req = (id) => mocks[id] ?? require(id); m.require = req;
new Function("exports", "require", "module", js)(m.exports, req, m);
const { secureStorage, splitUtf8, forgetSessionAfterReinstall } = m.exports;
const assert = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) process.exitCode = 1; };
(async () => {
  const KEY = "sb-dravvaykssrbktztmrlj-auth-token";
  const big = JSON.stringify({ access_token: "a".repeat(1200), refresh_token: "r".repeat(40), user: { email: "x@y.z", user_metadata: { full_name: "محمد أحمد 😀".repeat(80) } } });
  assert(Buffer.byteLength(big) > 3000, `session-sized value is ${Buffer.byteLength(big)} bytes`);
  assert(splitUtf8(big).join("") === big && splitUtf8(big).every((c) => Buffer.byteLength(c) <= 1800), "split keeps text and every chunk <= 1800 bytes (Arabic + emoji)");
  await secureStorage.setItem(KEY, big);
  assert((await secureStorage.getItem(KEY)) === big, "large session round-trips");
  assert(maxBytes <= 2048, `no SecureStore value over 2048 bytes (max ${maxBytes})`);
  const keysAfterFirst = [...secure.keys()].length;
  await secureStorage.setItem(KEY, big.replace("x@y.z", "q@y.z"));
  assert([...secure.keys()].length === keysAfterFirst, "rewrite drops the previous generation's chunks");
  await secureStorage.setItem(KEY, "small");
  assert((await secureStorage.getItem(KEY)) === "small" && secure.size === 1, "small value stored whole, old chunks removed");
  await secureStorage.removeItem(KEY);
  assert(secure.size === 0 && (await secureStorage.getItem(KEY)) === null, "remove clears everything");
  // migration from AsyncStorage
  async.set(KEY, big);
  assert((await secureStorage.getItem(KEY)) === big && !async.has(KEY) && secure.size > 1, "old AsyncStorage session moves to SecureStore and is deleted there");
  // interrupted write: chunks of a new generation written but header not swapped -> old value still readable
  const before = await secureStorage.getItem(KEY); const origSet = mocks["expo-secure-store"].setItemAsync; let n = 0;
  mocks["expo-secure-store"].setItemAsync = async (k, v) => { if (k === KEY && ++n) throw new Error("killed"); return origSet(k, v); };
  await secureStorage.setItem(KEY, big + "X").catch(() => {});
  mocks["expo-secure-store"].setItemAsync = origSet;
  assert((await secureStorage.getItem(KEY)) === before, "app killed mid-write keeps the previous complete session");
  // reinstall: keychain session but no install marker and nothing in AsyncStorage -> forgotten
  secure.clear(); async.clear(); await secureStorage.setItem(KEY, big); async.clear();
  await forgetSessionAfterReinstall([KEY]);
  assert((await secureStorage.getItem(KEY)) === null && async.get("ezvisa.install.v1") === "1", "fresh install forgets a Keychain session from a previous install");
  await secureStorage.setItem(KEY, big); await forgetSessionAfterReinstall([KEY]);
  assert((await secureStorage.getItem(KEY)) === big, "normal relaunch keeps the session");
  // upgrade from an old build: no marker, session in AsyncStorage -> kept (migrated on first read)
  secure.clear(); async.clear(); async.set(KEY, big); await forgetSessionAfterReinstall([KEY]);
  assert((await secureStorage.getItem(KEY)) === big, "upgrade from an AsyncStorage build keeps the user signed in");
})();
