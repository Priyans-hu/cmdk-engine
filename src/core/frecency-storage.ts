import type { FrecencyEntry, FrecencyStorage } from './types'

/**
 * Create a localStorage-backed frecency storage.
 * Falls back gracefully in SSR or when localStorage is unavailable.
 *
 * @param storageKey - localStorage key prefix (default: 'cmdk-frecency')
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

  function readAll(): Record<string, FrecencyEntry> {
    if (!isAvailable()) return {}
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : {}
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
