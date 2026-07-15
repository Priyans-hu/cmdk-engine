# cmdk-engine

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
