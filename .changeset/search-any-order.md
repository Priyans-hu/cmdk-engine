---
'cmdk-engine': minor
---

Search now matches the words of a query in any order: "overview billing" finds "Billing Overview", and each word can match a different field ("invoices billing" finds a "Billing" command with the keyword "invoices"). These matches come after the commands that match the whole query, which keep their order and scores, and never score above the weakest of them. The built-in search and `cmdk-engine/search/match-sorter` both do this; with match-sorter, a keystroke on a large list can take up to about twice as long as match-sorter alone.
