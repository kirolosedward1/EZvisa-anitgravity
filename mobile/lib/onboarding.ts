import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY = "ezvisa.welcomed.v1";
let cache: boolean | null = null;
/** null while loading, then whether the welcome screen has been seen. */
export function useWelcomed() {
  const [v, setV] = useState<boolean | null>(cache);
  useEffect(() => { if (cache === null) AsyncStorage.getItem(KEY).then((x) => { cache = x === "1"; setV(cache); }).catch(() => { cache = true; setV(true); }); }, []);
  return v;
}
export async function markWelcomed() { cache = true; await AsyncStorage.setItem(KEY, "1").catch(() => {}); }

/** "Start my application" on Welcome: guest mode switches the root routes (Stack.Protected), which resets navigation and
 *  would drop a push made at the same moment. Welcome asks here; the root opens the wizard once the app side is mounted. */
let startWizard = false;
export const requestWizardStart = () => { startWizard = true; };
export const takeWizardStart = () => { const v = startWizard; startWizard = false; return v; };
