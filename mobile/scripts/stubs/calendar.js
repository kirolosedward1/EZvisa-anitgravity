// expo-calendar/legacy stub. Tests can steer it through globalThis.__cal = { perm, requested, create } and read the calls.
const cal = () => globalThis.__cal ?? {};
const log = (name, arg) => { (globalThis.__calls ??= []).push([name, arg]); };
export const getCalendarPermissionsAsync = async () => { log("getPerm"); return cal().perm ?? { granted: false, canAskAgain: true }; };
export const requestCalendarPermissionsAsync = async () => { log("requestPerm"); return cal().requested ?? { granted: false, canAskAgain: false }; };
export const createEventInCalendarAsync = async (e) => { log("create", e); if (cal().createThrows) throw new Error("sheet failed"); return cal().create ?? { action: "canceled", id: null }; };
