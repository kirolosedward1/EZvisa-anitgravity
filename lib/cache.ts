import { cache } from "react"
import { unstable_cache } from "next/cache"

/**
 * Global Memory Cache Layer
 * Deduplicates in-memory data requests across components per render lifecycle.
 */
export const memoize = <T extends (...args: any[]) => Promise<any>>(fn: T): T => {
  return cache(fn) as T
}

/**
 * Persistent Data Cache Layer
 * Caches database and external API fetch results across requests using Next.js Data Cache.
 */
export const createCachedFetcher = <T extends (...args: any[]) => Promise<any>>(
  fetcher: T,
  keyParts: string[],
  options?: {
    revalidate?: number | false
    tags?: string[]
  }
): T => {
  return unstable_cache(fetcher, keyParts, {
    revalidate: options?.revalidate ?? 3600, // Default 1-hour cache TTL
    tags: options?.tags ?? ["global"],
  }) as unknown as T
}

/**
 * Cache keys registry for data revalidation
 */
export const CACHE_KEYS = {
  BLOG_POSTS: "blog-posts-cache",
  DESTINATIONS: "destinations-cache",
  DOCUMENTS: "documents-cache",
} as const
