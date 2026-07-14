import { useState, useCallback, useMemo, useSyncExternalStore } from 'react'
import type { CommandItem, CommandGroup, CommandPaletteState, ScoredItem } from '../core/types'
import type { GroupedResult } from '../core/grouping'
import { filterVisible } from '../core/access-control'
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
  /** Results grouped by group, sorted by group priority (or relevance during search) */
  groupedResults: GroupedResult[]
  /** Navigate into a command's children (nested commands) */
  drillDown: (item: CommandItem) => void
  /** Go back one level in nested navigation */
  drillUp: () => void
  /** Reset to root level */
  resetPath: () => void
}

/**
 * Main hook for the command palette.
 * Returns filtered, ranked, and grouped results based on the current search query.
 *
 * Subscribes to the registry via useSyncExternalStore for efficient updates.
 */
export function useCommandPalette(): UseCommandPaletteReturn {
  const {
    registry, search, keywords, accessFilter, frecency,
    groupManager, contextEngine, searchHistory, t, config,
  } = useEngineContext()

  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activePath, setActivePath] = useState<CommandItem[]>([])

  // Subscribe to registry changes
  const commands = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot)

  // Determine which commands to search: root or nested children
  const activeCommands = useMemo(() => {
    if (activePath.length === 0) return commands
    const parent = activePath[activePath.length - 1]
    return parent.children ?? []
  }, [commands, activePath])

  // Pipeline: visibility → enrich → filter access → search → rank by frecency → context boost
  const results = useMemo<ScoredItem[]>(() => {
    // 1. Apply dynamic visibility gates (`when`) — feature flags, plan/org gating
    const visible = filterVisible(activeCommands)

    // 2. Enrich with synonyms
    const enriched = keywords.enrichAll(visible)

    // 4. Filter by access control
    const accessible = accessFilter ? accessFilter(enriched) : enriched

    // 5. Search
    const searched = search.search(searchQuery, accessible)

    // 6. Rank by frecency
    if (searchQuery.trim()) {
      let ranked = frecency.rank(searched, 0.3)

      // 6b. Context boost (only during search, not empty state)
      if (config.context) {
        ranked = contextEngine.boost(ranked, config.context)
        // Re-sort after boosting
        ranked.sort((a, b) => b.score - a.score)
      }

      return ranked
    }

    // 7. Inject "Recent" group when search is empty
    const frecencyConfig = config.frecency
    if (frecencyConfig?.showRecent) {
      const recentCount = frecencyConfig.recentCount ?? 5
      const recentLabel = frecencyConfig.recentLabel ?? t('group.recent')
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

        // Rank the remainder by frecency so previously-used items still surface
        // above never-used items (preserving priority order within each tier).
        return [...recentItems, ...frecency.rank(restItems, 0.3)]
      }
    }

    // No "Recent" group: still apply frecency so frequently-used commands
    // float to the top on empty query (README: frecency > priority > alpha).
    return frecency.rank(searched, 0.3)
  }, [activeCommands, searchQuery, search, keywords, accessFilter, frecency, contextEngine, t, config])

  // Limit results
  const limitedResults = useMemo(() => {
    const max = config.maxResults ?? 50
    return results.slice(0, max)
  }, [results, config.maxResults])

  // Group results by group field (for consumers building custom UIs)
  const groupedResults = useMemo<GroupedResult[]>(() => {
    return groupManager.groupResults(limitedResults, searchQuery)
  }, [limitedResults, groupManager, searchQuery])

  // Extract active groups
  const groups = useMemo<CommandGroup[]>(() => {
    return groupedResults.map((g) => g.group)
  }, [groupedResults])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => {
    setIsOpen(false)
    setSearchQuery('')
    setActivePath([])
  }, [])
  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        setSearchQuery('')
        setActivePath([])
      }
      return !prev
    })
  }, [])

  // Nested navigation
  const drillDown = useCallback((item: CommandItem) => {
    if (!item.children?.length) return
    setActivePath((prev) => [...prev, item])
    setSearchQuery('')
  }, [])

  const drillUp = useCallback(() => {
    setActivePath((prev) => prev.slice(0, -1))
    setSearchQuery('')
  }, [])

  const resetPath = useCallback(() => {
    setActivePath([])
    setSearchQuery('')
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

      // If item has children, drill down instead of executing
      if (item.children && item.children.length > 0) {
        drillDown(item)
        return
      }

      frecency.recordUsage(item.id)

      // Record search history if enabled
      if (config.searchHistory?.enabled && searchQuery.trim()) {
        searchHistory.record(searchQuery, limitedResults.length)
      }

      if (config.onSelect) {
        config.onSelect(item)
      } else if (item.action) {
        item.action(item)
      } else if (item.href) {
        window.location.href = item.href
      }

      close()
    },
    [limitedResults, frecency, searchHistory, config, searchQuery, close, drillDown],
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
    breadcrumbs: activePath,
    depth: activePath.length,
    open,
    close,
    toggle,
    recordUsage,
    select,
    drillDown,
    drillUp,
    resetPath,
  }
}
