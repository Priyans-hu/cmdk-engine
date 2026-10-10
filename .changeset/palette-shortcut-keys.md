---
'cmdk-engine': patch
---

`useCommandPaletteShortcut()` (both adapters) now opens the palette with Caps Lock on and on non-Latin keyboard layouts such as Russian or Greek, where it matches the physical K key. Holding Cmd+K / Ctrl+K no longer toggles the palette on every key repeat; the repeats are still blocked, so the browser's own Ctrl+K shortcut does not fire. Ctrl+Shift+K and AltGr key combinations still do not open it.
The hook also no longer runs the results pipeline a second time on every keystroke.
