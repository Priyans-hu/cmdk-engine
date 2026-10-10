---
'cmdk-engine': minor
---

Add `onSelectError(error, item)` to the provider config. It is called when the handler a selection runs (`onSelect`, the command's `action` or `onNavigate`) throws or returns a rejected promise, so a failing async action no longer ends up as an unhandled rejection. The palette still closes right away. Without it, nothing changes.
