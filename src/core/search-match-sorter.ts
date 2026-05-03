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
  type MatchSorterFn = <T>(items: T[], value: string, options?: { keys?: string[] }) => T[]
  let matchSorterFn: MatchSorterFn | null = null

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
        // Fallback: if match-sorter hasn't loaded yet, basic ranked filter.
        // Differentiate scores so the first paint is at least roughly ordered:
        //   exact label match     → 1.0
        //   label prefix match    → 0.9
        //   label substring match → 0.7
        //   keyword substring     → 0.5
        const q = query.toLowerCase()
        const ranked: ScoredItem[] = []
        for (const item of visible) {
          const label = item.label.toLowerCase()
          let score = 0
          if (label === q) score = 1
          else if (label.startsWith(q)) score = 0.9
          else if (label.includes(q)) score = 0.7
          else if (item.keywords?.some((k) => k.toLowerCase().includes(q))) score = 0.5
          if (score > 0) ranked.push({ item, score })
        }
        ranked.sort((a, b) => {
          const diff = b.score - a.score
          if (diff !== 0) return diff
          return (b.item.priority ?? 0) - (a.item.priority ?? 0)
        })
        return ranked
      }

      const keys: string[] = [
        'label',
        'description',
        'keywords',
        ...(options?.keys ?? []),
      ]

      const matched = matchSorterFn(visible, query, { keys })

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
