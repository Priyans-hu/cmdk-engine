import { useState, useCallback, useMemo, useSyncExternalStore } from 'react'
import type { CommandGroup, CommandPaletteState, ScoredItem } from '../core/types'
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
  /** Flat list of all result items (ungrouped) */
  flatResults: ScoredItem[]
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

    return searched
  }, [commands, searchQuery, search, keywords, accessFilter, frecency])

  // Limit results
  const limitedResults = useMemo(() => {
    const max = config.maxResults ?? 50
    return results.slice(0, max)
  }, [results, config.maxResults])

  // Extract active groups
  const groups = useMemo<CommandGroup[]>(() => {
    return groupManager.extractGroups(limitedResults.map((r) => r.item))
  }, [limitedResults, groupManager])

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

  return {
    search: searchQuery,
    setSearch: setSearchQuery,
    results: limitedResults,
    flatResults: limitedResults,
    groups,
    isOpen,
    isLoading: false,
    open,
    close,
    toggle,
    recordUsage,
  }
}
