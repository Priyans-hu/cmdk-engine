import { matchSorter, rankings } from 'match-sorter'
import type { MatchSorterOptions as SorterOptions } from 'match-sorter'
import type { CommandItem, SearchEngine, ScoredItem } from './types'

// The built-in search's folding (accents U+0300 to U+036F, compatibility
// forms, repeated spaces), recomposed (NFC) and with case kept: match-sorter
// compares the query with the command values as written (Hangul syllables,
// voiced kana) and ranks an exact-case match first.
function foldQuery(query: string): string {
  return query
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Create a search engine backed by match-sorter.
 * Requires `match-sorter` (7 or 8): an optional peer dependency of cmdk-engine
 * that this entry imports, so install it to use this entry.
 *
 * match-sorter provides excellent ranking for "type what you remember" UX,
 * with configurable thresholds and multi-key support. It ranks every search,
 * including the first, so results do not change once it loads.
 *
 * The query's accents, Unicode compatibility forms and repeated spaces are
 * folded like the built-in search's, keeping its case; command values keep
 * match-sorter's own accent handling. Synonym keywords
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
      const q = foldQuery(query)
      // Only marks or a spacing accent (a dead key while typing): nothing to match.
      if (!q) return []
      const keys = [
        'label',
        'description',
        'keywords',
        {
          key: (item: CommandItem) => (item.meta?._synonymKeywords as string[] | undefined) ?? [],
          maxRanking: rankings.CONTAINS,
        },
        ...(options?.keys ?? []),
      ]

      const sort = (
        list: CommandItem[],
        value: string,
        sorter?: SorterOptions<CommandItem>['sorter'],
      ) =>
        matchSorter(list, value, {
          keys,
          // match-sorter types `threshold` as its `Ranking` enum; we expose it as a
          // plain number (Ranking values are numeric), so bridge at this boundary.
          threshold: options?.threshold as SorterOptions<CommandItem>['threshold'],
          sorter,
        })

      let matched = sort(items, q)
      // Words in any order: commands that match every distinct word follow the
      // whole-query matches, ranked by the first word. The longest word
      // filters first, so the others only check its few matches, and these
      // filter passes skip sorting.
      if (q.includes(' ')) {
        const words = [...new Set(q.split(' '))]
        const [first] = words
        const seen = new Set(matched)
        const rest = items.filter((item) => !seen.has(item))
        const filter = (list: CommandItem[], word: string) => sort(list, word, (ranked) => ranked)
        const hits = words.sort((a, b) => b.length - a.length).reduce(filter, rest)
        matched = matched.concat(sort(hits, first))
      }

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
