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

// Utils
export { pathToLabel, pathToGroup, pathToId, pathSegmentToLabel } from './utils'
