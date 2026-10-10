import type { FrecencyEntry, FrecencyStorage } from './types'
import { getLocalStorage } from './local-storage'

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
  // The key is shared by every app on the origin, so it can hold anything.
  // Malformed data is ignored, and the next write replaces it.
  function readAll(): Record<string, FrecencyEntry> {
    try {
      const raw = getLocalStorage()?.getItem(storageKey)
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
    try {
      getLocalStorage()?.setItem(storageKey, JSON.stringify(data))
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
      try {
        getLocalStorage()?.removeItem(storageKey)
      } catch {
        // silently fail
      }
    },
  }
}
