import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"

/**
 * Supabase session storage backed by the iOS Keychain.
 *
 * Keychain items should stay under ~2 KB, but a Supabase session (JWT +
 * refresh token + user) is often larger, so values are split into chunks.
 * On web (dev only) it falls back to localStorage.
 */
const CHUNK = 1800
const opts: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }

const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_")

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null
    const k = safeKey(key)
    const count = Number(await SecureStore.getItemAsync(`${k}.n`, opts))
    if (!count) return null
    const parts: string[] = []
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${k}.${i}`, opts)
      if (part == null) return null
      parts.push(part)
    }
    return parts.join("")
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") return globalThis.localStorage?.setItem(key, value)
    const k = safeKey(key)
    const prev = Number(await SecureStore.getItemAsync(`${k}.n`, opts)) || 0
    const count = Math.ceil(value.length / CHUNK) || 1
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(`${k}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), opts)
    }
    for (let i = count; i < prev; i++) await SecureStore.deleteItemAsync(`${k}.${i}`, opts)
    await SecureStore.setItemAsync(`${k}.n`, String(count), opts)
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") return globalThis.localStorage?.removeItem(key)
    const k = safeKey(key)
    const count = Number(await SecureStore.getItemAsync(`${k}.n`, opts)) || 0
    for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${k}.${i}`, opts)
    await SecureStore.deleteItemAsync(`${k}.n`, opts)
  },
}
