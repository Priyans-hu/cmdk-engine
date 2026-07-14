import { describe, it, expect } from 'vitest'
import { createMatchSorterSearch } from '../../src/core/search-match-sorter'
import type { CommandItem } from '../../src/core/types'

function cmd(o: Partial<CommandItem>): CommandItem {
  return { id: 'x', label: 'x', ...o }
}

const items: CommandItem[] = [
  cmd({ id: 'billing', label: 'Billing' }),
  cmd({ id: 'secret', label: 'Secret Admin', hidden: true }),
  cmd({ id: 'settings', label: 'Settings', priority: 5 }),
]

// Let the eager dynamic import of match-sorter resolve.
const tick = () => new Promise((r) => setTimeout(r, 50))

describe('createMatchSorterSearch', () => {
  it('empty query excludes hidden items and sorts by priority', () => {
    const engine = createMatchSorterSearch()
    const res = engine.search('', items)
    expect(res.map((r) => r.item.id)).toEqual(['settings', 'billing'])
    expect(res.find((r) => r.item.id === 'secret')).toBeUndefined()
  })

  it('keeps hidden items searchable with a query — fallback path (pre-load)', () => {
    const engine = createMatchSorterSearch()
    // Searching synchronously right after creation hits the fallback ranker
    // (match-sorter has not resolved yet). Hidden items must still match.
    const res = engine.search('secret', items)
    expect(res.map((r) => r.item.id)).toContain('secret')
  })

  it('ranks exact/prefix matches first — fallback path', () => {
    const engine = createMatchSorterSearch()
    const res = engine.search('bill', items)
    expect(res[0]?.item.id).toBe('billing')
  })

  it('keeps hidden items searchable once match-sorter has loaded', async () => {
    const engine = createMatchSorterSearch()
    await tick()
    const res = engine.search('secret admin', items)
    expect(res.map((r) => r.item.id)).toContain('secret')
  })

  it('empty query still returns all non-hidden items after load', async () => {
    const engine = createMatchSorterSearch()
    await tick()
    const res = engine.search('', items)
    expect(res.map((r) => r.item.id).sort()).toEqual(['billing', 'settings'])
  })
})
