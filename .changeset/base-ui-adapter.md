---
'cmdk-engine': minor
---

Add a Base UI adapter, `cmdk-engine/adapters/base-ui`: `CommandPalette` and `useCommandPaletteShortcut` with the cmdk adapter's props (except `vimBindings`) and markup, built on `@base-ui/react`'s Autocomplete and Dialog (new optional peer, `^1.1.0`). Disabled commands are never highlighted and are skipped by the arrow keys, as in the cmdk adapter. Also adds the `palette.close` translation key, which labels its dialog's close button.
