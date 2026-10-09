---
'cmdk-engine': patch
---

Behavior change: a hook or component used outside `<CommandEngineProvider>` now names itself in the error and says how to fix it, for example `useCommandRegister must be used within a <CommandEngineProvider> (use it in a child of the provider, not in the component that renders the provider; two copies of cmdk-engine also cause this)`. Before, every hook said `useEngineContext must be used within a <CommandEngineProvider>`. If you match the error text, match "must be used within a <CommandEngineProvider>". `useEngineContext()` and `usePaletteState()` take an optional caller name for that message.
