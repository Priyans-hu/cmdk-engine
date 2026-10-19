# cmdk-engine

Permission-aware command palette engine for React. Works with [cmdk](https://github.com/dip/cmdk) or [Base UI](https://base-ui.com). Auto-discover routes, fuzzy search with synonyms, RBAC filtering, frecency ranking, CLI tooling. The Quick Start stack (provider, register hook, cmdk adapter and shortcut) is about 8.3 kB min + brotli on top of React and cmdk.

[![npm version](https://img.shields.io/npm/v/cmdk-engine.svg)](https://www.npmjs.com/package/cmdk-engine)
[![npm downloads](https://img.shields.io/npm/dm/cmdk-engine.svg)](https://www.npmjs.com/package/cmdk-engine)
[![license](https://img.shields.io/npm/l/cmdk-engine.svg)](https://github.com/Priyans-hu/cmdk-engine/blob/main/LICENSE)

![The cmdk adapter's palette opened with Cmd+K, styled with the CSS from the Styling section](https://raw.githubusercontent.com/Priyans-hu/cmdk-engine/main/.github/assets/palette.png)

**Live demo:** press Cmd+K (Ctrl+K) on the [docs site](https://priyans-hu.github.io/cmdk-engine/). Runnable apps are in [Examples](https://priyans-hu.github.io/cmdk-engine/docs/examples/).

**Docs:** [Getting started](https://priyans-hu.github.io/cmdk-engine/docs/getting-started/), [the full guide](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md) (everything on one page), [API reference](https://priyans-hu.github.io/cmdk-engine/docs/api/).

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
npm install cmdk-engine cmdk
```

Or use `bun add`, `pnpm add` or `yarn add`. For the [Base UI](https://base-ui.com) adapter, install `@base-ui/react` instead of `cmdk`. It needs React 18 or 19, and the core engine has no runtime dependencies. Every optional peer and supported version is under [Requirements](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#requirements).

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
has no styles until you add some (see [Styling](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#styling)). In a Next.js App
Router project, put `'use client'` at the top of this file.

`useCommandPaletteShortcut()` binds Cmd+K / Ctrl+K. Call it in a component
**inside** `CommandEngineProvider`, like `Palette` above: without it nothing
opens the dialog, and in the component that renders the provider it throws.

Next steps: [split it into files, navigate with your router, handle errors, or build your own UI with the hooks](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#beyond-the-quick-start).

---

## Features

- **Route discovery:** turn your React Router config into commands at runtime, or scan a React Router or Next.js app with the CLI. [React Router](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#react-router-integration), [Next.js](https://priyans-hu.github.io/cmdk-engine/docs/nextjs/), [CLI](https://priyans-hu.github.io/cmdk-engine/docs/cli/)
- **Access control:** show each user only the commands they can use, with permissions in any/all modes and `when` checks. [RBAC](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#rbac--access-control)
- **Search:** fuzzy matching that tolerates typos, takes words in any order and ignores accents, plus synonyms. Or plug in match-sorter or your own engine. [Search](https://priyans-hu.github.io/cmdk-engine/docs/search/), [Synonyms](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#synonyms)
- **Ranking:** frecency puts frequent and recent commands first, with a Recent group. Commands for the current page get a boost, and ties keep a stable order. [Frecency](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#frecency-ranking), [Context boosting](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#context--scope-boosting)
- **Nested commands and groups:** sub-menus with breadcrumbs, and group headings in the order you choose. [Nested commands](https://priyans-hu.github.io/cmdk-engine/docs/nested-commands/), [Groups](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#groups)
- **Async sources:** mix registered commands with server results, debounced, abortable and loaded once per query. [Async sources](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#async-command-sources)
- **Your UI:** the cmdk or Base UI adapter, a shadcn/ui registry item, or headless hooks for a fully custom palette. [Adapters](https://priyans-hu.github.io/cmdk-engine/docs/adapters/), [shadcn/ui](https://priyans-hu.github.io/cmdk-engine/docs/shadcn/), [Hooks](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#or-build-your-own-ui-with-hooks)
- **Also:** i18n, search history, palette events for analytics, exported types, and how to test your palette. [i18n](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#internationalization-i18n), [Search history](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#search-history), [Events](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#palette-events), [Types](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#type-safety), [Testing](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md#testing)

---

## Documentation

- **[Docs site](https://priyans-hu.github.io/cmdk-engine/docs/):** [Getting started](https://priyans-hu.github.io/cmdk-engine/docs/getting-started/), [Core](https://priyans-hu.github.io/cmdk-engine/docs/core/), [Search](https://priyans-hu.github.io/cmdk-engine/docs/search/), [Nested commands](https://priyans-hu.github.io/cmdk-engine/docs/nested-commands/), [Adapters](https://priyans-hu.github.io/cmdk-engine/docs/adapters/), [Next.js](https://priyans-hu.github.io/cmdk-engine/docs/nextjs/), [CLI](https://priyans-hu.github.io/cmdk-engine/docs/cli/), [API](https://priyans-hu.github.io/cmdk-engine/docs/api/), [Styling](https://priyans-hu.github.io/cmdk-engine/docs/styling/), [shadcn/ui](https://priyans-hu.github.io/cmdk-engine/docs/shadcn/), [Examples](https://priyans-hu.github.io/cmdk-engine/docs/examples/).
- **[GUIDE.md](https://github.com/Priyans-hu/cmdk-engine/blob/main/GUIDE.md):** the whole reference on one page.
- **[CHANGELOG.md](https://github.com/Priyans-hu/cmdk-engine/blob/main/CHANGELOG.md):** what changed in each release. Read "Check before upgrading" first.

---

## Use with AI coding agents (Agent Skill)

This repo ships an [Agent Skill](https://github.com/Priyans-hu/cmdk-engine/tree/main/skills/cmdk-engine) that teaches coding agents (Claude Code, Codex, Cursor, Copilot, Gemini CLI and more) to add a cmdk-engine palette to a React app: install, setup, commands and groups, the shortcut, ranking, SSR and styling.

```bash
npx skills add Priyans-hu/cmdk-engine   # add -g for all projects
```

Then ask your agent to "add a Cmd+K command palette".

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

[MIT](./LICENSE) &copy; [Priyanshu](https://github.com/Priyans-hu)

---

If you find cmdk-engine useful, please consider giving it a star on GitHub. It helps others discover the project.
