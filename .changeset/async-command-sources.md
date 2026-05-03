---
"cmdk-engine": minor
---

feat: async command sources with debounce + abort

Adds `config.asyncSources` to load commands from remote APIs (Linear, GitHub, internal search) and merge them into the palette in real time. Each source is debounced (default 200 ms, configurable per source) and cancelled on every new query via `AbortSignal`. `isLoading` now reflects whether any source is in flight, and `asyncErrors` exposes per-source errors so a failing source never breaks the palette.
