# cmdk-engine

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
