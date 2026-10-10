# cmdk-engine

Permission-aware command palette engine for React. Works with [cmdk](https://github.com/dip/cmdk) or [Base UI](https://base-ui.com). Auto-discover routes, fuzzy search with synonyms, RBAC filtering, frecency ranking, CLI tooling. The Quick Start stack (provider, register hook, cmdk adapter and shortcut) is about 7.2 kB min + brotli on top of React and cmdk.

[![npm version](https://img.shields.io/npm/v/cmdk-engine.svg)](https://www.npmjs.com/package/cmdk-engine)
[![npm downloads](https://img.shields.io/npm/dm/cmdk-engine.svg)](https://www.npmjs.com/package/cmdk-engine)
[![license](https://img.shields.io/npm/l/cmdk-engine.svg)](https://github.com/Priyans-hu/cmdk-engine/blob/main/LICENSE)

![The cmdk adapter's palette opened with Cmd+K, styled with the CSS from the Styling section](https://raw.githubusercontent.com/Priyans-hu/cmdk-engine/main/.github/assets/palette.png)

**Live demo:** press Cmd+K (Ctrl+K) on the [docs site](https://priyans-hu.github.io/cmdk-engine/). Runnable apps are in [Examples](#examples).

**Contents:** [Installation](#installation), [Quick Start](#quick-start), [Styling](#styling), [Examples](#examples), [Search](#search), [Nested Commands](#nested-commands), [Async Command Sources](#async-command-sources), [CLI Tool](#cli-tool), [API Reference](#api-reference), [Testing](#testing).

---

## Why cmdk-engine?

[cmdk](https://cmdk.paco.me) gives you beautiful, accessible command menu primitives. But building a production command palette requires more:

| Feature | cmdk | cmdk-engine |
|---------|------|-------------|
| Composable UI components | Yes | Yes (via the cmdk or Base UI adapter) |
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
| UI-agnostic core | No | Yes: one engine under cmdk or Base UI, zero runtime deps |

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

### Requirements

- **React** 18 or 19.
- **A UI adapter:** `cmdk` ^1 for the cmdk adapter, or `@base-ui/react` ^1.1 for the
  Base UI adapter. Or build your own UI with the hooks.
- **Optional:** `react-router` 6, 7 or 8 for the route scanner, and `match-sorter` 7 or 8
  for the match-sorter search backend.
- **Node.js** 20 or later, needed by the CLI only. The library runs in the browser and
  during SSR.

**Support:** the latest minor release gets fixes. While the version is 0.x, a minor
release can change behavior; each such change is listed as a "Behavior change" in the
[changelog](./CHANGELOG.md). To report a vulnerability, see [SECURITY.md](./SECURITY.md).

---

## Quick Start

One file, with the cmdk adapter. Paste it into a React app, then press Cmd+K
(Ctrl+K on Windows and Linux):

<!-- readme-test: render -->
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

<!-- readme-test: typecheck -->
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

### Errors from commands

*New in 0.6.*

A command's `action`, your `onSelect` or your `onNavigate` can throw or return
a rejected promise. Set `onSelectError` to handle that; the palette still
closes right away. Without it, errors propagate as before.

```tsx
import type { CommandItem } from 'cmdk-engine'

const config = {
  onSelectError: (error: unknown, item: CommandItem) => {
    console.error(`"${item.label}" failed`, error) // or show a toast
  },
}
```

### Or build your own UI with hooks

<!-- readme-test: typecheck -->
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
[cmdk-input]:focus-visible { border-bottom-color: #6366f1; box-shadow: inset 0 -1px 0 #6366f1; }
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

The accent underline on `[cmdk-input]:focus-visible` replaces the outline the
input drops, so keyboard users can see where focus is. Keep a focus style if
you restyle the input.

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
[cmdk-input] { @apply w-full border-0 border-b border-gray-200 px-4 py-3.5 text-base outline-none focus-visible:border-indigo-500 focus-visible:shadow-[inset_0_-1px_0_#6366f1]; }
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

### shadcn/ui

If your app uses [shadcn/ui](https://ui.shadcn.com), install the palette from
this project's shadcn registry instead:

```bash
npx shadcn@latest add https://priyans-hu.github.io/cmdk-engine/r/command-palette.json
```

It writes `components/command-palette.tsx`, the cmdk adapter's palette styled
with your theme's tokens, so it follows light and dark mode and is yours to
edit. Render `<CommandPalette />` once inside `CommandEngineProvider`. For Base
UI instead of cmdk, add `.../r/command-palette-base-ui.json`. Both need
cmdk-engine 0.6.0 or later. See the
[shadcn/ui page](https://priyans-hu.github.io/cmdk-engine/docs/shadcn).

---

## Examples

Runnable apps in [`examples/`](examples). CI builds each one against this
repo, and each installs `cmdk-engine` from npm, so you can copy one out.

| Example | What it shows | Try it |
|---|---|---|
| [Vite + React Router](examples/vite-react-router) | Commands from the route tree with `scanRoutes`, the provider inside the router, this Styling CSS, and the same palette on Base UI with `?adapter=base-ui` | [StackBlitz](https://stackblitz.com/github/Priyans-hu/cmdk-engine/tree/main/examples/vite-react-router?file=src/layout.tsx) |
| [Next.js App Router](examples/nextjs-app-router) | A `'use client'` provider file under a server layout, `router.push` as `onNavigate`, and `[locale]` pages found by `cmdk-engine scan --include-dynamic locale` and filled in with `sitemapToCommands` | [StackBlitz](https://stackblitz.com/github/Priyans-hu/cmdk-engine/tree/main/examples/nextjs-app-router?file=components/command-menu.tsx) |
| [shadcn/ui](examples/shadcn) | Both shadcn registry items in an app set up with `shadcn init`, in light and dark mode | [StackBlitz](https://stackblitz.com/github/Priyans-hu/cmdk-engine/tree/main/examples/shadcn?file=src/App.tsx) |

The docs site is a live demo too: Cmd+K there searches its own pages. Its
[Examples page](https://priyans-hu.github.io/cmdk-engine/docs/examples) has more
recipes: RBAC, a custom UI and a pre-commit hook.

---

## CommandPalette Props

Both adapters export `CommandPalette` with the same props, except `vimBindings`, which
only the cmdk adapter has. Every prop is optional.

| Prop | Default | Description |
|------|---------|-------------|
| `dialog` | `false` | Render in a modal dialog with an overlay. When `false`, the palette is inline and always visible. Open a dialog with `useCommandPaletteShortcut()` or `toggle()` |
| `placeholder` | `palette.placeholder` | Input placeholder |
| `label` | `palette.label` | Accessible name of the palette and of the dialog |
| `loop` | `true` | Wrap from the last item to the first, and back |
| `onSelect` | none | `(item) => void`. Runs instead of the default handling (`action`, then `onNavigate` or `href`), and wins over `config.onSelect` |
| `renderItem` | built-in row | `(item, score) => ReactNode`. The row content; the adapter still renders the selectable wrapper |
| `renderGroupHeading` | the group label | `(group) => ReactNode` |
| `renderEmpty` | `palette.empty` text | `() => ReactNode`, shown when nothing matches |
| `renderLoading` | `palette.loading` text | `() => ReactNode`, shown while async sources load |
| `renderBreadcrumbs` | built-in trail | `(crumbs, onBack) => ReactNode`, shown inside a sub-menu ([Nested Commands](#nested-commands)) |
| `footer` | none | Node rendered below the list |
| `container` | the page body | Portal target in dialog mode |
| `disablePointerSelection` | `false` | The pointer no longer moves the highlight. Clicking an item still runs it |
| `vimBindings` | `true` | cmdk adapter only. Ctrl+N, P, J and K move the highlight |
| `className`, `inputClassName`, `listClassName`, `itemClassName`, `groupClassName`, `emptyClassName` | none | Class names for those parts ([Styling](#styling)) |
| `overlayClassName`, `contentClassName` | none | Class names for the dialog overlay and content |

---

## Base UI Adapter

*New in 0.6.*

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

<!-- readme-test: typecheck -->
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
| Highlighted item | `[cmdk-item][data-selected="true"]` | `[role="option"][data-highlighted]` |
| Loading row | `role="progressbar"`, after the list | `role="status"` live region, after the list |
| Results change while open (async sources) | Keeps the highlighted item | Keeps the highlighted position |
| IME input | The query updates while composing | The query updates when composition ends |

Follow Base UI's [quick start](https://base-ui.com/react/overview/quick-start):
give your app's root element `isolation: isolate` so the dialog stays on top,
and for iOS 26+ Safari give the backdrop (`overlayClassName`)
`position: absolute` and add `body { position: relative }`. Like cmdk's, the
dialog is unstyled. Its visually hidden close button is labelled by the
`palette.close` translation key. With `@base-ui/react` 1.1, Firefox logs a
`mozInputSource` deprecation warning the first time the input is clicked. It
comes from Base UI and is gone in later versions.

Base UI costs more than cmdk: about 44 kB min + brotli for Autocomplete and
48 kB with Dialog, versus about 14 kB for cmdk with its Radix dialog. In Node,
load the adapter with either `import` or `require`, not both, or two copies of
`@base-ui/react` run side by side; bundlers load one.

---

## React Router Integration

Auto-discover routes from your React Router config. Register them inside the provider,
and navigate with the router object, since the provider sits above `RouterProvider`:

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { scanRoutes } from 'cmdk-engine/adapters/react-router'

const routes = [
  { path: '/', element: <h1>Home</h1> },
  { path: '/billing', element: <h1>Billing</h1> },
]
const router = createBrowserRouter(routes)
const commands = scanRoutes(routes)
const config = { onNavigate: (href: string) => router.navigate(href) }

function RegisterRoutes() {
  useCommandRegister(commands)
  return null
}

export function App() {
  return (
    <CommandEngineProvider config={config}>
      <RegisterRoutes />
      {/* the palette from the Quick Start goes here */}
      <RouterProvider router={router} />
    </CommandEngineProvider>
  )
}
```

On React Router 8 there is no `react-router-dom`: import `createBrowserRouter` from
`react-router` and `RouterProvider` from `react-router/dom`.

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

*New in 0.6.*

An index route (`index: true` without a `path`) resolves to its parent's URL, so the index route of a pathless root becomes `/` (label "Home", id `home`). It never adds a second command for a URL another route already has: its `handle.command` is merged over that command instead, and the index route's fields win. Only `handle.command` is merged; an index route's `route.title` and `route.icon` fallbacks apply only when it gets its own command. Index routes follow their parent's exclusion and the dynamic-route rule. `index: true` with a `path` is a normal path route.

The CLI scanner (`npx cmdk-engine scan`) does not resolve index routes.

---

## Next.js

The palette needs a Client Component. Put the provider, the palette and the
shortcut in one file that starts with `'use client'`, pass `router.push` as
`onNavigate`, and render it from your root layout. `npx cmdk-engine scan` reads
App Router and Pages Router files; for `[locale]` pages see
[Dynamic routes and `[locale]`](#dynamic-routes-and-locale). The
[Next.js guide](https://priyans-hu.github.io/cmdk-engine/docs/nextjs) has the
full files, and [`examples/nextjs-app-router`](examples/nextjs-app-router) is a
runnable app.

---

## RBAC / Access Control

Filter commands based on user permissions:

```tsx
import { createSimpleAccessProvider } from 'cmdk-engine'

// Build the provider once, outside the component, or `useMemo` it per user.
const config = {
  accessControl: createSimpleAccessProvider(['admin.view', 'billing.read']),
  accessCheckMode: 'any' as const, // user needs ANY listed permission
}

// <CommandEngineProvider config={config}>
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

*New in 0.6: words in any order, and folding of accents and spaces.*

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

Pass the engine in the provider config, and create it once, outside the
component:

```tsx
import { createMatchSorterSearch } from 'cmdk-engine/search/match-sorter'

const config = { searchEngine: createMatchSorterSearch() }
```

Any object with a `search(query, items)` method works as `searchEngine` too.
The [Search page](https://priyans-hu.github.io/cmdk-engine/docs/search) has the
scoring tiers, the `threshold` and `keys` options and a custom engine.

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

Commands you use frequently and recently appear higher in results. No configuration needed: it uses `localStorage` by default. When you use `select()`, frecency is recorded automatically.

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
> and when the browser blocks cookies, or `window.localStorage` is `null` or
> rejects writes. To test storage, the provider writes and removes a
> `cmdk-engine-probe` key once when it mounts. Malformed data under their keys
> is ignored and replaced on the next write. Override the backend via
> `config.frecency.storage`.

> `frecency.storageKey` and `searchHistory.storageKey` are full `localStorage`
> keys, not prefixes, so everyone using a browser shares the defaults. If
> several users can sign in on one browser, namespace both keys per user, e.g.
> ``storageKey: `cmdk-frecency:${user.id}` ``.

### Turning frecency off

*New in 0.6.*

Set `frecency: { enabled: false }` to turn frecency off. Nothing is stored in
or read from `localStorage`, results are not ranked by past use, and no
"Recent" group shows, even with `showRecent`.

---

## Context / Scope Boosting

Commands with a `scope` are boosted when they match the current app context, so on
`/billing`, billing commands rank higher while you search. The empty-query browse
list is not boosted.

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

A `scope` entry matches when it equals the current `context.path` or is a parent of it
(`/billing` matches `/billing/overview`), when a glob such as `/billing/*` covers it (the
glob matches below `/billing`, not `/billing` itself), or when it equals one of the
`context.tags`.

---

## Nested Commands

Give a command `children` to make a sub-menu. Selecting it opens its children instead
of running it:

```tsx
import { useCommandRegister } from 'cmdk-engine/react'

const setTheme = (theme: string) => document.documentElement.setAttribute('data-theme', theme)

function ThemeCommands() {
  useCommandRegister([
    {
      id: 'theme',
      label: 'Change theme',
      children: [
        { id: 'theme-light', label: 'Light', action: () => setTheme('light') },
        { id: 'theme-dark', label: 'Dark', action: () => setTheme('dark') },
      ],
    },
  ])
  return null
}
```

- A command with children never runs its own `action` or `href`. An empty `children`
  array counts as a leaf.
- The palette lists only the children, and search covers only that level. `when`,
  `permissions` and `hidden` apply to them as at the root.
- Backspace in an empty input, or the back button in the breadcrumbs, goes up one level.
  Closing the palette returns to the root.
- Opening a sub-menu is not recorded in frecency or search history; running a child is.
- Async sources load at the root level only.
- Changes to the registered command's `children` show up while you are inside the
  sub-menu. A parent that is no longer registered keeps showing the children it had.
- In a custom UI, `useCommandPalette()` returns `breadcrumbs`, `depth`,
  `drillDown(item)`, `drillUp()` and `resetPath()`. Both adapters take
  `renderBreadcrumbs(crumbs, onBack)` and mark the chevron and the trail with
  `data-cmdk-engine-item-chevron` and `data-cmdk-engine-breadcrumbs` (see
  [Styling](#styling)).

---

## Groups

A command's `group` string puts it under a heading. Without any config, each distinct
`group` becomes a heading with the same text, and commands without a `group` go under
"Other", always last. Set `groups` in the provider config to choose labels and order:

```tsx
import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'

const config = {
  groups: [
    { id: 'navigation', label: 'Go to', priority: 10 },
    { id: 'actions', label: 'Actions', priority: 5 },
  ],
}

function Commands() {
  useCommandRegister([
    { id: 'home', label: 'Home', href: '/', group: 'navigation' },
    { id: 'invite', label: 'Invite teammate', action: () => {}, group: 'actions' },
  ])
  return null
}

export function Root({ children }: { children: React.ReactNode }) {
  return (
    <CommandEngineProvider config={config}>
      <Commands />
      {children}
    </CommandEngineProvider>
  )
}
```

- A command's `group` matches a group's `id`. A `group` you did not define still shows,
  labelled with the `group` string.
- With an empty query, defined groups are listed by `priority` (higher first), then the
  other groups in the order their first command appears. While searching, groups are
  ordered by their best match instead.
- A group's `icon` is not rendered by the built-in components; `renderGroupHeading(group)`
  receives it.
- `maxResults` (default 50) caps the total number of results across groups.
- The Recent group (`frecency.showRecent`) comes first, above your configured groups.
  The palette highlights the first item when it opens, so with groups configured that
  is the most recent command. To keep your groups on top, leave `showRecent` off, or
  render your own list from `groupedResults`.

---

## Internationalization (i18n)

Built-in UI strings go through a translation function. Pass your own to
localize the placeholder, empty state, "Recent" heading, accessible labels, etc:

```tsx
import { getTranslationKeys } from 'cmdk-engine'

const myDictionary: Record<string, string> = {
  'palette.placeholder': 'Buscar comandos...',
  'palette.empty': 'Sin resultados.',
}

// Define `t` once, outside the component: a new function on every render rebuilds the engine.
const config = { t: (key: string) => myDictionary[key] ?? key }

// <CommandEngineProvider config={config}>

// getTranslationKeys() lists every key that has a default English string.
console.log(getTranslationKeys())
```

> `getTranslationKeys()` also lists `group.other` and `search.history`, which
> nothing reads yet. The heading of the ungrouped "Other" group is fixed
> English text for now.

`palette.close` (default "Close") names the visually hidden close button in the
Base UI adapter's dialog. `palette.list` (default "Suggestions") names the
results listbox in both adapters. A `t` that returns the key unchanged, like the
one above, or an empty string keeps "Suggestions".

---

## Search History

Opt-in tracking of past queries (persisted to `localStorage`). A query is recorded when
the user selects a command, not on every keystroke. Where `localStorage` is unavailable, the
history stays in memory, with the options it was created with until the provider remounts:

```tsx
const config = { searchHistory: { enabled: true, maxEntries: 20, minQueryLength: 2 } }
```

Read it with `useSearchHistory()`, and set the search box with `setSearch` from
`useCommandPalette()`:

```tsx
import { useCommandPalette, useSearchHistory } from 'cmdk-engine/react'

function RecentSearches() {
  const { setSearch } = useCommandPalette()
  const { getRecent } = useSearchHistory() // also: remove(query), clear()
  return (
    <>
      {getRecent(5).map((entry) => (
        <button key={entry.query} onClick={() => setSearch(entry.query)}>
          {entry.query}
        </button>
      ))}
    </>
  )
}
```

---

## Palette Events

*New in 0.6.*

`useCommandPaletteEvents` reports what happens in the palette, for analytics.
Call it once, in any component inside the provider:

```tsx
import { useCommandPaletteEvents } from 'cmdk-engine/react'

function PaletteAnalytics() {
  useCommandPaletteEvents((event) => {
    if (event.type === 'search' && event.resultCount === 0) {
      console.log('no results for', event.query) // your analytics call
    }
  })
  return null
}
```

| Event | When | Fields |
|---|---|---|
| `open`, `close` | The palette opens or closes | |
| `search` | The results for a query settle, async sources included | `query` (trimmed), `resultCount` (`0`: nothing found) |
| `select` | A command is selected (drilling into children is not) | `item`, `query`, `sourceId` (loaded items) |
| `asyncError` | An async source fails or drops items | `sourceId`, `error` |

`search` fires for every settled query while the user types, so debounce it
before sending it anywhere. An error thrown by your handler never breaks the
palette. Without the hook, nothing is reported.

---

## Async Command Sources

*New in 0.6.*

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

const config = { asyncSources: [issueSearch] }

// <CommandEngineProvider config={config}>
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

# Keep routes under a [locale] folder (or another :param)
npx cmdk-engine scan --include-dynamic locale

# Validate config
npx cmdk-engine validate
```

### Use the output

*New in 0.6.*

`scan` writes `src/generated/command-routes.json`. `sitemapToCommands` turns it
into commands; register them once, at the app level:

```tsx
import { useCommandRegister } from 'cmdk-engine/react'
import { sitemapToCommands } from 'cmdk-engine/adapters/sitemap'
import sitemap from './generated/command-routes.json'

const routeCommands = sitemapToCommands(sitemap)

function RouteCommands() {
  useCommandRegister(routeCommands)
  return null
}
```

Each route becomes `{ id, label, keywords, group, href }`, and selecting one
calls your `onNavigate`. Commit the JSON, or run the scan in a `prebuild` script.

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

### Dynamic routes and `[locale]`

*New in 0.6.*

A command needs a real URL, so the scan skips routes with a `:param`
(`/users/:id`, `app/[id]/page.tsx`). To keep routes under a segment you can
fill at runtime, such as a Next.js `[locale]` folder, name it in
`includeDynamic` (or pass `--include-dynamic locale`). `app/[locale]/billing/page.tsx`
then becomes `/:locale/billing`, which `params` fills:

```tsx
const commands = useMemo(() => sitemapToCommands(sitemap, { params: { locale } }), [locale])
useCommandRegister(commands)
```

- `params` values are inserted as given, and `''` drops the segment (a default
  locale served without a prefix).
- Ids keep the placeholder (`locale--billing`), so frecency is shared across
  locales.
- `includeDynamic: true` keeps every `:param` route. A route whose param you do
  not fill is skipped, and catch-alls (`[...slug]`, `/docs/*`) are never kept.
- A React Router route with its own `handle.command` is kept, as with the
  runtime `scanRoutes`.

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
  includeDynamic: ['locale'], // keep /:locale/... routes
  synonyms: {
    billing: ['money', 'payment', 'credits'],
  },
})
```

The CLI reads `cmdk-engine.config.ts` without running it, so its values must be
static: strings, numbers, booleans, arrays, objects, RegExp literals and
top-level `const`s, with `as const` and `satisfies` allowed. For computed values
such as `process.env`, use `cmdk-engine.config.mjs`. A config the CLI cannot
read fails `scan` and `validate`, naming the line.

`exclude` takes exact paths, RegExp and globs. In a glob, `*` matches within one
path segment and `**` across segments. Excluding a path also excludes the paths
below it, and a trailing `/*` also matches the base: `/admin/*` excludes
`/admin` and everything under it.

### What the scan reads

The scan reads your files without running them.

- **React Router:**
  - Reads route objects with a string `path` (as passed to `createBrowserRouter`)
    and `<Route path="...">` elements, with the `label`, `keywords` and `group`
    of their own `handle.command`.
  - Joins relative child paths to their parent route in the same file
    (`children` arrays, nested `<Route>`s).
  - Does not read paths built at runtime, routes imported from another file,
    index routes, or a `handle` returned by `lazy()`.
- **Next.js:**
  - Reads `app/**/page.*` (`nextjs-app`) and `pages/**` (`nextjs-pages`).
  - Route groups and `@slot` folders add no segment.
  - Private `_folders`, intercepting `(.)` routes and `api/` are skipped.
  - `[[...slug]]` gives its parent's URL; other dynamic routes need `includeDynamic`.

Ids keep letters, digits and `-` (`/billing/overview` gives `billing--overview`),
so `/a_b` and `/ab` would share `ab`. The scan then keeps it for the last of them
in path order and gives the others `ab-2`, `ab-3`, ...

### Pre-commit hook

With [husky](https://typicode.github.io/husky) 9, run `npx husky init`, then put the
command in `.husky/pre-commit`:

```sh
npx cmdk-engine scan && git add src/generated/command-routes.json
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

Sizes are measured with size-limit, minified + brotli. Entries import the siblings they use (the cmdk
adapter imports `cmdk-engine/react`, which imports `cmdk-engine`) instead of
bundling them, so each one's code ships once. The Quick Start stack
(`CommandEngineProvider`, `useCommandRegister`, `CommandPalette`,
`useCommandPaletteShortcut`) is **7.2 kB** in total, without the `react`,
`react-dom` and `cmdk` peers. CI enforces a size budget for each entry, set
slightly above these figures.

All entry points are tree-shakeable. The core has **zero runtime dependencies**.

---

## API Reference

A quick index. The [docs site](https://priyans-hu.github.io/cmdk-engine/docs/api) has
every option, field and hook.

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
  createContextEngine,   // Scope boosting
  createSearchHistory,   // Search history (localStorage); createInMemorySearchHistory for tests and SSR
  createInMemoryStorage, // In-memory frecency storage; createLocalStorageFrecencyStorage for localStorage
  isCommandVisible,      // Resolve a command's `when` gate; filterVisible filters a list with it
  getTranslationKeys,    // Every UI string key; createDefaultTranslation is the English `t`
  pathToId, pathToLabel, pathToGroup, pathSegmentToLabel, // Route path helpers
  defineConfig,          // Typed config helper for the CLI config file
} from 'cmdk-engine'
```

### React

```ts
import {
  CommandEngineProvider, // Context provider
  useCommandPalette,    // Main hook: search + filter + rank
  useCommandRegister,   // Register commands from components
  useFrecency,          // Direct frecency access
  useSearchHistory,     // Read and edit search history
  useCommandContext,    // Read the context config (read-only)
  useEngineContext,     // The engine singletons, for custom UIs; throws outside the provider
  usePaletteState,      // The shared open, search and path state; throws outside the provider
  useCommandPaletteEvents, // Report palette events, for analytics
} from 'cmdk-engine/react'
```

### Adapters

```ts
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'
import { scanRoutes } from 'cmdk-engine/adapters/react-router'
import { sitemapToCommands } from 'cmdk-engine/adapters/sitemap'
// The same CommandPalette and useCommandPaletteShortcut, built on Base UI:
// import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/base-ui'
```

### Keyboard shortcut

*New in 0.6: the function form.*

`useCommandPaletteShortcut(shortcut?)` toggles the palette and returns
`{ isOpen, toggle }`. A string is the key pressed with Cmd or Ctrl (default
`'k'`). It also matches with Caps Lock on and, on non-Latin layouts such as
Russian or Greek, by the physical key. Holding the keys toggles once. For any
other shortcut, pass a function that decides the whole match, modifiers
included. Define it outside the component, or every render re-binds it:

```tsx
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'

// Cmd/Ctrl+Shift+P, as in VS Code
const isPaletteKey = (e: KeyboardEvent) =>
  (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p'

function CommandMenu() {
  useCommandPaletteShortcut(isPaletteKey)
  return <CommandPalette dialog />
}
```

### Key hook return values

```ts
import { useCommandPalette } from 'cmdk-engine/react'

const {
  search,          // Current query
  setSearch,       // Update query
  results,         // ScoredItem[] (flat)
  flatResults,     // The same array as results (an alias; use results)
  groupedResults,  // GroupedResult[] — results grouped by group
  groups,          // CommandGroup[] — active groups
  isOpen,          // Palette visibility
  isLoading,       // True while an async source is loading
  asyncErrors,     // Record<sourceId, Error> — last error per async source
  breadcrumbs,     // CommandItem[], the sub-menu path (nested commands)
  depth,           // 0 at the root
  drillDown, drillUp, resetPath, // Move through nested commands
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
  CmdkEngineConfig,    // the CLI config file (cmdk-engine.config.ts)
  CommandEngineConfig, // the provider's `config` prop
  CommandPaletteState,
  CommandPaletteEvent,
  AccessCheckMode,
  FrecencyEntry,
  FrecencyStorage,
  CommandContext,
  TranslationFn,
  SearchHistoryConfig,
  SearchHistoryEntry,
  Sitemap,
  SitemapRoute,
} from 'cmdk-engine'
```

---

## Testing

jsdom lacks two browser APIs that cmdk uses, so tests that render the cmdk adapter need
stubs. Without them the first render throws `ResizeObserver is not defined`:

```ts
// your test setup file
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Element.prototype.scrollIntoView = () => {}
```

- Render the palette inside `CommandEngineProvider`. To open a `dialog` palette, dispatch
  `new KeyboardEvent('keydown', { key: 'k', metaKey: true })` on `document`, or call
  `toggle()` from `useCommandPalette()`.
- Frecency and search history persist to `localStorage` (`cmdk-frecency` and
  `cmdk-search-history`). Clear them between tests, or pass `frecency.storage`, so one
  test's selections do not rank the next test's results.
- The cmdk adapter renders the empty state and the loading row right after the list,
  not inside its `role="listbox"`. Search the palette for them, not the list.
- The Base UI adapter needs no stubs. Its dialog stays in the DOM for a moment after
  Escape, so use `waitFor` before asserting that it is gone.

---

## cmdk Issues We Solve

| Issue | Description | How We Fix It |
|-------|-------------|---------------|
| [#264](https://github.com/dip/cmdk/issues/264) | Sort not restored after clearing search | We own filtering; restore original order when query is empty |
| [#280](https://github.com/dip/cmdk/issues/280) | First item not selected with dynamic content | Auto-select first item after each render cycle |
| [#375](https://github.com/dip/cmdk/issues/375) | Non-deterministic sorting | Deterministic: frecency → priority → registration order |
| [#267](https://github.com/dip/cmdk/issues/267) | Items not updating on async changes | Reactive pub/sub registry; items update immediately |

> With `@radix-ui/react-dialog` 1.1.x, which cmdk 1.1 can install, Radix logs
> "`DialogContent` requires a `DialogTitle`" and a missing `Description` warning
> each time the dialog opens, and points `aria-labelledby`/`aria-describedby` at
> ids that do not exist. The dialog is still named by its `aria-label`. cmdk
> exposes no dialog title, so the adapter cannot add one: update
> `@radix-ui/react-dialog` to 1.2 or later (`npm update @radix-ui/react-dialog`).

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

[MIT](./LICENSE) &copy; [Priyanshu](https://github.com/Priyans-hu)

---

If you find cmdk-engine useful, please consider giving it a star on GitHub. It helps others discover the project.
