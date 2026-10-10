---
'cmdk-engine': patch
---

The cmdk adapter's dialog now returns focus to the element that had it before the dialog opened, whether it closes with Escape, the shortcut, the overlay or a selected command. Before, focus went to the page body. If a command moves focus elsewhere, focus stays there. The Base UI adapter already did this.
