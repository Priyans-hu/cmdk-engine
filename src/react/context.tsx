import React, { createContext, useContext, useRef, useMemo } from 'react'
import type { CommandEngineConfig, CommandItem, CommandRegistry, TranslationFn } from '../core/types'
import { createRegistry } from '../core/registry'
import { createFuzzySearch } from '../core/search'
import { createKeywordEngine } from '../core/keywords'
import { createAccessFilter } from '../core/access-control'
import { createFrecencyEngine } from '../core/frecency'
import { createGroupManager } from '../core/grouping'
import { createContextEngine } from '../core/context'
import { createDefaultTranslation } from '../core/i18n'
import { createInMemorySearchHistory } from '../core/search-history'
import type { SearchEngine } from '../core/types'

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

export interface CommandEngineProviderProps {
  children: React.ReactNode
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

  const value = useMemo<EngineContextValue>(() => {
    const search = config.searchEngine ?? createFuzzySearch()
    const keywords = createKeywordEngine(config.synonyms ?? {})
    const accessFilter = config.accessControl
      ? createAccessFilter(config.accessControl, config.accessCheckMode)
      : null
    const frecency = createFrecencyEngine(config.frecency)
    const groupManager = createGroupManager(config.groups)
    const contextEngine = createContextEngine(config.contextBoostWeight)
    const t = config.t ?? createDefaultTranslation()
    const searchHistory = createInMemorySearchHistory(config.searchHistory)

    return {
      registry: registryRef.current!,
      search,
      keywords,
      accessFilter,
      frecency,
      groupManager,
      contextEngine,
      searchHistory,
      t,
      config,
    }
  }, [config])

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>
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
