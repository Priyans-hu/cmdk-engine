---
'cmdk-engine': patch
---

The cmdk adapter's `CommandPalette` dialog now opens on the first enabled item in display order instead of the item highlighted when it last closed, and the palette never highlights a disabled item or, when groups reorder the results, an item lower in the list.
With frecency on, a command you just ran still ranks first, so it is also the first item on the next open.
