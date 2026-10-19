# cmdk-engine API (0.6)

Names below match the package exports. The full guide is [GUIDE.md](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md).

## Entry points

| Import from | Exports |
|---|---|
| `cmdk-engine` | Types (`CommandItem`, `CommandEngineConfig`, `CommandGroup`, `AsyncSource`, `CommandPaletteEvent`, `SynonymMap`, `ScoredItem`, ...), `createSimpleAccessProvider`, `createFuzzySearch`, `createLocalStorageFrecencyStorage`, `createInMemoryStorage`, `isCommandVisible`, `filterVisible`, `pathToId`, `pathToLabel`, `pathToGroup`, `defineConfig` and the lower-level `create*` engines |
| `cmdk-engine/react` | `CommandEngineProvider`, `useCommandRegister`, `useCommandPalette`, `usePaletteState`, `useEngineContext`, `useFrecency`, `useSearchHistory`, `useCommandContext`, `useCommandPaletteEvents` |
| `cmdk-engine/adapters/cmdk` | `CommandPalette`, `useCommandPaletteShortcut` (needs `cmdk` ^1) |
| `cmdk-engine/adapters/base-ui` | The same two, built on Base UI (needs `@base-ui/react` ^1.1) |
| `cmdk-engine/adapters/react-router` | `scanRoutes(routes, options?)` |
| `cmdk-engine/adapters/sitemap` | `sitemapToCommands(sitemap, { params? })` |
| `cmdk-engine/search/match-sorter` | `createMatchSorterSearch({ threshold?, keys? })` (needs `match-sorter` 7 or 8) |

## `CommandItem`

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Required, unique, stable (frecency key) |
| `label` | `string` | Required |
| `description` | `string` | Searched, shown under the label |
| `icon` | `ReactNode` | String, emoji or element |
| `keywords` | `string[]` | Extra search terms |
| `group` | `string` | Heading, or the `id` of a configured group |
| `priority` | `number` | Higher first |
| `href` | `string` | Passed to `onNavigate` when there is no `action` |
| `action` | `(item) => void \| Promise<void>` | Runs on select |
| `disabled`, `hidden` | `boolean` | `hidden`: left out of the empty-query list, still searchable |
| `when` | `boolean \| (() => boolean)` | `false` removes the command entirely |
| `permissions` | `string[]` | Checked against `accessControl` |
| `accessMode` | `'any' \| 'all'` | Overrides `accessCheckMode` for this command |
| `shortcut` | `string[]` | Display only |
| `scope` | `string[]` | Paths, globs (`/billing/*`) or tags boosted by `context` |
| `children` | `CommandItem[]` | Sub-menu; the parent never runs its own `action` |
| `meta` | `Record<string, unknown>` | Free-form |

## `CommandEngineConfig` (the provider's `config` prop)

| Option | Notes |
|---|---|
| `onNavigate(href, item)` | Router navigation for `href` commands; defaults to a full page load |
| `onSelect(item)` | Replaces `action` and `onNavigate` for every command |
| `onSelectError(error, item)` | Called when a handler throws or rejects |
| `groups` | `CommandGroup[]`: `{ id, label, priority?, icon? }` |
| `maxResults` | Default 50 |
| `synonyms` | `{ billing: ['money', 'payment'] }`, both ways |
| `searchEngine` | Any `{ search(query, items) }`; default built-in fuzzy search |
| `frecency` | `{ enabled?, storage?, storageKey? ('cmdk-frecency'), halfLife? (7 days), maxAge? (30 days), showRecent?, recentCount? (5), recentLabel? }` |
| `accessControl`, `accessCheckMode` | `createSimpleAccessProvider(string[] \| Set<string>)`; mode `'any'` (default) or `'all'` |
| `context`, `contextBoostWeight` | `{ path?, tags? }` boosts matching `scope`; weight 0 to 1, default 0.2 |
| `asyncSources` | `{ id, load(query, { signal }), trigger?, debounceMs? (200), shouldFilter? (true), maxResults? (10), group? }[]` |
| `searchHistory` | `{ enabled?, maxEntries? (20), storageKey?, minQueryLength? (2) }` |
| `t` | `(key, params?) => string` for UI strings; keys from `getTranslationKeys()` |

## `CommandPalette` props

All optional; both adapters take the same props, except `vimBindings` (cmdk only, default `true`).

`dialog` (default `false`, inline), `placeholder`, `label`, `loop` (default `true`), `onSelect`, `renderItem(item, score)`, `renderGroupHeading(group)`, `renderEmpty()`, `renderLoading()`, `renderBreadcrumbs(crumbs, onBack)`, `footer`, `container` (portal target), `disablePointerSelection`, and the class names `className`, `inputClassName`, `listClassName`, `itemClassName`, `groupClassName`, `emptyClassName`, `overlayClassName`, `contentClassName`.

## Hooks

- `useCommandRegister(commands, deps?)`: registers while mounted.
- `useCommandPaletteShortcut(shortcut?)`: `'k'` by default, or `(e: KeyboardEvent) => boolean`; returns `{ isOpen, toggle }`. Call once.
- `useCommandPalette()`: for a custom UI. Returns `search`, `setSearch`, `results`, `groupedResults` (`{ group, items }[]`), `groups`, `isOpen`, `isLoading`, `asyncErrors`, `breadcrumbs`, `depth`, `open`, `close`, `toggle`, `select(itemOrId, { onSelect? })`, `drillDown`, `drillUp`, `resetPath`, `recordUsage`. Each call runs the search pipeline; for the open state alone, use `usePaletteState()`.
- `usePaletteState()`: the shared `isOpen`, `setIsOpen`, `search`, `setSearch`, `activePath`, `setActivePath`, without the pipeline.
- `useCommandPaletteEvents(onEvent)`: events `open`, `close`, `search` (`query`, `resultCount`), `select` (`item`, `query`), `asyncError`.
- `useFrecency()`: `recordUsage`, `getScore`, `getRecent`, `clear`.
- `useSearchHistory()`: `getRecent`, `clear`, `remove` (needs `searchHistory: { enabled: true }`).

## Route discovery

- `scanRoutes(routes, { exclude?, noDefaultExclude?, includeDynamic? })`: one command per React Router route. Auth, error and dynamic routes are skipped by default. Per-route metadata goes in `handle: { command: { label, description, keywords, group, icon, permissions, priority, hidden } }`.
- CLI (in the installed package): `npx cmdk-engine init` writes `cmdk-engine.config.ts`, `npx cmdk-engine scan` writes `src/generated/command-routes.json` (React Router, Next.js App and Pages Router), `npx cmdk-engine validate` checks the config. `--include-dynamic locale` keeps `[locale]` routes; fill them with `sitemapToCommands(sitemap, { params: { locale } })`.
