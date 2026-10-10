---
'cmdk-engine': minor
---

Add `useCommandPaletteEvents(onEvent)` to `cmdk-engine/react`, for analytics without shipping telemetry. Call it once inside the provider to receive `open`, `close`, `search` (the settled query and its result count; `0` means it found nothing), `select` (the command, the query and, for loaded items, the async source id) and `asyncError` events, typed as `CommandPaletteEvent` from `cmdk-engine`. An error thrown by `onEvent` never breaks the palette. Without the hook, nothing is reported, and bundlers leave the hook's code out.
