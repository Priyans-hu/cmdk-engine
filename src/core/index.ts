// Core types
export type {
  CommandItem,
  CommandRegistry,
  SearchEngine,
  ScoredItem,
  AccessControlProvider,
  AccessCheckMode,
  FrecencyEntry,
  FrecencyStorage,
  FrecencyOptions,
  CommandGroup,
  SynonymMap,
  RouteCommandMeta,
  CmdkEngineConfig,
  SitemapRoute,
  Sitemap,
  CommandPaletteState,
  CommandEngineConfig,
  RecentCommandsConfig,
  CommandContext,
  TranslationFn,
  SearchHistoryEntry,
  SearchHistoryConfig,
  AsyncSource,
} from './types'

// Config helper
export { defineConfig } from './types'

// Registry
export { createRegistry } from './registry'

// Search
export { createFuzzySearch } from './search'

// Keywords
export { createKeywordEngine } from './keywords'

// Access Control
export { createAccessFilter, createSimpleAccessProvider } from './access-control'

// Frecency
export { createFrecencyEngine, createInMemoryStorage } from './frecency'
export { createLocalStorageFrecencyStorage } from './frecency-storage'

// Grouping
export { createGroupManager } from './grouping'
export type { GroupedResult, GroupedResults } from './grouping'

// Context / Scope
export { createContextEngine } from './context'

// i18n
export { createDefaultTranslation, getTranslationKeys } from './i18n'

// Search History
export { createSearchHistory, createInMemorySearchHistory } from './search-history'

// Async Sources
export {
  DEFAULT_ASYNC_DEBOUNCE_MS,
  defaultTrigger,
  shouldRunSource,
  mergeAsyncCommands,
  flattenAsyncItems,
} from './async-sources'

// Utils
export { pathToLabel, pathToGroup, pathToId, pathSegmentToLabel } from './utils'
