# cmdk-engine

## 0.6.0

### Minor Changes

- 8873b92: Add `config.asyncSources`: commands loaded for each query (such as a server-side search), debounced, aborted when stale, and loaded once in the provider for every consumer. `isLoading` and `asyncErrors` report progress and per-source failures; `shouldFilter: false` shows server-matched items as returned; remote hrefs are limited to relative, http(s), mailto and tel.
- 499993a: React Router adapter: support `react-router` 8 (peer range `^6 || ^7 || ^8`). `scanRoutes` now accepts React Router 6, 7 and 8 route types and your own route interfaces without a cast, and discovers index routes: they resolve to their parent's URL (`/` for a pathless root), and their `handle.command` is merged over the parent's command.

### Patch Changes

- 579fbd2: Fix malformed items crashing the palette. Items from an async source without a non-empty string `id` and `label` (children included) are now dropped when they load, the rest still show, and `asyncErrors[id]` reports them, for example "2 items dropped: missing label". Non-string `keywords` entries on loaded items are removed.
  Search and keyword enrichment now skip a missing or non-string `label`, `description` or keyword, so a registered command without a label, or with `keywords: ['a', null]`, no longer throws.
- 2e9ae66: The cmdk adapter's `CommandPalette` dialog now opens on the first enabled item in display order instead of the item highlighted when it last closed, and the palette never highlights a disabled item or, when groups reorder the results, an item lower in the list.
  With frecency on, a command you just ran still ranks first, so it is also the first item on the next open.
- 586f51a: Fix `CommandPalette` and `useCommandPaletteShortcut` from `cmdk-engine/adapters/cmdk` throwing "useEngineContext must be used within a <CommandEngineProvider>" under a provider from `cmdk-engine/react`, as in the README Quick Start.
  The react and cmdk adapter entries now import the entries they build on instead of bundling private copies, so they share one set of React contexts and ship less code.
- 6f65438: Fix `CommandEngineProvider` crashing the app when reading `window.localStorage` throws, as in sandboxed iframes and browsers that block cookies: frecency and search history now fall back to memory there.
  Malformed data under the frecency or search-history `localStorage` keys (such as another app's data) is now ignored and replaced on the next write instead of throwing.
- 688c08d: Fix `synonyms` not expanding the query: when the whole query equals a synonym key or value (for example "money" with `synonyms: { billing: ['money'] }`), the palette now also returns what the other terms match, after the direct matches and scored below them.
  This works with the fuzzy, match-sorter and custom search engines (a custom engine is called once more per extra term). Partial words do not expand, and match-sorter still ignores the command-side synonym keywords.

## 0.5.1

### Patch Changes

- Fix the CLI binary failing with "Cannot find package 'commander'" on a fresh install. `commander` is a devDependency and was externalized from the bundle, so it was never available to consumers. The CLI is now emitted as a self-contained CommonJS bin (`dist/cli/index.cjs`) with `commander` bundled in, so `npx cmdk-engine scan` works with no extra install.

## 0.5.0

### Minor Changes

- CLI hardening, runtime fixes, and smaller installs.

  **CLI**
  - String-literal-safe config parsing: values containing `//`, `:`, or apostrophes (URLs, `faq: ...`, `don't`) are no longer corrupted. Also strips a UTF-8 BOM and supports `.mjs/.cjs/.mts/.cts` configs.
  - Scanners: strip commented-out route definitions; only skip the top-level `api/` dir (a nested `api` folder can be a real page route); deduplicate colliding Next.js paths; guard against symlink loops; portable, forward-slashed `source` paths; broader file-extension support.
  - `scan`: validates `--format`; errors on a missing routes dir and on zero routes (`--allow-empty` to override) instead of silently overwriting good output; requires an explicitly-passed `--config` to exist; drops the `as const` that made generated `.ts` fail to type-check; reuses the prior timestamp when routes are unchanged (idempotent output).
  - User `exclude` now supports globs (boundary-checked) and RegExp, matching the runtime adapter (`CmdkEngineConfig.exclude` widened to `ExcludePattern[]`).
  - `validate` reports `framework: 'custom'` as not-yet-scannable (agrees with `scan`) and type-checks `routesDir`/`output`; `init` gains error handling and `-c/--config`.

  **Runtime**
  - `useCommandRegister` no longer freezes `action` closures: without an explicit `deps` array it re-registers on command shape changes and delegates actions to the latest closure via a live ref.
  - Search history persists to `localStorage` by default (SSR-safe), so `SearchHistoryConfig.storageKey` works as documented.
  - `frecency.cleanup()` actually removes stale entries via a new optional `FrecencyStorage.delete()` (non-breaking; custom storages fall back to zeroing).
  - Accessibility: localized accessible name for the palette and breadcrumb back button; decorative icons/separators marked `aria-hidden`. The controlled active item resets when it's no longer in the results.
  - `pathToGroup` ignores leading dynamic segments (`/:tenantId/billing` → `Billing`).

  **Packaging / tooling**
  - Source maps are no longer published (roughly halves the npm tarball).
  - Coverage thresholds are enforced, `tests/` are type-checked, CI cancels superseded runs, dependabot watches `docs/`, and the release workflow fails fast if a pushed tag doesn't match `package.json`.

## 0.4.0

### Minor Changes

- 0b5e20c: Harden for public use and real-world RBAC.

  **New features**
  - Per-command access mode: `CommandItem.accessMode` (`'any' | 'all'`) overrides the engine-wide `accessCheckMode`, so a single palette can mix needs-any and needs-all permission requirements.
  - Dynamic visibility: `CommandItem.when` (`boolean | () => boolean`) removes a command entirely when it resolves false — the hook for feature flags, plan/org gating, and runtime conditions beyond static permissions. Exposed via `isCommandVisible`/`filterVisible`.
  - SPA navigation: `CommandEngineConfig.onNavigate(href, item)` routes `href`-only commands through your router instead of a full-page `window.location` reload.
  - `useEngineContext` and `usePaletteState` are now exported for building custom palette UIs.

  **Fixes**
  - Packaging: `require` now resolves the `.d.cts` declarations (was masquerading as ESM); subpath types resolve under node10 via `typesVersions`; `cmdk`, `match-sorter`, `react-router`, and `react-router-dom` are declared as optional peer dependencies.
  - The React entry points now ship a `'use client'` directive (Next.js App Router / RSC safe).
  - Palette open/search/navigation state is shared across all consumers under one provider, so `useCommandPaletteShortcut` and `<CommandPalette>` stay in sync (fixes Cmd+K not opening the dialog).
  - The match-sorter search backend now keeps `hidden` items searchable under a non-empty query, matching the built-in fuzzy search.
  - Frecency persists to localStorage by default (SSR-safe), as documented.
  - `registry.update()` can no longer change an item's id out from under its map key; transitive search tie-breaking; root `'/'` context scope now matches; frecency clamps future-dated timestamps and stays within `[0,1]`; `searchHistory.getRecent(0)` returns none; acronym-aware route labels; and the keyword/grouping factories are safe to destructure.

  **Performance**
  - Precomputed synonym index, single frecency-store read per rank, split query-independent enrichment memo, field-level engine memoization in the provider, and reuse of the memoized grouping — cutting redundant work on every keystroke.
