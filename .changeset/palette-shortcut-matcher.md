---
'cmdk-engine': minor
---

`useCommandPaletteShortcut()` (both adapters) also takes a function that decides which keydown toggles the palette, modifiers included, for shortcuts other than Cmd/Ctrl plus one key, for example `useCommandPaletteShortcut((e) => e.key === '/')`. Matching keys are blocked and key repeats are ignored, as with a string.
