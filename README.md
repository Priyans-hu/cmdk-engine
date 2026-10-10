# cmdk-engine

The smart command palette engine for React. Built on [cmdk](https://github.com/dip/cmdk). Auto-discover routes, fuzzy search with synonyms, RBAC filtering, frecency ranking, CLI tooling. The Quick Start stack (provider, register hook, cmdk adapter and shortcut) is about 7.2 kB min + brotli on top of React and cmdk.

[![npm version](https://img.shields.io/npm/v/cmdk-engine.svg)](https://www.npmjs.com/package/cmdk-engine)
[![npm downloads](https://img.shields.io/npm/dm/cmdk-engine.svg)](https://www.npmjs.com/package/cmdk-engine)
[![license](https://img.shields.io/npm/l/cmdk-engine.svg)](https://github.com/Priyans-hu/cmdk-engine/blob/main/LICENSE)

![The cmdk adapter's palette opened with Cmd+K, styled with the CSS from the Styling section](https://raw.githubusercontent.com/Priyans-hu/cmdk-engine/main/.github/assets/palette.png)

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
| Deterministic sorting | [Open upstream issues (#264, #375)](https://github.com/dip/cmdk/issues/264) | Yes — frecency > priority > registration order |
| First item auto-select | [Open upstream issue (#280)](https://github.com/dip/cmdk/issues/280) | Yes — auto-selects the first enabled item on every result update and on every open |
| Dynamic content updates | [Open upstream issue (#267)](https://github.com/dip/cmdk/issues/267) | Yes — reactive pub/sub registry |
| Async / server-side sources | No | Yes — debounced, abortable, one load per query |
| CLI tooling | No | Yes — scan, init, validate |
| Framework-agnostic core | No | Yes — zero runtime deps |

**cmdk-engine owns all filtering** (`shouldFilter={false}`), solving the sorting and selection bugs in cmdk while keeping its composable UI primitives.

---

## Installation

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
> `react-dom`, `cmdk` (for the cmdk adapter), `@base-ui/react` (for the Base
> UI adapter), `match-sorter` (for the match-sorter search backend), and
> `react-router` v6, v7 or v8 /
> `react-router-dom` v6 or v7 (for the React Router adapter; v8 ships only
> `react-router`). The core engine (`cmdk-engine`) has zero runtime
> dependencies.

---

## Quick Start

One file, with the cmdk adapter. Paste it into a React app, then press Cmd+K
(Ctrl+K on Windows and Linux):

```tsx
// App.tsx
import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'

// Define config once, outside the component.
const config = { onNavigate: (href: string) => window.location.assign(href) }

function Commands() {
  useCommandRegister([
    { id: 'home', label: 'Home', href: '/' },
    { id: 'billing', label: 'Billing Overview', href: '/billing', keywords: ['invoices'], group: 'Billing' },
  ])
  return null
}

function Palette() {
  useCommandPaletteShortcut() // Cmd+K / Ctrl+K. Must be inside the provider.
  return <CommandPalette dialog placeholder="Search..." />
}

export default function App() {
  return (
    <CommandEngineProvider config={config}>
      <Commands />
      <Palette />
      {/* your app */}
    </CommandEngineProvider>
  )
}
```

The palette starts closed. Cmd+K opens it, typing "invoices" narrows the list
to Billing Overview, and Enter goes to `/billing` and closes the palette. It
has no styles until you add some (see [Styling](#styling)). In a Next.js App
Router project, put `'use client'` at the top of this file.

`useCommandPaletteShortcut()` binds Cmd+K / Ctrl+K. Call it in a component
**inside** `CommandEngineProvider`, like `Palette` above: without it nothing
opens the dialog, and in the component that renders the provider it throws.

### Splitting it into files

- **Provider:** wrap your app once, near the root. Define `config` outside
  components, or `useMemo` it: a new object on every render rebuilds the
  engine.
- **Commands:** call `useCommandRegister` in any component under the provider.
  Its commands go away when that component unmounts, so register app-wide
  navigation in a layout that stays mounted and page commands in the page.
- **Palette:** keep `CommandPalette` and `useCommandPaletteShortcut()` together
  in one component, anywhere under the provider.

### Navigating with your router

`onNavigate` gets the `href` of each selected command that has no `action`.
`window.location.assign` reloads the page, so pass your router instead. With
a React Router data router, use the router object:

```tsx
const router = createBrowserRouter(routes)
const config = { onNavigate: (href: string) => router.navigate(href) }
```

To use `useNavigate()` instead, render the provider inside the router (in a
root layout route, for example) and `useMemo` the config there. A command's
`action` runs instead of `onNavigate`, and an `onSelect` on the provider
config or on `CommandPalette` replaces both.

### `onSelect` replaces the default handling

`config.onSelect` runs for every selected command instead of its `action` and
instead of `onNavigate`. The `onSelect` prop of `CommandPalette` does the same,
and wins over the config. To track selections, call the default yourself, or
leave `onSelect` unset and track inside `onNavigate` and your actions:

```tsx
import type { CommandItem } from 'cmdk-engine'

const config = {
  onSelect: (item: CommandItem) => {
    console.log('command selected', item.id) // your analytics call
    if (item.action) item.action(item)
    else if (item.href) window.location.assign(item.href)
  },
}
```

### Or build your own UI with hooks

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

## Styling

`CommandPalette` ships no styles. Style cmdk's `[cmdk-*]` parts and the
adapter's `data-cmdk-engine-*` attributes from any global stylesheet. This CSS
gives the look in the screenshot at the top:

```css
[cmdk-overlay] { position: fixed; inset: 0; z-index: 50; background: rgb(0 0 0 / 0.4); }
[cmdk-dialog] {
  position: fixed; top: 15vh; left: 50%; z-index: 50; transform: translateX(-50%);
  width: min(560px, calc(100vw - 32px));
}
[cmdk-root] {
  overflow: hidden; border: 1px solid #e5e7eb; border-radius: 12px;
  background: #fff; color: #111827; font: 14px/1.4 system-ui, sans-serif;
  box-shadow: 0 16px 48px rgb(0 0 0 / 0.2);
}
[cmdk-input] {
  box-sizing: border-box; width: 100%; padding: 14px 16px; border: 0;
  border-bottom: 1px solid #e5e7eb; font: inherit; font-size: 16px; outline: none;
}
[cmdk-list] { max-height: 320px; overflow-y: auto; padding: 8px; }
[cmdk-group-heading] { padding: 8px 8px 4px; font-size: 12px; color: #6b7280; }
[cmdk-item] { padding: 8px; border-radius: 8px; cursor: pointer; }
[cmdk-item][data-selected='true'] { background: #f3f4f6; }
[cmdk-item][data-disabled='true'] { opacity: 0.5; cursor: default; }
[data-cmdk-engine-item] { display: flex; align-items: center; gap: 8px; }
[data-cmdk-engine-item-content] { display: flex; flex: 1; flex-direction: column; }
[data-cmdk-engine-item-description] { font-size: 12px; color: #6b7280; }
[data-cmdk-engine-item-shortcut] kbd {
  margin-left: 4px; padding: 0 6px; border: 1px solid #e5e7eb; border-radius: 4px;
  font: inherit; font-size: 12px;
}
[data-cmdk-engine-empty],
[data-cmdk-engine-loading] { padding: 16px; text-align: center; color: #6b7280; }
```

Items also carry `data-cmdk-engine-icon` and `data-cmdk-engine-item-label`,
plus `data-cmdk-engine-item-chevron` when they have children. Nested commands
add `data-cmdk-engine-breadcrumbs`, with `data-cmdk-engine-breadcrumb-back`,
`data-cmdk-engine-breadcrumb` and `data-cmdk-engine-breadcrumb-separator`
inside. cmdk documents its parts in
[Parts and styling](https://github.com/dip/cmdk#parts-and-styling) and has
[drop-in stylesheets](https://github.com/dip/cmdk/tree/main/website/styles/cmdk).

With Tailwind (v3 or v4), `@apply` the same utilities to the same selectors in
your main CSS file:

```css
[cmdk-overlay] { @apply fixed inset-0 z-50 bg-black/40; }
[cmdk-dialog] { @apply fixed left-1/2 top-[15vh] z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2; }
[cmdk-root] { @apply overflow-hidden rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-2xl; }
[cmdk-input] { @apply w-full border-0 border-b border-gray-200 px-4 py-3.5 text-base outline-none; }
[cmdk-list] { @apply max-h-80 overflow-y-auto p-2; }
[cmdk-group-heading] { @apply px-2 pb-1 pt-2 text-xs text-gray-500; }
[cmdk-item] { @apply cursor-pointer rounded-lg p-2 data-[selected=true]:bg-gray-100 data-[disabled=true]:opacity-50; }
[data-cmdk-engine-item] { @apply flex items-center gap-2; }
[data-cmdk-engine-item-content] { @apply flex flex-1 flex-col; }
[data-cmdk-engine-item-description] { @apply text-xs text-gray-500; }
[data-cmdk-engine-item-shortcut] kbd { @apply ml-1 rounded border border-gray-200 px-1.5 font-sans text-xs; }
[data-cmdk-engine-empty], [data-cmdk-engine-loading] { @apply p-4 text-center text-gray-500; }
```

To style per instance instead, `CommandPalette` passes `className`,
`overlayClassName`, `contentClassName`, `inputClassName`, `listClassName`,
`groupClassName`, `itemClassName` and `emptyClassName` to those parts.

---

## Base UI Adapter

Prefer [Base UI](https://base-ui.com)? `cmdk-engine/adapters/base-ui` renders
the palette with Base UI's
[Autocomplete](https://base-ui.com/react/components/autocomplete) (plus its
[Dialog](https://base-ui.com/react/components/dialog) in dialog mode) instead of
cmdk. The engine still does all filtering, ranking and grouping.

```bash
npm install cmdk-engine @base-ui/react
```

`@base-ui/react` (`^1.1.0`) is an optional peer, like `cmdk`. The adapter
exports `CommandPalette` and `useCommandPaletteShortcut` with the cmdk adapter's
props, so switching adapters is an import-path change:

```tsx
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/base-ui'

// Inline: always rendered
function SearchPanel() {
  return <CommandPalette placeholder="Search commands..." />
}

// Dialog: opened with Cmd+K / Ctrl+K
function CommandMenu() {
  useCommandPaletteShortcut()
  return <CommandPalette dialog overlayClassName="backdrop" contentClassName="palette" />
}
```

The default renderers produce the same `data-cmdk-engine-*` markup as the cmdk
adapter, so CSS written against those attributes carries over. cmdk's own
`[cmdk-*]` attributes don't exist here: style the parts with the `*ClassName`
props. Other differences:

| | cmdk adapter | Base UI adapter |
|---|---|---|
| Vim keys | `vimBindings` (Ctrl+N/P/J/K) | None; there is no `vimBindings` prop |
| Home / End | First / last item | Move the caret in the input |
| Disabled items | Skipped by the arrow keys | Reachable by the arrow keys, and highlighted when first in the list; Enter and click do nothing |
| Highlighted item | `[cmdk-item][data-selected="true"]` | `[role="option"][data-highlighted]` |
| Loading row | `role="progressbar"`, inside the list | `role="status"` live region, after the list |
| Results change while open (async sources) | Keeps the highlighted item | Keeps the highlighted position |
| IME input | The query updates while composing | The query updates when composition ends |

Follow Base UI's [quick start](https://base-ui.com/react/overview/quick-start):
give your app's root element `isolation: isolate` so the dialog stays on top,
and for iOS 26+ Safari give the backdrop (`overlayClassName`)
`position: absolute` and add `body { position: relative }`. Like cmdk's, the
dialog is unstyled. Its visually hidden close button is labelled by the
`palette.close` translation key.

Base UI costs more than cmdk: about 44 kB min + brotli for Autocomplete and
48 kB with Dialog, versus about 14 kB for cmdk with its Radix dialog. In Node,
load the adapter with either `import` or `require`, not both, or two copies of
`@base-ui/react` run side by side; bundlers load one.

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

A `handle` returned from `lazy()` is not read, because the scanner never calls `lazy()`. Put `handle.command` on the route object itself.

### Index routes

An index route (`index: true` without a `path`) resolves to its parent's URL, so the index route of a pathless root becomes `/` (label "Home", id `home`). It never adds a second command for a URL another route already has: its `handle.command` is merged over that command instead, and the index route's fields win. Only `handle.command` is merged; an index route's `route.title` and `route.icon` fallbacks apply only when it gets its own command. Index routes follow their parent's exclusion and the dynamic-route rule. `index: true` with a `path` is a normal path route.

The CLI scanner (`npx cmdk-engine scan`) is regex-based and unchanged, so it does not resolve index routes.

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

## Search

The built-in search matches labels, descriptions and keywords, and tolerates
typos, partial words and initials.

- **Words in any order:** "overview billing" finds "Billing Overview", and each
  word can match a different field. These matches come after the ones that
  match the whole query, and never score above the weakest of them.
- **Accents, Unicode forms and spaces:** the query and the commands are
  compared after Unicode compatibility decomposition (NFKD), with the combining
  accents U+0300 to U+036F removed, in lowercase, with repeated whitespace
  collapsed. "resume" finds "Résumé" and `billing  over` (two spaces) finds
  "Billing Overview". Other marks (Indic vowel signs, kana voicing marks) are
  kept, ß and dotless ı are not folded, and the built-in search compares
  Korean by its letters (jamo), so a partial syllable already matches.
- **match-sorter:** `createMatchSorterSearch()` from
  `cmdk-engine/search/match-sorter` needs `match-sorter` (7 or 8) installed;
  it is part of the bundle that imports this entry. It folds the query's
  accents, compatibility forms and spaces the same way but keeps its case
  (an exact-case match ranks first), and also matches synonym keywords
  (ranked at most CONTAINS, below direct matches) and words in any order.
  A keystroke with several words takes about 1.5 to 2 times as long as
  match-sorter alone on Node 22 and 2 to 3 times on Node 20, the most for
  three or more words.

---

## Synonyms

Synonyms work both ways. With this config, typing "money" or "payment" finds
the "Billing Overview" command from the Quick Start:

```tsx
const config = {
  synonyms: {
    billing: ['money', 'payment', 'credits'],
    settings: ['preferences', 'config', 'options'],
  },
}
```

- **Query:** when the whole query (ignoring case, accents and extra spaces)
  equals a key or a value, the other terms are searched too: a key brings its
  values, a value its key. Commands found only this way are listed after the
  direct matches and never score above the weakest one. Frecency and context
  boosts apply afterwards, so a command you use often can still move up.
- **Commands:** a command whose keyword or whole label equals a key or a value
  also matches the other terms, at a lower weight (with match-sorter, ranked at
  most CONTAINS).
- **Not expanded:** the query, while it is a partial word ("mon" is searched
  as typed until "money" is complete) or a longer phrase that contains a
  synonym ("money transfer").

When the query expands, a custom `searchEngine` is called once more for each
extra term.

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
> fall back to memory where it is unavailable: during SSR, in sandboxed iframes
> and when the browser blocks cookies. Malformed data under their keys is
> ignored and replaced on the next write. Override the backend via
> `config.frecency.storage`.

> `frecency.storageKey` and `searchHistory.storageKey` are full `localStorage`
> keys, not prefixes, so everyone using a browser shares the defaults. If
> several users can sign in on one browser, namespace both keys per user, e.g.
> ``storageKey: `cmdk-frecency:${user.id}` ``.

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

Built-in UI strings go through a translation function. Pass your own to
localize the placeholder, empty state, "Recent" heading, accessible labels, etc:

```tsx
import { getTranslationKeys } from 'cmdk-engine'

<CommandEngineProvider
  config={{ t: (key) => myDictionary[key] ?? key }}
>

// getTranslationKeys() lists every key that has a default English string.
```

> `getTranslationKeys()` also lists `group.other` and `search.history`, which
> nothing reads yet. The heading of the ungrouped "Other" group is fixed
> English text for now.

`palette.close` (default "Close") names the visually hidden close button in the
Base UI adapter's dialog.

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

## Async Command Sources

Mix registered commands with results loaded for each query, such as a
server-side search. The provider runs every source once per query for all
consumers: it debounces, aborts stale requests and ignores late responses.

```tsx
import type { AsyncSource } from 'cmdk-engine'

const issueSearch: AsyncSource = {
  id: 'issues',
  load: async (query, { signal }) => {
    const res = await fetch(`/api/issues?q=${encodeURIComponent(query)}`, { signal })
    const issues: { id: string; title: string }[] = await res.json()
    return issues.map((issue) => ({
      id: `issue-${issue.id}`,
      label: issue.title,
      href: `/issues/${issue.id}`,
    }))
  },
  shouldFilter: false, // the server already matched the query
  group: 'Issues',
}

<CommandEngineProvider config={{ asyncSources: [issueSearch] }}>
```

| Option | Default | Description |
|--------|---------|-------------|
| `id` | required | Keys `asyncErrors`; changing the set of ids restarts loading |
| `load(query, { signal })` | required | Returns the items; pass `signal` to `fetch` |
| `trigger(query)` | non-empty trimmed query | Whether to load for this query |
| `debounceMs` | `200` | Delay after the last query change |
| `shouldFilter` | `true` | `true`: items are searched and ranked with your commands and count toward `maxResults`. `false`: the server matched them, so they are shown as returned, after the local results |
| `maxResults` | `10` | Cap per source when `shouldFilter` is `false` |
| `group` | each item's `group` | Group for every item from this source |

- `isLoading` is true from the moment a trigger passes (debounce included)
  until every source settles. `CommandPalette` shows a `palette.loading` row
  meanwhile; override it with `renderLoading`.
- `asyncErrors` maps a source id to its last error, cleared on that source's
  next success. A failing source never breaks the palette, and nothing is
  logged.
- Loaded items need a non-empty string `id` and `label`. Items without them
  (children included) are dropped, the rest still show, and `asyncErrors[id]`
  says so, for example "2 items dropped: missing label", until a load drops
  nothing. Non-string `keywords` entries are removed.
- Sources load at the root level only. Loads are aborted and their items
  cleared when the query changes, the palette closes, the user drills into a
  command, or the provider unmounts. A palette that reopens loads again; an
  inline palette that never opens keeps loading.
- `when`, permissions and `hidden` apply to loaded items too. Unfiltered items
  skip search, frecency, the context boost and `maxResults`, and their groups
  come after the local groups, in server order.
- Registered commands win on duplicate ids, then earlier sources. Loaded items
  are never recorded in frecency.
- `load`, `trigger` and `debounceMs` are read when needed, so an inline
  `config` does not restart loads. Change a source's `id` to force a reload.
- `trigger` runs during render (twice under StrictMode in development), so
  keep it pure and cheap. A trigger that passes on an empty query loads as
  soon as the provider mounts, even for a palette that has never been opened.

> **Security:** loaded items are untrusted. Only relative, `http(s):`,
> `mailto:` and `tel:` hrefs are kept; any other `href` is removed when the
> items arrive (children included), so it never reaches `window.location` or a
> custom `renderItem` anchor. For deep links (`myapp://...`), return an
> `action`, or an allowed `href` that your `onNavigate` maps.

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

### Standalone binary

The CLI also ships as a standalone binary for macOS on Apple silicon and for
Linux x64, so it runs without a Node project:

```bash
curl -fsSL https://raw.githubusercontent.com/Priyans-hu/cmdk-engine/main/install.sh | bash
```

There is no binary for Intel Macs or Linux on ARM yet; use `npx cmdk-engine`
there.

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
                                      UI Adapter (cmdk / Base UI)
```

### Package Entry Points

| Import | Size (own code; siblings and peers excluded) | Purpose |
|--------|------|---------|
| `cmdk-engine` | 3.4 kB | Core engine (types, registry, search, keywords, access control, frecency) |
| `cmdk-engine/react` | 3.6 kB | React hooks (provider, useCommandPalette, useCommandRegister) |
| `cmdk-engine/adapters/cmdk` | 1.4 kB | Pre-wired cmdk components |
| `cmdk-engine/adapters/react-router` | 1.0 kB | React Router v6/v7/v8 route scanner |
| `cmdk-engine/search/match-sorter` | 0.72 kB | Optional match-sorter search backend |
| `cmdk-engine/adapters/base-ui` | 1.5 kB | Pre-wired Base UI components |

Sizes are minified + brotli. Entries import the siblings they use (the cmdk
adapter imports `cmdk-engine/react`, which imports `cmdk-engine`) instead of
bundling them, so each one's code ships once. The Quick Start stack
(`CommandEngineProvider`, `useCommandRegister`, `CommandPalette`,
`useCommandPaletteShortcut`) is **7.2 kB** in total, without the `react`,
`react-dom` and `cmdk` peers. CI enforces a size budget for each entry, set
slightly above these figures.

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
// The same CommandPalette and useCommandPaletteShortcut, built on Base UI:
// import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/base-ui'
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
  isLoading,       // True while an async source is loading
  asyncErrors,     // Record<sourceId, Error> — last error per async source
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
  AsyncSource,
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
| [#264](https://github.com/dip/cmdk/issues/264) | Sort not restored after clearing search | We own filtering; restore original order when query is empty |
| [#280](https://github.com/dip/cmdk/issues/280) | First item not selected with dynamic content | Auto-select first item after each render cycle |
| [#375](https://github.com/dip/cmdk/issues/375) | Non-deterministic sorting | Deterministic: frecency → priority → registration order |
| [#267](https://github.com/dip/cmdk/issues/267) | Items not updating on async changes | Reactive pub/sub registry; items update immediately |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

[MIT](./LICENSE) &copy; [Priyanshu](https://github.com/Priyans-hu)

---

If you find cmdk-engine useful, please consider giving it a star on GitHub. It helps others discover the project.
