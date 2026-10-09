import { matchSorter, rankings } from 'match-sorter'
import type { MatchSorterOptions as SorterOptions } from 'match-sorter'
import { foldText } from './search'
import type { CommandItem, SearchEngine, ScoredItem } from './types'

/**
 * Create a search engine backed by match-sorter.
 * Requires `match-sorter` (7 or 8): an optional peer dependency of cmdk-engine
 * that this entry imports, so install it to use this entry.
 *
 * match-sorter provides excellent ranking for "type what you remember" UX,
 * with configurable thresholds and multi-key support. It ranks every search,
 * including the first, so results do not change once it loads.
 *
 * The query is folded like the built-in search's (see `createFuzzySearch`);
 * command values keep match-sorter's own accent handling. Synonym keywords
 * from the keyword engine match too, ranked at most CONTAINS, so below direct
 * label, description and keyword matches (a `threshold` above CONTAINS drops
 * them).
 *
 * @param options.threshold - match-sorter threshold (default: match-sorter's, MATCHES)
 * @param options.keys - Additional keys to search beyond defaults
 */
export function createMatchSorterSearch(options?: MatchSorterOptions): SearchEngine {
  return {
    search(query: string, items: CommandItem[]): ScoredItem[] {
      if (!query || query.trim() === '') {
        // Empty query = browse list: exclude hidden items.
        return items
          .filter((item) => !item.hidden)
          .map((item) => ({ item, score: 1 }))
          .sort((a, b) => (b.item.priority ?? 0) - (a.item.priority ?? 0))
      }

      // With a non-empty query, hidden items stay searchable (searchable but
      // not browsable) — matching createFuzzySearch()'s documented contract.
      const q = foldText(query)
      // Only marks or a spacing accent (a dead key while typing): nothing to match.
      if (!q) return []
      const keys = [
        'label',
        'description',
        'keywords',
        { key: 'meta._synonymKeywords', maxRanking: rankings.CONTAINS },
        ...(options?.keys ?? []),
      ]

      const matched = matchSorter(items, q, {
        keys,
        // match-sorter types `threshold` as its `Ranking` enum; we expose it as a
        // plain number (Ranking values are numeric), so bridge at this boundary.
        threshold: options?.threshold as SorterOptions<CommandItem>['threshold'],
      })

      // Convert to scored items (position-based scoring)
      return matched.map((item, index) => ({
        item,
        score: 1 - index / Math.max(matched.length, 1),
      }))
    },
  }
}

export interface MatchSorterOptions {
  /** match-sorter ranking threshold */
  threshold?: number
  /** Additional keys to search */
  keys?: string[]
}
