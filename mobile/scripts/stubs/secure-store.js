// In-memory expo-secure-store for node tests (lib/secureStorage.ts imports it since chat 03).
const m = new Map();
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 1;
export const getItemAsync = async (k) => (m.has(k) ? m.get(k) : null);
export const setItemAsync = async (k, v) => { m.set(k, v); };
export const deleteItemAsync = async (k) => { m.delete(k); };
