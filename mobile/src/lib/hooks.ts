import NetInfo from "@react-native-community/netinfo"
import { useFocusEffect } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"

import { ApiError } from "./api"

/** Online/offline status. `null` until the first reading. */
export function useOnline(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null)
  useEffect(
    () => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)),
    [],
  )
  return online
}

/**
 * Loads data when the screen gains focus (so it's fresh after navigating back
 * or after the web app changed something) and supports pull-to-refresh.
 */
export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const loadRef = useRef(load)
  loadRef.current = load

  const run = useCallback(async (mode: "initial" | "refresh" | "silent") => {
    if (mode === "refresh") setRefreshing(true)
    try {
      const result = await loadRef.current()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "unknown", String(err)))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      run("silent")
    }, [run]),
  )

  return {
    data,
    setData,
    error,
    loading,
    refreshing,
    refresh: () => run("refresh"),
    reload: () => run("silent"),
  }
}
