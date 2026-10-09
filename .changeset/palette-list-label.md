---
'cmdk-engine': patch
---

Both adapters now name the results listbox with the `palette.list` translation key (default "Suggestions"), so `config.t` localizes it. The cmdk adapter's listbox was always named "Suggestions" in English, and the Base UI adapter's had no name. A `t` that returns the key unchanged (the `dictionary[key] ?? key` pattern) or an empty string keeps "Suggestions".
