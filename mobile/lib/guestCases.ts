// Applications a guest submitted (and maybe paid) on this phone before having an account (pay first, account after
// payment). Kept here only until someone signs in with that email: then the account lists the case itself (ownership =
// the row's email) and the entry is dropped. Home shows each one with "Create your account" (app/payment/[id]).
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type GuestCase = { id: string; email: string; reference: string; country: string; at: number };
const KEY = "ezvisa.guestCases.v1";
let cache: GuestCase[] | null = null;
const subs = new Set<(l: GuestCase[]) => void>();

async function read(): Promise<GuestCase[]> {
  if (cache) return cache;
  try { const v = await AsyncStorage.getItem(KEY); const l = v ? (JSON.parse(v) as GuestCase[]) : []; cache = Array.isArray(l) ? l.filter((x) => x?.id && x.email) : []; }
  catch { cache = []; }
  return cache;
}
function write(l: GuestCase[]) { cache = l; subs.forEach((f) => f(l)); AsyncStorage.setItem(KEY, JSON.stringify(l)).catch(() => {}); }

export async function rememberGuestCase(c: Omit<GuestCase, "at">) {
  const l = await read();
  write([{ ...c, email: c.email.trim().toLowerCase(), at: Date.now() }, ...l.filter((x) => x.id !== c.id)].slice(0, 5));
}
/** Signed in as `email`: that account now lists these cases itself. */
export async function forgetGuestCases(email: string) {
  const e = email.trim().toLowerCase(); const l = await read();
  if (l.some((x) => x.email === e)) write(l.filter((x) => x.email !== e));
}
export function useGuestCases() {
  const [l, setL] = useState<GuestCase[]>(cache ?? []);
  useEffect(() => { subs.add(setL); read().then(setL); return () => { subs.delete(setL); }; }, []);
  return l;
}
