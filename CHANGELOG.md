# cmdk-engine

## 0.1.0

### Minor Changes

- 2278bb8: Initial release of cmdk-engine v0.1.0

  **Core Engine:**
  - Command registry with pub/sub (useSyncExternalStore compatible)
  - Built-in lightweight fuzzy search (< 1KB)
  - Optional match-sorter search adapter
  - Keyword synonym engine with bidirectional lookup
  - RBAC access control filter (any/all modes)
  - Frecency ranking with exponential decay algorithm
  - Command group management with priority ordering

  **React Hooks:**
  - CommandEngineProvider context
  - useCommandPalette (search + filter + rank pipeline)
  - useCommandRegister (component-colocated registration)
  - useFrecency (direct frecency access)

  **Adapters:**
  - cmdk UI adapter (shouldFilter=false, auto-select first item)
  - React Router v6/v7 route scanner
  - Next.js adapter (stub for Phase 2)

  **CLI Tool:**
  - `cmdk-engine scan` — auto-discover routes from React Router & Next.js
  - `cmdk-engine init` — create config file
  - `cmdk-engine validate` — validate config

  **cmdk Issues Solved:**
  - #264: Sort not restored after clearing search
  - #280: First item not selected with dynamic content
  - #375: Non-deterministic sorting
  - #267: Items not updating on async changes
