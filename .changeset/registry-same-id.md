---
'cmdk-engine': patch
---

Behavior change: registering an existing id no longer replaces it for good; use `update()` to change a registered command. When two registrations share an id, the newest is shown, and removing either one now removes only that registration: the other stays, or comes back if it was replaced. Before, the first cleanup removed the id for both, so a command vanished while the component that registered it was still mounted. `unregister(id)` still removes every registration of the id.
