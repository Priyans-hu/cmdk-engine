# cmdk-engine

The smart command palette engine for React. Built on [cmdk](https://github.com/pacocoursey/cmdk). Auto-discover routes, fuzzy search with synonyms, RBAC filtering, frecency ranking, CLI tooling — all in < 5KB.

[![npm version](https://img.shields.io/npm/v/cmdk-engine.svg)](https://www.npmjs.com/package/cmdk-engine)
[![npm downloads](https://img.shields.io/npm/dm/cmdk-engine.svg)](https://www.npmjs.com/package/cmdk-engine)
[![license](https://img.shields.io/npm/l/cmdk-engine.svg)](https://github.com/Priyans-hu/cmdk-engine/blob/main/LICENSE)

---

## Why cmdk-engine?

[cmdk](https://cmdk.paco.me) gives you beautiful, accessible command menu primitives. But building a production command palette requires more:

| Feature | cmdk | cmdk-engine |
|---------|------|-------------|
| Composable UI components | Yes | Yes (via cmdk adapter) |
| Route auto-discovery | No | Yes — CLI scanner + runtime adapters |
| RBAC / permission filtering | No | Yes — any/all modes |
| Frecency ranking | No | Yes — exponential decay algorithm |
| Keyword synonyms | No | Yes — bidirectional, ranked below direct matches |
| Smart route exclusion | No | Yes — auth, error, dynamic routes auto-filtered |
| Deterministic sorting | [Broken (#264, #375)](https://github.com/pacocoursey/cmdk/issues/264) | Yes — frecency > priority > alphabetical |
| First item auto-select | [Broken (#280)](https://github.com/pacocoursey/cmdk/issues/280) | Yes — auto-selects on every result update |
| Dynamic content updates | [Broken (#267)](https://github.com/pacocoursey/cmdk/issues/267) | Yes — reactive pub/sub registry |
| CLI tooling | No | Yes — scan, init, validate |
| Framework-agnostic core | No | Yes — zero runtime deps |

**cmdk-engine owns all filtering** (`shouldFilter={false}`), solving the sorting and selection bugs in cmdk while keeping its composable UI primitives.

---

## Installation

### Library (for React projects)

```bash
# npm
npm install cmdk-engine cmdk

# bun
bun add cmdk-engine cmdk

# pnpm
pnpm add cmdk-engine cmdk

# yarn
yarn add cmdk-engine cmdk
```

> **Peer dependencies (all optional — install only what you use):** `react`,
> `react-dom`, `cmdk` (for the cmdk adapter), `match-sorter` (for the
> match-sorter search backend), and `react-router` / `react-router-dom` (for
> the React Router adapter). The core engine (`cmdk-engine`) has zero runtime
> dependencies.

### Standalone CLI (no Node project required)

The `cmdk-engine` route scanner also ships as a standalone binary:

```bash
# Homebrew
brew install Priyans-hu/tap/cmdk-engine

# curl installer (macOS/Linux)
curl -fsSL https://raw.githubusercontent.com/Priyans-hu/cmdk-engine/main/install.sh | bash
```

---

## Quick Start

### 1. Wrap your app with the provider

```tsx
import { CommandEngineProvider } from 'cmdk-engine/react'

function App() {
  return (
    <CommandEngineProvider
      config={{
        synonyms: {
          billing: ['money', 'payment', 'credits'],
          settings: ['preferences', 'config', 'options'],
        },
      }}
    >
      <YourApp />
    </CommandEngineProvider>
  )
}
```

### 2. Register commands

```tsx
import { useCommandRegister } from 'cmdk-engine/react'
import { CreditCard } from 'lucide-react'

function BillingPage() {
  useCommandRegister([
    {
      id: 'billing-overview',
      label: 'Billing Overview',
      href: '/billing/overview',
      keywords: ['balance', 'credits'],
      group: 'Billing',
      icon: <CreditCard size={16} />, // React components, strings, or emoji
    },
  ])

  return <div>...</div>
}
```

### 3. Use the pre-wired cmdk adapter

```tsx
import { CommandPalette } from 'cmdk-engine/adapters/cmdk'

function CommandMenu() {
  return (
    <CommandPalette
      dialog
      placeholder="Type a command or search..."
      onSelect={(item) => {
        if (item.href) navigate(item.href)
        if (item.action) item.action(item)
      }}
    />
  )
}
```

Or use `config.onSelect` on the provider to handle all selections in one place:

```tsx
<CommandEngineProvider
  config={{
    onSelect: (item) => {
      if (item.href) navigate(item.href)
      if (item.action) item.action(item)
    },
  }}
>
```

### SPA navigation with `onNavigate`

If your commands mostly just navigate (`href`), skip the `onSelect` boilerplate
and pass `onNavigate` — it's called for any `href`-only command so you can route
without a full-page reload. `action` and `onSelect` still take priority; only
plain `href` commands fall through to `onNavigate` (and to `window.location`
when it's unset):

```tsx
const navigate = useNavigate() // react-router

<CommandEngineProvider config={{ onNavigate: (href) => navigate(href) }}>
```

### 4. Or build your own UI with hooks

```tsx
import { useCommandPalette } from 'cmdk-engine/react'

function CustomCommandMenu() {
  const { search, setSearch, groupedResults, isOpen, toggle, select } =
    useCommandPalette()

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      {groupedResults.map(({ group, items }) => (
        <div key={group.id}>
          <h3>{group.label}</h3>
          {items.map(({ item }) => (
            <button key={item.id} onClick={() => select(item)}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
```

> `select()` records frecency + search history, runs `onSelect` → `action` →
> `onNavigate`/`href`, and closes the palette — all in one call.

---

## React Router Integration

Auto-discover routes from your React Router config:

```tsx
import { scanRoutes } from 'cmdk-engine/adapters/react-router'
import { useCommandRegister } from 'cmdk-engine/react'

const commands = scanRoutes(routeConfig)

function App() {
  useCommandRegister(commands)
  return <RouterProvider router={router} />
}
```

### Smart defaults

The scanner automatically:
- **Excludes auth routes** — `/login`, `/signup`, `/forgot-password`, `/oauth/callback`, etc.
- **Excludes error pages** — `/404`, `/500`, `/error`, `/not-found`
- **Skips dynamic routes** — `/users/:id`, `/billing/:uuid` (can't navigate without a real ID)
- **Derives labels** from the path — `/billing/overview` → "Overview"
- **Derives groups** from the first segment — `/billing/overview` → group "Billing"

### Scanner options

```tsx
const commands = scanRoutes(routeConfig, {
  exclude: ['/admin/*', /^\/debug\//, '/internal'],  // string, glob, or regex
  noDefaultExclude: false,   // set true to skip default auth/error exclusion
  includeDynamic: false,     // set true to include :id routes
})
```

### Route metadata

Enrich routes with metadata using the `handle` convention:

```tsx
{
  path: '/billing/overview',
  handle: {
    command: {
      label: 'Billing Dashboard',
      keywords: ['money', 'payment'],
      group: 'Billing',
      icon: <CreditCard size={16} />,
      priority: 10,
    }
  },
  element: <BillingOverview />,
}
```

Routes with `handle.command` are always included, even if they have dynamic segments. The scanner also falls back to `route.title` and `route.icon` if `handle.command` doesn't define them.

---

## RBAC / Access Control

Filter commands based on user permissions:

```tsx
import { createSimpleAccessProvider } from 'cmdk-engine'

<CommandEngineProvider
  config={{
    accessControl: createSimpleAccessProvider(['admin.view', 'billing.read']),
    accessCheckMode: 'any', // user needs ANY listed permission
  }}
>
```

Commands with `permissions: ['admin.view']` will only show for users who have that permission.

### Per-command access mode

`accessCheckMode` is the engine-wide default, but any command can override it —
useful when most commands need *any* of their permissions but a few sensitive
ones need *all*:

```tsx
useCommandRegister([
  // Uses the engine default ('any')
  { id: 'reports', label: 'Reports', permissions: ['reports.view', 'admin'] },
  // Overrides to require ALL permissions for this one command
  { id: 'delete-org', label: 'Delete Org', permissions: ['org.admin', 'billing.owner'], accessMode: 'all' },
])
```

### Dynamic visibility (`when`)

Static `permissions` cover role-based access. For everything else — feature
flags, plan tiers, org type, A/B gates — use `when`. A command whose `when`
resolves to `false` is removed entirely (not searchable, not browsable):

```tsx
useCommandRegister([
  { id: 'beta-tool', label: 'Beta Tool', when: () => flags.betaEnabled },
  { id: 'enterprise', label: 'SSO Settings', when: () => org.plan === 'enterprise' },
], [flags.betaEnabled, org.plan])
```

> `permissions` (+ `accessMode`) and `when` compose: a command must pass both.
> `hidden: true` is different again — it keeps a command out of the empty-query
> browse list but still lets a matching query find it.

> **Note:** access filtering is a UI concern, not a security boundary. Always
> enforce permissions server-side.

---

## Frecency Ranking

Commands you use frequently and recently appear higher in results. No configuration needed — it uses localStorage by default. When you use `select()`, frecency is recorded automatically.

The algorithm uses exponential decay with a configurable half-life:

```
score = count * 2^(-timeSinceLastUse / halfLife)
```

### Recent commands

Show a "Recent" group at the top of the palette when the search is empty:

```tsx
<CommandEngineProvider
  config={{
    frecency: {
      showRecent: true,     // inject "Recent" group when search is empty
      recentCount: 5,       // number of recent items (default: 5)
      recentLabel: 'Recent', // group label (default: "Recent")
    },
  }}
>
```

> Frecency (and search history, below) persist to `localStorage` by default and
> degrade to in-memory automatically during SSR. Override the backend via
> `config.frecency.storage`.

---

## Context / Scope Boosting

Commands with a `scope` are boosted when they match the current app context —
so on `/billing`, billing commands rank higher:

```tsx
<CommandEngineProvider
  config={{
    context: { path: location.pathname, tags: ['billing'] },
    contextBoostWeight: 0.2, // 0–1, default 0.2
  }}
>

// A command relevant to the billing area:
{ id: 'add-card', label: 'Add Card', scope: ['/billing', '/billing/*'] }
```

## Internationalization (i18n)

All built-in UI strings go through a translation function. Pass your own to
localize the placeholder, empty state, "Recent" heading, accessible labels, etc:

```tsx
import { getTranslationKeys } from 'cmdk-engine'

<CommandEngineProvider
  config={{ t: (key) => myDictionary[key] ?? key }}
>

// getTranslationKeys() lists every key the engine uses.
```

## Search History

Opt-in tracking of past queries (persisted to `localStorage`):

```tsx
import { useSearchHistory } from 'cmdk-engine/react'

<CommandEngineProvider
  config={{ searchHistory: { enabled: true, maxEntries: 20, minQueryLength: 2 } }}
>

function RecentSearches() {
  const { getRecent, remove, clear } = useSearchHistory()
  return <>{getRecent(5).map((e) => <button key={e.query} onClick={() => setSearch(e.query)}>{e.query}</button>)}</>
}
```

---

## CLI Tool

Auto-discover routes and generate sitemaps for your command palette.

### Setup

```bash
# Initialize config
npx cmdk-engine init

# Scan routes
npx cmdk-engine scan

# Scan without default auth/error exclusions
npx cmdk-engine scan --no-default-exclude

# Validate config
npx cmdk-engine validate
```

### Smart defaults

The CLI scanner shares the same default exclusion list as the runtime
React Router adapter, so the generated sitemap automatically skips:
- **Auth routes** — `/login`, `/logout`, `/signup`, `/signin`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
- **OAuth callbacks** — `/oauth/callback`, `/auth/callback`, `/callback`
- **Error pages** — `/404`, `/500`, `/error`, `/not-found`

Pass `--no-default-exclude` to opt out (you'll have full control via
the `exclude` config field instead).

### Config file

```ts
// cmdk-engine.config.ts
import { defineConfig } from 'cmdk-engine'

export default defineConfig({
  framework: 'react-router', // or 'nextjs-app', 'nextjs-pages'
  routesDir: './src/routes',
  output: './src/generated/command-routes.json',
  overrides: {
    '/billing': { keywords: ['money', 'payment'], group: 'Billing' },
  },
  exclude: ['/_*', '/admin/*', /^\/debug\//], // strings, globs, or RegExp
  synonyms: {
    billing: ['money', 'payment', 'credits'],
  },
})
```

> **Next.js:** the CLI **scans** both the App Router (`nextjs-app`) and Pages
> Router (`nextjs-pages`) to generate a sitemap. A dedicated Next.js *runtime*
> adapter is not implemented yet — render commands with `<CommandPalette>` from
> `cmdk-engine/adapters/cmdk` (mark the file `'use client'`).

### Pre-commit hook

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npx cmdk-engine scan && git add src/generated/command-routes.json"
    }
  }
}
```

### GitHub Actions

```yaml
- run: npx cmdk-engine scan
- run: npx cmdk-engine validate
```

---

## Architecture

```
Route Config ─→ Route Adapter ─→ Command Registry ─→ Keyword Engine
                                       │
                                       ├─→ Access Control Filter
                                       │
                                       ├─→ Search Engine (fuzzy / match-sorter)
                                       │
                                       └─→ Frecency Ranking
                                              │
                                              ▼
                                      Headless API / Hooks
                                              │
                                              ▼
                                      UI Adapter (cmdk)
```

### Package Entry Points

| Import | Size | Purpose |
|--------|------|---------|
| `cmdk-engine` | ~4KB | Core engine (types, registry, search, keywords, access control, frecency) |
| `cmdk-engine/react` | ~2KB | React hooks (provider, useCommandPalette, useCommandRegister) |
| `cmdk-engine/adapters/cmdk` | ~1KB | Pre-wired cmdk components |
| `cmdk-engine/adapters/react-router` | ~1KB | React Router v6/v7 route scanner |
| `cmdk-engine/search/match-sorter` | ~1KB | Optional match-sorter search backend |

All entry points are tree-shakeable. The core has **zero runtime dependencies**.

---

## API Reference

### Core

```ts
import {
  createRegistry,        // Command store (pub/sub, useSyncExternalStore compatible)
  createFuzzySearch,     // Built-in lightweight fuzzy search
  createKeywordEngine,   // Synonym expansion + user aliases
  createAccessFilter,    // RBAC filter (any/all modes)
  createSimpleAccessProvider, // Permission provider from array/Set
  createFrecencyEngine,  // Frecency ranking with exponential decay
  createGroupManager,    // Command group management
  defineConfig,          // Typed config helper for CLI
} from 'cmdk-engine'
```

### React

```ts
import {
  CommandEngineProvider, // Context provider
  useCommandPalette,    // Main hook: search + filter + rank
  useCommandRegister,   // Register commands from components
  useFrecency,          // Direct frecency access
} from 'cmdk-engine/react'
```

### Adapters

```ts
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'
import { scanRoutes } from 'cmdk-engine/adapters/react-router'
```

### Key hook return values

```ts
const {
  search,          // Current query
  setSearch,       // Update query
  results,         // ScoredItem[] (flat)
  flatResults,     // Same as results
  groupedResults,  // GroupedResult[] — results grouped by group
  groups,          // CommandGroup[] — active groups
  isOpen,          // Palette visibility
  open, close, toggle,
  select,          // Select a command (records frecency + runs handler + closes)
  recordUsage,     // Record frecency manually
} = useCommandPalette()
```

---

## Type Safety

All types are exported and fully documented:

```ts
import type {
  CommandItem,
  CommandRegistry,
  SearchEngine,
  ScoredItem,
  GroupedResult,
  GroupedResults,
  AccessControlProvider,
  FrecencyOptions,
  RecentCommandsConfig,
  CommandGroup,
  SynonymMap,
  RouteCommandMeta,
  CmdkEngineConfig,
  CommandEngineConfig,
  CommandPaletteState,
} from 'cmdk-engine'
```

---

## cmdk Issues We Solve

| Issue | Description | How We Fix It |
|-------|-------------|---------------|
| [#264](https://github.com/pacocoursey/cmdk/issues/264) | Sort not restored after clearing search | We own filtering; restore original order when query is empty |
| [#280](https://github.com/pacocoursey/cmdk/issues/280) | First item not selected with dynamic content | Auto-select first item after each render cycle |
| [#375](https://github.com/pacocoursey/cmdk/issues/375) | Non-deterministic sorting | Deterministic: frecency → priority → alphabetical |
| [#267](https://github.com/pacocoursey/cmdk/issues/267) | Items not updating on async changes | Reactive pub/sub registry; items update immediately |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

[MIT](./LICENSE) &copy; [Priyanshu](https://github.com/Priyans-hu)

---

If you find cmdk-engine useful, please consider giving it a star on GitHub. It helps others discover the project.
