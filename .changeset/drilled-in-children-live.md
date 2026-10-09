---
'cmdk-engine': patch
---

Fix the children of a command you drilled into staying a snapshot: when the registered command's `children` change while the palette shows them, the list now updates. A parent that is no longer registered keeps showing the children it had.
