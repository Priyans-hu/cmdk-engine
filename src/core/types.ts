import type { ReactNode } from 'react'
import type { ExcludePattern } from './route-defaults'

// ============================================================
// Command Definition
// ============================================================

/** A single command item in the palette */
export interface CommandItem {
  /** Unique identifier */
  id: string
  /** Display label shown in the palette */
  label: string
  /** Optional description text */
  description?: string
  /** Icon — string, emoji, or React element (e.g. `<Settings size={16} />`) */
  icon?: ReactNode
  /** Additional search terms for fuzzy matching */
  keywords?: string[]
  /** Group this command belongs to */
  group?: string
  /** Manual ordering weight (higher = appears first) */
  priority?: number
  /** Navigation target URL/path for route commands */
  href?: string
  /** Execution callback when command is selected */
  action?: (item: CommandItem) => void | Promise<void>
  /** Whether this command is disabled */
  disabled?: boolean
  /** Hidden from results but still searchable */
  hidden?: boolean
  /** Required permissions to see this command */
  permissions?: string[]
  /**
   * Per-command access check mode, overriding the engine-wide `accessCheckMode`.
   * 'any' = user needs any listed permission, 'all' = needs all of them.
   */
  accessMode?: AccessCheckMode
  /**
   * Dynamic visibility gate. When it resolves to `false`, the command is
   * removed entirely (not searchable, not browsable) — use for feature flags,
   * plan/org gating, or any runtime condition beyond static `permissions`.
   * A function is re-evaluated whenever results are recomputed.
   */
  when?: boolean | (() => boolean)
  /** Keyboard shortcut display (e.g., ["g", "h"]) */
  shortcut?: string[]
  /** Extensible metadata for consumer use */
  meta?: Record<string, unknown>
  /** Scopes where this command is most relevant (e.g., ['/billing', '/billing/*']) */
  scope?: string[]
  /** Child commands for nested/hierarchical menus */
  children?: CommandItem[]
  /** Parent command ID (set automatically when flattening) */
  parentId?: string
}

// ============================================================
// Registry
// ============================================================

/** Command registry — the central store for all commands */
export interface CommandRegistry {
  /** Register a single command. Returns an unregister function. */
  register(command: CommandItem): () => void
  /** Register multiple commands. Returns an unregister function for all. */
  registerMany(commands: CommandItem[]): () => void
  /** Update a command by ID with partial fields (the `id` itself is immutable) */
  update(id: string, partial: Partial<Omit<CommandItem, 'id'>>): void
  /** Remove a command by ID */
  unregister(id: string): void
  /** Get all registered commands */
  getAll(): CommandItem[]
  /** Get a command by ID */
  getById(id: string): CommandItem | undefined
  /** Get commands in a specific group */
  getByGroup(groupId: string): CommandItem[]
  /** Subscribe to changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void
  /** Get a stable snapshot for useSyncExternalStore */
  getSnapshot(): CommandItem[]
}

// ============================================================
// Search
// ============================================================

/** A search engine implementation */
export interface SearchEngine {
  /** Search items against a query string. Returns scored results. */
  search(query: string, items: CommandItem[]): ScoredItem[]
}

/** A command item with a relevance score */
export interface ScoredItem {
  /** The matched command item */
  item: CommandItem
  /** Relevance score from 0 (worst) to 1 (best match) */
  score: number
}

// ============================================================
// Access Control
// ============================================================

/** Interface for checking user permissions */
export interface AccessControlProvider {
  /** Check if user has a specific permission */
  hasPermission(permission: string): boolean
  /** Check if user has ANY of the given permissions */
  hasAnyPermission(permissions: string[]): boolean
  /** Check if user has ALL of the given permissions */
  hasAllPermissions(permissions: string[]): boolean
}

/** Access control check mode */
export type AccessCheckMode = 'any' | 'all'

// ============================================================
// Frecency
// ============================================================

/** A single frecency tracking entry */
export interface FrecencyEntry {
  /** Command ID */
  id: string
  /** Number of times used */
  count: number
  /** Unix timestamp of last use */
  lastUsed: number
  /** Decayed score based on frequency + recency */
  halfLifeScore: number
}

/** Storage backend for frecency data */
export interface FrecencyStorage {
  /** Get entry by key */
  get(key: string): FrecencyEntry | null
  /** Set entry */
  set(key: string, entry: FrecencyEntry): void
  /** Remove an entry by key (optional; cleanup falls back to zeroing without it) */
  delete?(key: string): void
  /** Get all entries */
  getAll(): FrecencyEntry[]
  /** Clear all entries */
  clear(): void
}

/** Frecency engine configuration */
export interface FrecencyOptions {
  /** Storage backend (defaults to localStorage) */
  storage?: FrecencyStorage
  /** localStorage key prefix (default: 'cmdk-frecency') */
  storageKey?: string
  /** Max age in days before entries are removed (default: 30) */
  maxAge?: number
  /** Half-life in days for exponential decay (default: 7) */
  halfLife?: number
}

// ============================================================
// Groups
// ============================================================

/** A command group definition */
export interface CommandGroup {
  /** Unique group identifier */
  id: string
  /** Display label for the group */
  label: string
  /** Rendering priority (higher = rendered first) */
  priority?: number
  /** Optional icon for the group */
  icon?: ReactNode
}

// ============================================================
// Keywords / Synonyms
// ============================================================

/** Map of keyword → synonyms */
export interface SynonymMap {
  [keyword: string]: string[]
}

// ============================================================
// Route Adapter
// ============================================================

/** Metadata for a route command, colocated in route definitions */
export interface RouteCommandMeta {
  /** Display label (falls back to path-derived label) */
  label?: string
  /** Description text */
  description?: string
  /** Additional search keywords */
  keywords?: string[]
  /** Group ID */
  group?: string
  /** Icon — string, emoji, or React element */
  icon?: ReactNode
  /** Required permissions */
  permissions?: string[]
  /** Ordering priority */
  priority?: number
  /** Whether to hide from palette */
  hidden?: boolean
}

// ============================================================
// CLI Config
// ============================================================

/** Configuration file shape for cmdk-engine.config.ts */
export interface CmdkEngineConfig {
  /** Framework to scan (auto-detected if not set) */
  framework?: 'react-router' | 'nextjs-app' | 'nextjs-pages' | 'custom'
  /** Directory to scan for routes */
  routesDir?: string
  /** Output file for generated route map */
  output?: string
  /** Custom keyword/metadata overrides per route path */
  overrides?: Record<string, Partial<RouteCommandMeta>>
  /** Route paths/patterns to exclude (exact string, glob with `*`, or RegExp) */
  exclude?: ExcludePattern[]
  /** Synonym dictionary */
  synonyms?: SynonymMap
}

/** Generated route sitemap entry */
export interface SitemapRoute {
  /** Unique route ID */
  id: string
  /** Route path */
  path: string
  /** Display label */
  label: string
  /** Search keywords */
  keywords: string[]
  /** Group name */
  group?: string
  /** Source file path */
  source?: string
}

/** Full generated sitemap output */
export interface Sitemap {
  /** Schema version */
  version: number
  /** Generation timestamp (ISO 8601) */
  generatedAt: string
  /** Detected framework */
  framework: string
  /** All discovered routes */
  routes: SitemapRoute[]
}

// ============================================================
// Context / Scope
// ============================================================

/** Current app context for scope-aware command boosting */
export interface CommandContext {
  /** Current path/URL (e.g., '/billing/overview') */
  path?: string
  /** Current page/section tags for matching */
  tags?: string[]
}

// ============================================================
// i18n
// ============================================================

/** Translation function — maps a key to a localized string */
export type TranslationFn = (key: string, params?: Record<string, string | number>) => string

// ============================================================
// Search History
// ============================================================

/** A recorded search query */
export interface SearchHistoryEntry {
  /** The search query string */
  query: string
  /** Timestamp when the search was performed */
  timestamp: number
  /** Number of results returned */
  resultCount: number
}

/** Configuration for search history tracking */
export interface SearchHistoryConfig {
  /** Enable search history tracking (default: false) */
  enabled?: boolean
  /** Maximum history entries to keep (default: 20) */
  maxEntries?: number
  /** localStorage key prefix (default: 'cmdk-search-history') */
  storageKey?: string
  /** Minimum query length to record (default: 2) */
  minQueryLength?: number
}

// ============================================================
// Palette State (used by React hooks)
// ============================================================

/** Full command palette state */
export interface CommandPaletteState {
  /** Current search query */
  search: string
  /** Filtered and ranked results */
  results: ScoredItem[]
  /** Available groups (only groups with visible items) */
  groups: CommandGroup[]
  /** Whether the palette is open */
  isOpen: boolean
  /** Whether results are loading (async) */
  isLoading: boolean
  /** Breadcrumb trail of parent commands (for nested navigation) */
  breadcrumbs: CommandItem[]
  /** Current nesting depth (0 = root) */
  depth: number
}

// ============================================================
// Engine Config (React Provider)
// ============================================================

/** Configuration for the CommandEngine React provider */
export interface CommandEngineConfig {
  /** Custom search engine (defaults to built-in fuzzy search) */
  searchEngine?: SearchEngine
  /** Access control provider for permission filtering */
  accessControl?: AccessControlProvider
  /** Access check mode: 'any' or 'all' permissions required */
  accessCheckMode?: AccessCheckMode
  /** Synonym dictionary for keyword expansion */
  synonyms?: SynonymMap
  /** Frecency configuration */
  frecency?: FrecencyOptions & RecentCommandsConfig
  /** Group definitions and ordering */
  groups?: CommandGroup[]
  /** Maximum results to return */
  maxResults?: number
  /** Centralized handler when a command is selected. Auto-records frecency. */
  onSelect?: (item: CommandItem) => void
  /**
   * Navigation handler for commands that only specify an `href` (no `action`
   * or `onSelect`). Use your router here (e.g. `navigate(href)`) to avoid a
   * full-page reload. Falls back to `window.location.href` when unset.
   */
  onNavigate?: (href: string, item: CommandItem) => void
  /** Current context for scope-aware command boosting */
  context?: CommandContext
  /** Boost weight for in-scope commands (0-1, default: 0.2) */
  contextBoostWeight?: number
  /** Translation function for UI strings (defaults to English) */
  t?: TranslationFn
  /** Locale for collation-aware operations (default: 'en') */
  locale?: string
  /** Search history configuration */
  searchHistory?: SearchHistoryConfig
}

/** Configuration for the "Recent" commands group */
export interface RecentCommandsConfig {
  /** Show a "Recent" group when search is empty (default: false) */
  showRecent?: boolean
  /** Number of recent items to show (default: 5) */
  recentCount?: number
  /** Label for the recent group (default: "Recent") */
  recentLabel?: string
}

// ============================================================
// Helpers
// ============================================================

/** Helper to define a cmdk-engine config file with type checking */
export function defineConfig(config: CmdkEngineConfig): CmdkEngineConfig {
  return config
}
