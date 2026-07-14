import type { FrecencyEntry, FrecencyOptions, FrecencyStorage, ScoredItem } from './types'

const DEFAULT_HALF_LIFE = 7 // days
const DEFAULT_MAX_AGE = 30 // days
const MS_PER_DAY = 86_400_000

/**
 * Create a frecency engine that tracks usage patterns and
 * ranks items by frequency + recency using exponential decay.
 *
 * Algorithm:
 *   score = count * 2^(-timeSinceLastUse / halfLife)
 *
 * This means:
 * - An item used 10 times yesterday ranks higher than one used 100 times a month ago
 * - The half-life (default 7 days) controls how quickly old usage decays
 */
export function createFrecencyEngine(options: FrecencyOptions = {}) {
  const halfLife = options.halfLife ?? DEFAULT_HALF_LIFE
  const maxAge = options.maxAge ?? DEFAULT_MAX_AGE
  const storage = options.storage ?? createInMemoryStorage()

  /**
   * Record that a command was used.
   */
  function recordUsage(commandId: string): void {
    const now = Date.now()
    const existing = storage.get(commandId)

    const entry: FrecencyEntry = {
      id: commandId,
      count: (existing?.count ?? 0) + 1,
      lastUsed: now,
      halfLifeScore: 0, // Will be calculated
    }

    entry.halfLifeScore = calculateScore(entry, now)
    storage.set(commandId, entry)
  }

  /**
   * Calculate the decayed score for an entry at a given time.
   */
  function calculateScore(entry: FrecencyEntry, now: number): number {
    // Clamp to 0 so a future-dated lastUsed (clock skew, edited storage)
    // can't inflate the score via a negative exponent.
    const daysSinceUse = Math.max(0, (now - entry.lastUsed) / MS_PER_DAY)
    return entry.count * Math.pow(2, -daysSinceUse / halfLife)
  }

  /**
   * Get the frecency score for a command.
   * Returns 0 if never used.
   */
  function getScore(commandId: string): number {
    const entry = storage.get(commandId)
    if (!entry) return 0
    return calculateScore(entry, Date.now())
  }

  /**
   * Rank scored search results by blending search score with frecency.
   *
   * @param items - Search results with scores
   * @param frecencyWeight - How much frecency affects ranking (0-1, default 0.3)
   * @returns Re-ranked items
   */
  function rank(items: ScoredItem[], frecencyWeight = 0.3): ScoredItem[] {
    const now = Date.now()
    // Keep the blended score within the documented [0,1] contract.
    const weight = Math.min(Math.max(frecencyWeight, 0), 1)

    // Read the whole store once. A localStorage-backed get() re-parses the
    // entire blob on every call, and rank() runs on every keystroke — so
    // per-item get() was O(results) full-JSON parses per keystroke.
    const entriesById = new Map<string, FrecencyEntry>()
    for (const entry of storage.getAll()) {
      entriesById.set(entry.id, entry)
    }

    // Get max frecency score for normalization
    let maxFrecency = 0
    const frecencyScores = new Map<string, number>()

    for (const { item } of items) {
      const entry = entriesById.get(item.id)
      if (entry) {
        const score = calculateScore(entry, now)
        frecencyScores.set(item.id, score)
        maxFrecency = Math.max(maxFrecency, score)
      }
    }

    // Blend search score with normalized frecency
    return items
      .map(({ item, score }) => {
        const rawFrecency = frecencyScores.get(item.id) ?? 0
        const normalizedFrecency = maxFrecency > 0 ? rawFrecency / maxFrecency : 0

        const blendedScore = Math.min(
          score * (1 - weight) + normalizedFrecency * weight,
          1,
        )

        return { item, score: blendedScore }
      })
      .sort((a, b) => b.score - a.score)
  }

  /**
   * Get the most recently used command IDs, sorted by last use (newest first).
   */
  function getRecent(count = 5): string[] {
    return storage
      .getAll()
      .filter((e) => e.count > 0)
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, count)
      .map((e) => e.id)
  }

  /**
   * Clean up entries older than maxAge.
   */
  function cleanup(): void {
    const now = Date.now()
    const cutoff = now - maxAge * MS_PER_DAY

    for (const entry of storage.getAll()) {
      if (entry.lastUsed < cutoff) {
        storage.set(entry.id, { ...entry, count: 0, halfLifeScore: 0 })
      }
    }
  }

  /**
   * Clear all frecency data.
   */
  function clear(): void {
    storage.clear()
  }

  return {
    recordUsage,
    getScore,
    getRecent,
    rank,
    cleanup,
    clear,
  }
}

/**
 * In-memory frecency storage (for testing or SSR).
 */
export function createInMemoryStorage(): FrecencyStorage {
  const store = new Map<string, FrecencyEntry>()

  return {
    get(key: string): FrecencyEntry | null {
      return store.get(key) ?? null
    },
    set(key: string, entry: FrecencyEntry): void {
      store.set(key, entry)
    },
    getAll(): FrecencyEntry[] {
      return Array.from(store.values())
    },
    clear(): void {
      store.clear()
    },
  }
}
