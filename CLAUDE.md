# cmdk-engine

## What This Is

A headless command palette engine for React, built on top of [cmdk](https://github.com/pacocoursey/cmdk). It adds the "brain" layer that cmdk doesn't provide: route auto-discovery, RBAC filtering, fuzzy search with synonyms, frecency ranking, and a CLI tool for route scanning.

## Architecture

```
Router Config -> Route Adapter -> Command Registry -> Keyword Engine -> Access Control -> Search + Ranking -> Headless API/Hooks -> UI Adapter (cmdk)
```

### Entry Points

| Import Path | Purpose |
|---|---|
| `cmdk-engine` | Core engine (types, registry, search, keywords, access control, frecency) |
| `cmdk-engine/react` | React hooks (CommandEngineProvider, useCommandPalette, useCommandRegister) |
| `cmdk-engine/adapters/cmdk` | cmdk UI adapter |
| `cmdk-engine/adapters/react-router` | React Router v6/v7 route scanner |
| `cmdk-engine/search/match-sorter` | Optional match-sorter search backend |

### Key Design Decisions

- **Core is framework-agnostic**: `src/core/` has zero runtime dependencies, works without React
- **Registry uses pub/sub pattern**: Compatible with React's `useSyncExternalStore`
- **cmdk adapter sets `shouldFilter={false}`**: We own all filtering, solving cmdk's sorting/selection bugs
- **Frecency uses exponential decay**: Half-life algorithm, not simple counters
- **CLI uses AST-light parsing**: Regex-based route extraction, no heavy TS compiler API

## Tech Stack

- TypeScript 5.x strict mode
- tsup for building (ESM + CJS dual publish)
- Vitest for testing
- Bun as package manager
- Changesets for versioning

## Build

```bash
bun install
bun run build    # Build all entry points
bun test         # Run tests
bun run lint     # Lint
bun run typecheck # Type check
```

## File Structure

- `src/core/` — Framework-agnostic engine
- `src/react/` — React hooks and provider
- `src/adapters/` — cmdk, react-router, nextjs adapters
- `src/cli/` — CLI tool (scan, init, validate commands)
- `tests/` — Mirrors src/ structure
- `docs/` — Next.js docs site

## Conventions

- Barrel exports via `index.ts` in each directory
- Types defined in `src/core/types.ts`, re-exported from entry points
- Tests colocated in `tests/` mirroring `src/` structure
- Conventional commits: `feat(core):`, `fix(adapter):`, `docs:`, `chore:`
