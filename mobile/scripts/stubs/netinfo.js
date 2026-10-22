// NetInfo stub for queue tests: globalThis.__net.set(online) fires the listener like a real connectivity change.
const ls = new Set();
globalThis.__net = { set: (on) => ls.forEach((l) => l({ isConnected: on, isInternetReachable: on })) };
export default { addEventListener: (l) => { ls.add(l); l({ isConnected: true, isInternetReachable: true }); return () => ls.delete(l); } };
