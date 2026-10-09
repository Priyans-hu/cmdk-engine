import type { FrecencyEntry, FrecencyStorage } from './types'

function isEntry(value: unknown): value is FrecencyEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Partial<FrecencyEntry>
  return (
    typeof entry.id === 'string' &&
    typeof entry.count === 'number' &&
    typeof entry.lastUsed === 'number'
  )
}

/**
 * Create a localStorage-backed frecency storage.
 * Falls back gracefully in SSR or when localStorage is unavailable.
 *
 * @param storageKey - Full localStorage key, not a prefix (default: 'cmdk-frecency')
 */
export function createLocalStorageFrecencyStorage(
  storageKey = 'cmdk-frecency',
): FrecencyStorage {
  function isAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    } catch {
      return false
    }
  }

  // The key is shared by every app on the origin, so it can hold anything.
  // Malformed data is ignored, and the next write replaces it.
  function readAll(): Record<string, FrecencyEntry> {
    if (!isAvailable()) return {}
    try {
      const raw = localStorage.getItem(storageKey)
      const data: unknown = raw ? JSON.parse(raw) : {}
      if (typeof data !== 'object' || data === null || Array.isArray(data)) return {}
      const entries = data as Record<string, unknown>
      for (const key of Object.keys(entries)) {
        if (!isEntry(entries[key])) delete entries[key]
      }
      return entries as Record<string, FrecencyEntry>
    } catch {
      return {}
    }
  }

  function writeAll(data: Record<string, FrecencyEntry>): void {
    if (!isAvailable()) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch {
      // localStorage full or unavailable — silently fail
    }
  }

  return {
    get(key: string): FrecencyEntry | null {
      const data = readAll()
      return data[key] ?? null
    },

    set(key: string, entry: FrecencyEntry): void {
      const data = readAll()
      data[key] = entry
      writeAll(data)
    },

    delete(key: string): void {
      const data = readAll()
      delete data[key]
      writeAll(data)
    },

    getAll(): FrecencyEntry[] {
      return Object.values(readAll())
    },

    clear(): void {
      if (!isAvailable()) return
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // silently fail
      }
    },
  }
}
