import { useState, useCallback, useMemo, useSyncExternalStore, useEffect, useRef } from 'react'
import type { CommandItem, CommandGroup, CommandPaletteState, ScoredItem } from '../core/types'
import type { GroupedResult } from '../core/grouping'
import {
  DEFAULT_ASYNC_DEBOUNCE_MS,
  flattenAsyncItems,
  mergeAsyncCommands,
  shouldRunSource,
} from '../core/async-sources'
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

  // Async source state: per-source items, errors, and in-flight set
  const [asyncItemsBySource, setAsyncItemsBySource] = useState<Record<string, CommandItem[]>>({})
  const [asyncErrors, setAsyncErrors] = useState<Record<string, Error>>({})
  const [loadingSourceIds, setLoadingSourceIds] = useState<Set<string>>(() => new Set())

  // Per-source AbortController so we can cancel in-flight requests on new queries
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  // Subscribe to registry changes
  const commands = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot)

  // Determine which commands to search: root or nested children
  // At root depth we also inject async results from `config.asyncSources`.
  const activeCommands = useMemo(() => {
    if (activePath.length > 0) {
      const parent = activePath[activePath.length - 1]
      return parent.children ?? []
    }
    const asyncItems = flattenAsyncItems(asyncItemsBySource)
    return asyncItems.length === 0 ? commands : mergeAsyncCommands(commands, asyncItems)
  }, [commands, activePath, asyncItemsBySource])

  // Drive async sources: debounce per source, cancel on query change.
  // Only fires at root depth — nested menus already have their commands inline.
  useEffect(() => {
    const sources = config.asyncSources
    if (!sources || sources.length === 0) return
    if (activePath.length > 0) return

    // Abort any previously running loaders before scheduling new ones.
    for (const controller of abortControllersRef.current.values()) {
      controller.abort()
    }
    abortControllersRef.current.clear()

    const timers: Array<ReturnType<typeof setTimeout>> = []

    for (const source of sources) {
      // If the trigger predicate rejects this query, clear any prior results
      // for this source and skip scheduling.
      if (!shouldRunSource(source, searchQuery)) {
        setAsyncItemsBySource((prev) => {
          if (!(source.id in prev)) return prev
          const next = { ...prev }
          delete next[source.id]
          return next
        })
        continue
      }

      const delay = source.debounceMs ?? DEFAULT_ASYNC_DEBOUNCE_MS
      const timer = setTimeout(() => {
        const controller = new AbortController()
        abortControllersRef.current.set(source.id, controller)
        setLoadingSourceIds((prev) => {
          if (prev.has(source.id)) return prev
          const next = new Set(prev)
          next.add(source.id)
          return next
        })

        Promise.resolve()
          .then(() => source.load(searchQuery, controller.signal))
          .then((items) => {
            if (controller.signal.aborted) return
            setAsyncItemsBySource((prev) => ({ ...prev, [source.id]: items }))
            setAsyncErrors((prev) => {
              if (!(source.id in prev)) return prev
              const next = { ...prev }
              delete next[source.id]
              return next
            })
          })
          .catch((err) => {
            if (controller.signal.aborted) return
            const error = err instanceof Error ? err : new Error(String(err))
            console.error(`[cmdk-engine] async source "${source.id}" failed:`, error)
            setAsyncErrors((prev) => ({ ...prev, [source.id]: error }))
          })
          .finally(() => {
            if (controller.signal.aborted) return
            abortControllersRef.current.delete(source.id)
            setLoadingSourceIds((prev) => {
              if (!prev.has(source.id)) return prev
              const next = new Set(prev)
              next.delete(source.id)
              return next
            })
          })
      }, delay)
      timers.push(timer)
    }

    return () => {
      for (const timer of timers) clearTimeout(timer)
    }
  }, [searchQuery, activePath, config.asyncSources])

  // Cleanup: abort any in-flight loaders when the hook unmounts.
  useEffect(() => {
    return () => {
      for (const controller of abortControllersRef.current.values()) {
        controller.abort()
      }
      abortControllersRef.current.clear()
    }
  }, [])

  // Pipeline: enrich → filter access → search → rank by frecency → context boost
  const results = useMemo<ScoredItem[]>(() => {
    // 1. Enrich with synonyms
    const enriched = keywords.enrichAll(activeCommands)

    // 2. Filter by access control
    const accessible = accessFilter ? accessFilter(enriched) : enriched

    // 3. Search
    const searched = search.search(searchQuery, accessible)

    // 4. Rank by frecency
    if (searchQuery.trim()) {
      let ranked = frecency.rank(searched, 0.3)

      // 4b. Context boost (only during search, not empty state)
      if (config.context) {
        ranked = contextEngine.boost(ranked, config.context)
        // Re-sort after boosting
        ranked.sort((a, b) => b.score - a.score)
      }

      return ranked
    }

    // 5. Inject "Recent" group when search is empty
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
    isLoading: loadingSourceIds.size > 0,
    asyncErrors,
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
