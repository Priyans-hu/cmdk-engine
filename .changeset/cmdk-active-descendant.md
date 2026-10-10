---
'cmdk-engine': patch
---

The cmdk adapter keeps `aria-activedescendant` on its input and results listbox pointing at the highlighted item, so screen readers announce it. cmdk updates the attribute only when it moves the highlight itself. Before, it named no item after the palette opened, and named an item that no longer existed after drilling into a nested page, going back, or typing a query that filtered out the highlighted item (axe: `aria-valid-attr-value`). The Base UI adapter already did this.
