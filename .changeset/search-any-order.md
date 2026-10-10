---
'cmdk-engine': minor
---

Search now matches the words of a query in any order: "overview billing" finds "Billing Overview", and each word can match a different field ("invoices billing" finds a "Billing" command with the keyword "invoices"). These matches come after the commands that match the whole query, which keep their order and scores, and never score above the weakest of them. A repeated word counts once. The built-in search and `cmdk-engine/search/match-sorter` both do this. With match-sorter, a keystroke with several words takes about 1.5 to 2 times as long as match-sorter alone on Node 22 and 2 to 3 times on Node 20, the most for three or more words (about 10 to 28 ms per keystroke for 10,000 commands).
