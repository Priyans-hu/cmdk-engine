---
'cmdk-engine': patch
---

Fix `CommandEngineProvider` without a `config` prop re-rendering every component that uses its hooks (such as `useCommandRegister`) on each keystroke.
