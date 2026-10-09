---
'cmdk-engine': patch
---

Fix `CommandPalette` and `useCommandPaletteShortcut` from `cmdk-engine/adapters/cmdk` throwing "useEngineContext must be used within a <CommandEngineProvider>" under a provider from `cmdk-engine/react`, as in the README Quick Start.
The react and cmdk adapter entries now import the entries they build on instead of bundling private copies, so they share one set of React contexts and ship less code.
