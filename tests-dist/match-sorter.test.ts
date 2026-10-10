import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
// Self-reference: resolves through package.json `exports` to the built dist/, not src/.
import { createMatchSorterSearch } from 'cmdk-engine/search/match-sorter'

const items = [
  { id: 'team', label: 'Team Members', description: 'Invite people' },
  { id: 'billing', label: 'Billing Overview' },
]

// The entry imports match-sorter statically, so the very first search already
// ranks with it: only match-sorter matches the description here.
describe('built package: match-sorter entry', () => {
  it('ranks with match-sorter from the first search through the ESM entry', () => {
    const results = createMatchSorterSearch().search('invite', items)
    expect(results.map((r) => r.item.id)).toEqual(['team'])
  })

  it('ranks with match-sorter from the first search through the CJS entry', () => {
    const require = createRequire(import.meta.url)
    const entry = require('cmdk-engine/search/match-sorter') as {
      createMatchSorterSearch: typeof createMatchSorterSearch
    }
    const results = entry.createMatchSorterSearch().search('invite', items)
    expect(results.map((r) => r.item.id)).toEqual(['team'])
  })
})
