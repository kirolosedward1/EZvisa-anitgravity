const m = new Map();
export default { getItem: async (k) => (m.has(k) ? m.get(k) : null), setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); }, multiRemove: async (ks) => { ks.forEach((k) => m.delete(k)); }, _dump: () => Object.fromEntries(m) };
