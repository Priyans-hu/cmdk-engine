import type { CommandItem, SearchEngine, ScoredItem } from './types'

/**
 * Create a search engine backed by match-sorter.
 * Requires `match-sorter` as a peer dependency.
 *
 * match-sorter provides excellent ranking for "type what you remember" UX,
 * with configurable thresholds and multi-key support.
 *
 * @param options.threshold - match-sorter threshold (default: CONTAINS)
 * @param options.keys - Additional keys to search beyond defaults
 */
export function createMatchSorterSearch(options?: MatchSorterOptions): SearchEngine {
  // Lazy import to avoid bundling match-sorter in core
  let matchSorterFn: typeof import('match-sorter').matchSorter | null = null

  async function loadMatchSorter() {
    if (!matchSorterFn) {
      const mod = await import('match-sorter')
      matchSorterFn = mod.matchSorter
    }
    return matchSorterFn
  }

  // Pre-load on creation
  const ready = loadMatchSorter()

  return {
    search(query: string, items: CommandItem[]): ScoredItem[] {
      const visible = items.filter((item) => !item.hidden)

      if (!query || query.trim() === '') {
        return visible
          .map((item) => ({ item, score: 1 }))
          .sort((a, b) => (b.item.priority ?? 0) - (a.item.priority ?? 0))
      }

      if (!matchSorterFn) {
        // Fallback: if match-sorter hasn't loaded yet, basic filter
        const q = query.toLowerCase()
        return visible
          .filter(
            (item) =>
              item.label.toLowerCase().includes(q) ||
              item.keywords?.some((k) => k.toLowerCase().includes(q)),
          )
          .map((item) => ({ item, score: 0.5 }))
      }

      const keys: Array<string | { key: string; threshold?: number }> = [
        'label',
        'description',
        { key: 'keywords', threshold: options?.threshold },
        ...(options?.keys ?? []),
      ]

      const matched = matchSorterFn(visible, query, {
        keys: keys as Parameters<typeof matchSorterFn>[2]['keys'],
      })

      // Convert to scored items (position-based scoring)
      return matched.map((item, index) => ({
        item,
        score: 1 - index / Math.max(matched.length, 1),
      }))
    },
  }

  // Trigger eager load
  void ready
}

export interface MatchSorterOptions {
  /** match-sorter ranking threshold */
  threshold?: number
  /** Additional keys to search */
  keys?: string[]
}
