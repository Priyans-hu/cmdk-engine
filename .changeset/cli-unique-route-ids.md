---
'cmdk-engine': patch
---

Behavior change: when routes share an id (`/a_b` and `/ab` both give `ab`), `cmdk-engine scan` now gives every route a unique one. The last of them in path order keeps the id, as it is the one a registry kept before, so its frecency and Recent history stay. The others get `ab-2`, `ab-3`, ..., and the scan prints a warning for each. Before, they shared the id and one replaced the other in the palette.
