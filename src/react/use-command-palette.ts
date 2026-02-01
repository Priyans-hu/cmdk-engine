import { useState, useCallback, useMemo, useSyncExternalStore } from 'react'
import type { CommandItem, CommandGroup, CommandPaletteState, ScoredItem } from '../core/types'
import type { GroupedResult } from '../core/grouping'
import { useEngineContext } from './context'

export interface UseCommandPaletteReturn extends CommandPaletteState {
  /** Set the search query */
  setSearch: (query: string) => void
  /** Open the palette */
  open: () => void
  /** Close the palette */
  close: () => void
  /** Toggle the palette */
  toggle: () => void
  /** Record that a command was selected (for frecency) */
  recordUsage: (commandId: string) => void
  /** Select a command — records frecency, runs onSelect/action/href, closes palette */
  select: (itemOrId: CommandItem | string) => void
  /** Flat list of all result items (ungrouped) */
  flatResults: ScoredItem[]
  /** Results grouped by group, sorted by group priority */
  groupedResults: GroupedResult[]
}

/**
 * Main hook for the command palette.
 * Returns filtered, ranked, and grouped results based on the current search query.
 *
 * Subscribes to the registry via useSyncExternalStore for efficient updates.
 */
export function useCommandPalette(): UseCommandPaletteReturn {
  const { registry, search, keywords, accessFilter, frecency, groupManager, config } =
    useEngineContext()

  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Subscribe to registry changes
  const commands = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot)

  // Pipeline: enrich → filter access → search → rank by frecency
  const results = useMemo<ScoredItem[]>(() => {
    // 1. Enrich with synonyms
    const enriched = keywords.enrichAll(commands)

    // 2. Filter by access control
    const accessible = accessFilter ? accessFilter(enriched) : enriched

    // 3. Search
    const searched = search.search(searchQuery, accessible)

    // 4. Rank by frecency (only if there's a search query)
    if (searchQuery.trim()) {
      return frecency.rank(searched, 0.3)
    }

    // 5. Inject "Recent" group when search is empty
    const frecencyConfig = config.frecency
    if (!searchQuery.trim() && frecencyConfig?.showRecent) {
      const recentCount = frecencyConfig.recentCount ?? 5
      const recentLabel = frecencyConfig.recentLabel ?? 'Recent'
      const recentIds = frecency.getRecent(recentCount)

      if (recentIds.length > 0) {
        const recentItems: ScoredItem[] = []
        const restItems: ScoredItem[] = []

        for (const s of searched) {
          if (recentIds.includes(s.item.id)) {
            recentItems.push({
              item: { ...s.item, group: recentLabel },
              score: s.score,
            })
          } else {
            restItems.push(s)
          }
        }

        // Sort recent items by recency order
        recentItems.sort(
          (a, b) => recentIds.indexOf(a.item.id) - recentIds.indexOf(b.item.id),
        )

        return [...recentItems, ...restItems]
      }
    }

    return searched
  }, [commands, searchQuery, search, keywords, accessFilter, frecency, config.frecency])

  // Limit results
  const limitedResults = useMemo(() => {
    const max = config.maxResults ?? 50
    return results.slice(0, max)
  }, [results, config.maxResults])

  // Group results by group field (for consumers building custom UIs)
  const groupedResults = useMemo<GroupedResult[]>(() => {
    return groupManager.groupResults(limitedResults)
  }, [limitedResults, groupManager])

  // Extract active groups
  const groups = useMemo<CommandGroup[]>(() => {
    return groupedResults.map((g) => g.group)
  }, [groupedResults])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => {
    setIsOpen(false)
    setSearchQuery('')
  }, [])
  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) setSearchQuery('')
      return !prev
    })
  }, [])

  const recordUsage = useCallback(
    (commandId: string) => {
      frecency.recordUsage(commandId)
    },
    [frecency],
  )

  const select = useCallback(
    (itemOrId: CommandItem | string) => {
      const item =
        typeof itemOrId === 'string'
          ? limitedResults.find((r) => r.item.id === itemOrId)?.item
          : itemOrId
      if (!item) return

      frecency.recordUsage(item.id)

      if (config.onSelect) {
        config.onSelect(item)
      } else if (item.action) {
        item.action(item)
      } else if (item.href) {
        window.location.href = item.href
      }

      close()
    },
    [limitedResults, frecency, config, close],
  )

  return {
    search: searchQuery,
    setSearch: setSearchQuery,
    results: limitedResults,
    flatResults: limitedResults,
    groupedResults,
    groups,
    isOpen,
    isLoading: false,
    open,
    close,
    toggle,
    recordUsage,
    select,
  }
}
