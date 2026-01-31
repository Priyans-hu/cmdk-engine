# cmdk-engine

The smart command palette engine for React. Built on [cmdk](https://github.com/pacocoursey/cmdk). Auto-discover routes, fuzzy search with synonyms, RBAC filtering, frecency ranking, CLI tooling — all in < 5KB.

[![npm version](https://img.shields.io/npm/v/cmdk-engine.svg)](https://www.npmjs.com/package/cmdk-engine)
[![npm downloads](https://img.shields.io/npm/dm/cmdk-engine.svg)](https://www.npmjs.com/package/cmdk-engine)
[![bundle size](https://img.shields.io/bundlephobia/minzip/cmdk-engine)](https://bundlephobia.com/package/cmdk-engine)
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
| Keyword synonyms | No | Yes — bidirectional synonym engine |
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

> `cmdk` and `react` are peer dependencies.

### CLI only (standalone, no Node.js required)

```bash
# Homebrew
brew install Priyans-hu/tap/cmdk-engine

# Or with tap
brew tap Priyans-hu/tap
brew install cmdk-engine

# Shell script
curl -fsSL https://raw.githubusercontent.com/Priyans-hu/cmdk-engine/main/install.sh | bash

# npx (requires Node.js)
npx cmdk-engine --help
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

function BillingPage() {
  useCommandRegister([
    {
      id: 'billing-overview',
      label: 'Billing Overview',
      href: '/billing/overview',
      keywords: ['balance', 'credits'],
      group: 'Billing',
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
        if (item.action) item.action()
      }}
    />
  )
}
```

### 4. Or build your own UI with hooks

```tsx
import { useCommandPalette } from 'cmdk-engine/react'

function CustomCommandMenu() {
  const { search, setSearch, results, groups, isOpen, toggle, recordUsage } =
    useCommandPalette()

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      {results.map(({ item, score }) => (
        <button
          key={item.id}
          onClick={() => {
            recordUsage(item.id)
            item.action?.()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
```

---

## React Router Integration

Auto-discover routes from your React Router config:

```tsx
import { scanRoutes } from 'cmdk-engine/adapters/react-router'
import { useCommandRegister } from 'cmdk-engine/react'

// Scan your route tree at startup
const commands = scanRoutes(routeConfig)

function App() {
  useCommandRegister(commands)
  return <RouterProvider router={router} />
}
```

Enrich routes with metadata using the `handle` convention:

```tsx
// In your route definition
{
  path: '/billing/overview',
  handle: {
    command: {
      label: 'Billing Dashboard',
      keywords: ['money', 'payment'],
      group: 'Billing',
      priority: 10,
    }
  },
  element: <BillingOverview />,
}
```

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

---

## Frecency Ranking

Commands you use frequently and recently appear higher in results. No configuration needed — it uses localStorage by default.

```tsx
const { recordUsage } = useCommandPalette()

// Record when user selects a command
recordUsage('billing-overview')
```

The algorithm uses exponential decay with a configurable half-life:

```
score = count * 2^(-timeSinceLastUse / halfLife)
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

# Validate config
npx cmdk-engine validate
```

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
  exclude: ['/404', '/500', '/_*'],
  synonyms: {
    billing: ['money', 'payment', 'credits'],
  },
})
```

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

---

## Type Safety

All types are exported and fully documented:

```ts
import type {
  CommandItem,
  CommandRegistry,
  SearchEngine,
  ScoredItem,
  AccessControlProvider,
  FrecencyOptions,
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
| [#374](https://github.com/pacocoursey/cmdk/issues/374) | Scroll position jump on filter | We control the result list; reset scroll on search change |
| [#267](https://github.com/pacocoursey/cmdk/issues/267) | Items not updating on async changes | Reactive pub/sub registry; items update immediately |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

[MIT](./LICENSE) &copy; [Priyanshu](https://github.com/Priyans-hu)

---

If you find cmdk-engine useful, please consider giving it a star on GitHub. It helps others discover the project.
