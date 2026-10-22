// NetInfo stub for queue tests: globalThis.__net.set(online) fires the listener like a real connectivity change.
const ls = new Set(); let state = { isConnected: true, isInternetReachable: true };
globalThis.__net = { set: (on) => { state = { isConnected: on, isInternetReachable: on }; ls.forEach((l) => l(state)); } };
export default { addEventListener: (l) => { ls.add(l); l(state); return () => ls.delete(l); }, fetch: async () => state };
