---
'cmdk-engine': patch
---

The cmdk adapter now runs commands whose id starts or ends with whitespace (for example `' billing '`). cmdk trims item values, so before, clicking such a command or pressing Enter on it did nothing, and the highlight could jump away from it when the results changed.
