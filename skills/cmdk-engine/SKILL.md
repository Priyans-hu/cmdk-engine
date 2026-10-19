---
name: cmdk-engine
description: Adds a Cmd+K / Ctrl+K command palette to a React or Next.js app with cmdk-engine, the command palette engine built on cmdk (or Base UI). Covers install, the provider, registering commands and groups, the keyboard shortcut, fuzzy search with synonyms, frecency ranking, nested commands, permission filtering, route discovery, SSR and styling. Use when the user wants a command palette, command menu, Cmd+K / Ctrl+K search, or a spotlight or kbar-style launcher in a React app, or is working with cmdk-engine code.
license: MIT
compatibility: For React 18 or 19 apps (Vite, Next.js and other setups). Installs cmdk-engine 0.6 or later and cmdk from npm with the project's package manager, which needs network access.
metadata:
  author: Priyans-hu
  version: "1.0.0"
---

# cmdk-engine

cmdk-engine registers commands, searches, ranks and filters them, and runs the selected one. Its cmdk adapter renders the palette with [cmdk](https://github.com/dip/cmdk). Every option, field and hook is in [references/api.md](references/api.md); check names there before using anything not shown here.

## Workflow

1. Read `package.json`: React 18 or 19 is required. Note the router (React Router, Next.js) and the styling approach (CSS, Tailwind, shadcn/ui).
2. Install with the package manager the lockfile shows: `npm install cmdk-engine cmdk`, `pnpm add cmdk-engine cmdk`, `yarn add cmdk-engine cmdk` or `bun add cmdk-engine cmdk`. For the Base UI adapter, install `@base-ui/react` instead of `cmdk` and import from `cmdk-engine/adapters/base-ui` (same components and hook).
3. Add one file with the provider, the palette and the shortcut (below) and render it once, around the app, near the root.
4. Register real commands: the app's pages and actions.
5. Add styles: the palette ships unstyled.
6. Type-check or build, then tell the user to press Cmd+K (Ctrl+K on Windows and Linux).

## Minimal setup

```tsx
// src/command-menu.tsx
import type { ReactNode } from 'react'
import type { CommandEngineConfig } from 'cmdk-engine'
import { CommandEngineProvider, useCommandRegister } from 'cmdk-engine/react'
import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/cmdk'

// Module level (or useMemo): a new config object on every render rebuilds the engine.
const config: CommandEngineConfig = {
  onNavigate: (href) => window.location.assign(href), // use the app's router instead
}

function Commands() {
  useCommandRegister([
    { id: 'home', label: 'Home', href: '/', group: 'Pages' },
    { id: 'billing', label: 'Billing', href: '/billing', keywords: ['invoices'], group: 'Pages' },
  ])
  return null
}

function Palette() {
  useCommandPaletteShortcut() // Cmd+K / Ctrl+K toggles the dialog
  return <CommandPalette dialog placeholder="Type a command or search..." />
}

export function CommandMenu({ children }: { children: ReactNode }) {
  return (
    <CommandEngineProvider config={config}>
      <Commands />
      <Palette />
      {children}
    </CommandEngineProvider>
  )
}
```

Then wrap the app: `<CommandMenu><App /></CommandMenu>`.

## Registering commands

`useCommandRegister(commands, deps?)` works in any component under the provider and unregisters on unmount, so register app-wide commands in a component that stays mounted and page commands in the page.

```tsx
useCommandRegister([
  { id: 'new-project', label: 'New project', action: () => setDialogOpen(true), group: 'Actions' },
  {
    id: 'theme',
    label: 'Change theme',
    group: 'Actions',
    children: [
      { id: 'theme-light', label: 'Light', action: () => setTheme('light') },
      { id: 'theme-dark', label: 'Dark', action: () => setTheme('dark') },
    ],
  },
])
```

- `id` must be unique and stable: frecency is stored per id, and a second registration of an id replaces the first.
- On select, one handler runs, then the palette closes: an `onSelect` (the `CommandPalette` prop, else `config.onSelect`) replaces everything; otherwise `action`; otherwise `config.onNavigate(href)`; otherwise a full page load of `href`.
- `action` always calls the latest closure, so state setters need no `deps`. Pass `deps` only when element icons or `meta` change.
- `children` opens a sub-menu with breadcrumbs; Backspace in the empty input goes back.
- `shortcut: ['G', 'H']` is display only; nothing binds those keys.
- Also: `description`, `icon` (string or element), `priority` (higher first), `disabled`, `hidden` (found only by searching), `when` (boolean or function gate), `permissions`, `scope`.

## Groups

A command's `group` string becomes a heading; commands without one go under "Other", last. To set labels and order, pass `groups`; a command's `group` then matches a group `id`:

```ts
const config: CommandEngineConfig = {
  groups: [
    { id: 'pages', label: 'Go to', priority: 10 },
    { id: 'actions', label: 'Actions', priority: 5 },
  ],
}
```

With an empty query, higher `priority` lists first; while searching, groups follow their best match. `maxResults` (default 50) caps the total.

## Keyboard shortcut

`useCommandPaletteShortcut(shortcut?)` binds Cmd/Ctrl + `shortcut` (default `'k'`), toggles the palette and returns `{ isOpen, toggle }`. For another combination, pass a function `(e: KeyboardEvent) => boolean` defined at module level.

- Call it exactly once, in a component inside the provider. In the component that renders the provider it throws. Two calls toggle twice per keypress, so the palette never opens.
- For a button that opens the palette, use `usePaletteState()` from `cmdk-engine/react`: `onClick={() => setIsOpen(true)}`.

## Search and ranking

Built in; configure them on the provider `config`:

- Fuzzy search over `label`, `description` and `keywords`: typos, partial words, initials, words in any order, accents ignored.
- `synonyms: { billing: ['money', 'payment'] }` works both ways; synonym-only matches rank below direct ones.
- Frecency is on by default. `select()` records each use in `localStorage` (key `cmdk-frecency`), and frequent, recent commands rank higher (exponential decay, 7-day half-life). With an empty query the order is frecency, then `priority`, then registration order. `frecency: { showRecent: true }` adds a Recent group; `frecency: { enabled: false }` turns it off. If users share a browser, set a per-user `frecency.storageKey`.
- `context: { path: location.pathname }` boosts commands whose `scope` matches, such as `scope: ['/billing', '/billing/*']`.
- `accessControl: createSimpleAccessProvider(userPermissions)` (from `cmdk-engine`) hides commands whose `permissions` the user lacks; `accessCheckMode` is `'any'` (default) or `'all'`. This filters the UI only; enforce permissions on the server.
- `asyncSources: [{ id: 'docs', load: (query, { signal }) => searchDocs(query, signal) }]` merges server results, debounced and abortable.

## Routers, Next.js and SSR

- React Router data router: `onNavigate: (href) => router.navigate(href)`. To use `useNavigate()`, render the provider inside the router and `useMemo` the config.
- Next.js App Router: start the command menu file with `'use client'`, build the config with `useMemo(() => ({ onNavigate: (href: string) => router.push(href) }), [router])` using `useRouter()` from `next/navigation`, and render it in the root layout around `children`. A Server Component cannot pass functions such as `onNavigate` to the provider.
- SSR is safe: the palette starts closed, and frecency storage falls back to memory on the server.
- Route discovery: `scanRoutes(routes)` from `cmdk-engine/adapters/react-router` turns a React Router route array into commands. For Next.js, `npx cmdk-engine scan` (the CLI in the installed package) writes `src/generated/command-routes.json`; `sitemapToCommands(sitemap)` from `cmdk-engine/adapters/sitemap` turns that file into commands.

## Styling

Nothing is styled: without CSS the dialog has no overlay and no position. Style cmdk's parts from a global stylesheet (Tailwind can `@apply` utilities to the same selectors), or pass `className`, `overlayClassName`, `contentClassName`, `inputClassName`, `listClassName`, `itemClassName`, `groupClassName` or `emptyClassName`. A base to adapt to the app's theme and dark mode:

```css
[cmdk-overlay] { position: fixed; inset: 0; z-index: 50; background: rgb(0 0 0 / 0.4); }
[cmdk-dialog] { position: fixed; top: 15vh; left: 50%; z-index: 50; transform: translateX(-50%); width: min(560px, calc(100vw - 32px)); }
[cmdk-root] { overflow: hidden; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; color: #111827; box-shadow: 0 16px 48px rgb(0 0 0 / 0.2); }
[cmdk-input] { box-sizing: border-box; width: 100%; padding: 14px 16px; border: 0; border-bottom: 1px solid #e5e7eb; font: inherit; font-size: 16px; outline: none; }
[cmdk-input]:focus-visible { box-shadow: inset 0 -1px 0 #6366f1; }
[cmdk-list] { max-height: 320px; overflow-y: auto; padding: 8px; }
[cmdk-group-heading] { padding: 8px 8px 4px; font-size: 12px; color: #6b7280; }
[cmdk-item] { padding: 8px; border-radius: 8px; cursor: pointer; }
[cmdk-item][data-selected='true'] { background: #f3f4f6; }
[data-cmdk-engine-item] { display: flex; align-items: center; gap: 8px; }
[data-cmdk-engine-empty] { padding: 16px; text-align: center; color: #6b7280; }
```

Rows also carry `data-cmdk-engine-icon`, `data-cmdk-engine-item-content`, `data-cmdk-engine-item-label`, `data-cmdk-engine-item-description` and `data-cmdk-engine-item-shortcut` (with `kbd` keys). For shadcn/ui apps, see the themed palette on the [shadcn/ui docs page](https://priyans-hu.github.io/cmdk-engine/docs/shadcn/).

## Pitfalls

- Without `dialog`, `CommandPalette` renders inline and always visible. A Cmd+K modal needs `dialog`.
- "must be used within a <CommandEngineProvider>" means a hook runs outside the provider (or in the component that renders it), or two copies of cmdk-engine are installed.
- The adapter sets cmdk's `shouldFilter={false}` because the engine filters and ranks. For a custom UI, use `useCommandPalette()` (`search`, `setSearch`, `groupedResults`, `select`) and call `select(item)` so frecency and handlers run.
- Setting `config.onSelect` just for analytics silently replaces every `action` and `onNavigate`. Use `useCommandPaletteEvents((event) => ...)` instead.
- A config object written inline in JSX rebuilds the engine on every render.
