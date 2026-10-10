# cmdk-engine

## What This Is

A headless command palette engine for React that works with [cmdk](https://github.com/dip/cmdk) or Base UI. It adds the "brain" layer that cmdk doesn't provide: route auto-discovery, RBAC filtering, fuzzy search with synonyms, frecency ranking, and a CLI tool for route scanning.

## Architecture

```
Router Config -> Route Adapter -> Command Registry -> Keyword Engine -> Access Control -> Search + Ranking -> Headless API/Hooks -> UI Adapter (cmdk or Base UI)
```

### Entry Points

| Import Path | Purpose |
|---|---|
| `cmdk-engine` | Core engine (types, registry, search, keywords, access control, frecency) |
| `cmdk-engine/react` | React hooks (CommandEngineProvider, useCommandPalette, useCommandRegister) |
| `cmdk-engine/adapters/cmdk` | cmdk UI adapter |
| `cmdk-engine/adapters/react-router` | React Router v6/v7/v8 route scanner |
| `cmdk-engine/search/match-sorter` | Optional match-sorter search backend |
| `cmdk-engine/adapters/base-ui` | Base UI adapter (Autocomplete + Dialog) |
| `cmdk-engine/adapters/sitemap` | `sitemapToCommands`: turns the CLI's sitemap into commands |

### Key Design Decisions

- **Core is framework-agnostic**: `src/core/` has zero runtime dependencies, works without React
- **Registry uses pub/sub pattern**: Compatible with React's `useSyncExternalStore`
- **cmdk adapter sets `shouldFilter={false}`**: We own all filtering, solving cmdk's sorting/selection bugs
- **Frecency uses exponential decay**: Half-life algorithm, not simple counters
- **CLI reads files with a small hand-written tokenizer** (`src/cli/lexer.ts`): route files and the TS config are read, never run, and no parser is bundled

## Tech Stack

- TypeScript 6.x strict mode
- tsup for building (ESM + CJS dual publish)
- Vitest for testing
- Bun as package manager
- Changesets for versioning

## Build

```bash
bun install
bun run build     # Build all entry points
bun run test      # Run tests (not `bun test`: that is Bun's own runner and fails)
bun run test:dist # Run tests against the built package (after build)
bun run lint      # Lint
bun run typecheck # Type check
bun run size      # Size budgets (after build)
```

## File Structure

- `src/core/` — Framework-agnostic engine
- `src/react/` — React hooks and provider
- `src/adapters/` — cmdk, base-ui, react-router and sitemap adapters
- `src/cli/` — CLI tool (scan, init, validate commands)
- `tests/` — Mirrors src/ structure
- `tests-dist/`: tests of the built package, including the README fences marked `<!-- readme-test: ... -->`
- `examples/`: runnable apps (Vite + React Router, Next.js App Router, shadcn/ui)
- `docs/` — Next.js docs site. It runs this repo's build: `bun run build`, then `node scripts/local-build.mjs docs` (again after each build and after `bun install` in `docs/`)

## Conventions

- Barrel exports via `index.ts` in each directory
- Types defined in `src/core/types.ts`, re-exported from entry points
- Tests colocated in `tests/` mirroring `src/` structure
- Conventional commits: `feat(core):`, `fix(adapter):`, `docs:`, `chore:`
