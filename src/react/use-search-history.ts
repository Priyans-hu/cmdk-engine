import { useEngineContext } from './context'
import type { SearchHistoryEntry } from '../core/types'

/**
 * Hook for direct access to search history.
 * Use this to build custom "recent searches" UI or manage history.
 */
export function useSearchHistory(): {
  /** Get recent search queries */
  getRecent: (count?: number) => SearchHistoryEntry[]
  /** Clear all search history */
  clear: () => void
  /** Remove a specific query from history */
  remove: (query: string) => void
} {
  const { searchHistory } = useEngineContext()

  return {
    getRecent: (count?: number) => searchHistory.getRecent(count),
    clear: () => searchHistory.clear(),
    remove: (query: string) => searchHistory.remove(query),
  }
}
