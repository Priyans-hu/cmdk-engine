import type { SearchHistoryConfig, SearchHistoryEntry } from './types'

const DEFAULT_MAX_ENTRIES = 20
const DEFAULT_STORAGE_KEY = 'cmdk-search-history'
const DEFAULT_MIN_QUERY_LENGTH = 2

/**
 * Create a search history tracker that records search queries.
 * Separate from frecency (which tracks command usage).
 *
 * Uses localStorage for persistence (same pattern as frecency-storage.ts).
 */
export function createSearchHistory(config: SearchHistoryConfig = {}) {
  const maxEntries = config.maxEntries ?? DEFAULT_MAX_ENTRIES
  const storageKey = config.storageKey ?? DEFAULT_STORAGE_KEY
  const minQueryLength = config.minQueryLength ?? DEFAULT_MIN_QUERY_LENGTH

  function isAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    } catch {
      return false
    }
  }

  function load(): SearchHistoryEntry[] {
    if (!isAvailable()) return []
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function save(entries: SearchHistoryEntry[]): void {
    if (!isAvailable()) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries))
    } catch {
      // Silently fail (quota exceeded, SSR, etc.)
    }
  }

  return {
    /** Record a search query. Deduplicates by query string (updates timestamp). */
    record(query: string, resultCount: number): void {
      const trimmed = query.trim()
      if (trimmed.length < minQueryLength) return

      const entries = load()
      // Remove existing entry for this query (will re-add at front)
      const filtered = entries.filter((e) => e.query !== trimmed)
      filtered.unshift({ query: trimmed, timestamp: Date.now(), resultCount })

      // Trim to max entries
      save(filtered.slice(0, maxEntries))
    },

    /** Get recent search queries, sorted by timestamp descending. */
    getRecent(count?: number): SearchHistoryEntry[] {
      const entries = load()
      return count !== undefined ? entries.slice(0, count) : entries
    },

    /** Remove a specific search query from history. */
    remove(query: string): void {
      const entries = load()
      save(entries.filter((e) => e.query !== query))
    },

    /** Clear all search history. */
    clear(): void {
      if (!isAvailable()) return
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // Silently fail
      }
    },
  }
}

/**
 * In-memory search history (for testing or SSR).
 */
export function createInMemorySearchHistory(config: SearchHistoryConfig = {}) {
  const maxEntries = config.maxEntries ?? DEFAULT_MAX_ENTRIES
  const minQueryLength = config.minQueryLength ?? DEFAULT_MIN_QUERY_LENGTH
  let entries: SearchHistoryEntry[] = []

  return {
    record(query: string, resultCount: number): void {
      const trimmed = query.trim()
      if (trimmed.length < minQueryLength) return
      entries = entries.filter((e) => e.query !== trimmed)
      entries.unshift({ query: trimmed, timestamp: Date.now(), resultCount })
      entries = entries.slice(0, maxEntries)
    },

    getRecent(count?: number): SearchHistoryEntry[] {
      return count !== undefined ? entries.slice(0, count) : [...entries]
    },

    remove(query: string): void {
      entries = entries.filter((e) => e.query !== query)
    },

    clear(): void {
      entries = []
    },
  }
}
