import { createContext, useContext, useRef, useMemo, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { CommandEngineConfig, CommandItem, CommandRegistry, TranslationFn } from '../core/types'
import { createRegistry } from '../core/registry'
import { createFuzzySearch } from '../core/search'
import { createKeywordEngine } from '../core/keywords'
import { createAccessFilter } from '../core/access-control'
import { createFrecencyEngine, createInMemoryStorage } from '../core/frecency'
import { createLocalStorageFrecencyStorage } from '../core/frecency-storage'
import { createGroupManager } from '../core/grouping'
import { createContextEngine } from '../core/context'
import { createDefaultTranslation } from '../core/i18n'
import { createInMemorySearchHistory, createSearchHistory } from '../core/search-history'
import type { SearchEngine } from '../core/types'
import { AsyncSourcesContext, useAsyncSources } from './async-sources'

/** Internal engine context shape */
export interface EngineContextValue {
  registry: CommandRegistry
  search: SearchEngine
  keywords: ReturnType<typeof createKeywordEngine>
  accessFilter: ((items: CommandItem[]) => CommandItem[]) | null
  frecency: ReturnType<typeof createFrecencyEngine>
  groupManager: ReturnType<typeof createGroupManager>
  contextEngine: ReturnType<typeof createContextEngine>
  searchHistory: ReturnType<typeof createInMemorySearchHistory>
  t: TranslationFn
  config: CommandEngineConfig
}

const EngineContext = createContext<EngineContextValue | null>(null)

/**
 * Shared palette UI state. Lives on the provider (not per-hook-call) so that
 * every `useCommandPalette()` consumer and `useCommandPaletteShortcut()` read
 * and write the same open/search/navigation state.
 */
export interface PaletteStateValue {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  search: string
  setSearch: Dispatch<SetStateAction<string>>
  activePath: CommandItem[]
  setActivePath: Dispatch<SetStateAction<CommandItem[]>>
}

const PaletteStateContext = createContext<PaletteStateValue | null>(null)

// The same guard as the core storage helpers (which `cmdk-engine` does not
// export): reading `window.localStorage` throws in sandboxed iframes and when
// the browser blocks cookies, and it is missing during SSR.
function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

export interface CommandEngineProviderProps {
  children: ReactNode
  config?: CommandEngineConfig
}

/**
 * Provider that initializes the command engine and makes it available
 * to all child hooks (useCommandPalette, useCommandRegister).
 */
export function CommandEngineProvider({ children, config = {} }: CommandEngineProviderProps) {
  const registryRef = useRef<CommandRegistry | null>(null)
  if (!registryRef.current) {
    registryRef.current = createRegistry()
  }

  // Palette UI state is shared across all consumers under this provider.
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activePath, setActivePath] = useState<CommandItem[]>([])

  const paletteState = useMemo<PaletteStateValue>(
    () => ({ isOpen, setIsOpen, search, setSearch, activePath, setActivePath }),
    [isOpen, search, activePath],
  )

  // Async sources load here, once per query, not in each useCommandPalette().
  const asyncSources = useAsyncSources(
    config.asyncSources, search, activePath.length === 0, isOpen,
  )

  // Build the engine singletons from the specific config fields they depend on
  // (not the whole `config` object) so an inline config that only changes an
  // unrelated field — e.g. `context` on every route change — doesn't rebuild
  // the search/keyword/frecency engines on every render.
  const engines = useMemo(() => {
    const persist = canUseLocalStorage()
    return {
      search: config.searchEngine ?? createFuzzySearch(),
      keywords: createKeywordEngine(config.synonyms ?? {}),
      accessFilter: config.accessControl
        ? createAccessFilter(config.accessControl, config.accessCheckMode)
        : null,
      // Default to localStorage persistence so frecency survives reloads, as
      // documented, and to memory where storage is unavailable. Consumers can
      // still pass their own `frecency.storage`.
      frecency: createFrecencyEngine(
        config.frecency?.storage
          ? config.frecency
          : {
              ...config.frecency,
              storage: persist
                ? createLocalStorageFrecencyStorage(config.frecency?.storageKey)
                : createInMemoryStorage(),
            },
      ),
      groupManager: createGroupManager(config.groups),
      contextEngine: createContextEngine(config.contextBoostWeight),
      t: config.t ?? createDefaultTranslation(),
      // Persist search history to localStorage in the browser (so `storageKey`
      // works, as documented); fall back to in-memory where it is unavailable.
      searchHistory: persist
        ? createSearchHistory(config.searchHistory)
        : createInMemorySearchHistory(config.searchHistory),
    }
  }, [
    config.searchEngine, config.synonyms, config.accessControl, config.accessCheckMode,
    config.frecency, config.groups, config.contextBoostWeight, config.t, config.searchHistory,
  ])

  const value = useMemo<EngineContextValue>(
    () => ({ registry: registryRef.current!, ...engines, config }),
    [engines, config],
  )

  return (
    <EngineContext.Provider value={value}>
      <PaletteStateContext.Provider value={paletteState}>
        <AsyncSourcesContext.Provider value={asyncSources}>
          {children}
        </AsyncSourcesContext.Provider>
      </PaletteStateContext.Provider>
    </EngineContext.Provider>
  )
}

/**
 * Hook to access the engine context. Throws if used outside provider.
 */
export function useEngineContext(): EngineContextValue {
  const ctx = useContext(EngineContext)
  if (!ctx) {
    throw new Error('useEngineContext must be used within a <CommandEngineProvider>')
  }
  return ctx
}

/**
 * Hook to access the shared palette UI state. Throws if used outside provider.
 */
export function usePaletteState(): PaletteStateValue {
  const ctx = useContext(PaletteStateContext)
  if (!ctx) {
    throw new Error('usePaletteState must be used within a <CommandEngineProvider>')
  }
  return ctx
}
