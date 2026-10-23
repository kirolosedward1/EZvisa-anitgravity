// In-memory expo-secure-store for node bundles.
const m = new Map();
export const getItemAsync = async (k) => m.get(k) ?? null;
export const setItemAsync = async (k, v) => { m.set(k, v); };
export const deleteItemAsync = async (k) => { m.delete(k); };
export const isAvailableAsync = async () => true;
export const AFTER_FIRST_UNLOCK = 0, WHEN_UNLOCKED = 1, WHEN_UNLOCKED_THIS_DEVICE_ONLY = 2, AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 3;
