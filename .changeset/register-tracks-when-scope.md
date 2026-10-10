---
'cmdk-engine': patch
---

Behavior change: `useCommandRegister(commands)` without `deps` now re-registers when a command's `when` result, `scope` or text icon changes, so a command gated by `when: isAdmin` or `when: () => plan === 'pro'` appears and disappears as its condition changes. Before, these kept their first-render values until another field changed. `when()` now also runs while the registering component renders, so keep it pure. Element icons and `meta` are still not compared: pass `deps` when they change.
