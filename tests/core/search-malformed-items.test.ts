import { describe, it, expect } from 'vitest'
import { createFuzzySearch } from '../../src/core/search'
import { createKeywordEngine } from '../../src/core/keywords'
import { createMatchSorterSearch } from '../../src/core/search-match-sorter'
import type { CommandItem } from '../../src/core/types'

// Commands typed as CommandItem can still arrive malformed from plain JS or JSON.
const malformed = (o: Record<string, unknown>) => o as unknown as CommandItem

const billing: CommandItem = { id: 'billing', label: 'Billing Overview', keywords: ['invoices'] }
const noLabel = malformed({ id: 'no-label', keywords: ['billing'] })
const numericLabel = malformed({ id: 'numeric-label', label: 42 })
const badKeywords = malformed({
  id: 'bad-keywords',
  label: 'Reports',
  keywords: ['sales', null, 7],
})
const badDescription = malformed({ id: 'bad-description', label: 'Team', description: 5 })

const ids = (results: { item: CommandItem }[]) => results.map((r) => r.item.id)

// Let the eager dynamic import of match-sorter resolve.
const tick = () => new Promise((r) => setTimeout(r, 50))

describe('createFuzzySearch · malformed items', () => {
  const search = createFuzzySearch()
  const items = [noLabel, numericLabel, badKeywords, badDescription, billing]

  it('treats a missing or non-string label as empty', () => {
    expect(ids(search.search('billing over', items))).toEqual(['billing'])
    expect(ids(search.search('42', items))).toEqual([])
  })

  it('still matches other fields of a command without a label', () => {
    expect(ids(search.search('billing', items))).toEqual(['billing', 'no-label'])
  })

  it('skips keywords that are not strings', () => {
    expect(ids(search.search('sales', items))).toEqual(['bad-keywords'])
    expect(ids(search.search('null', items))).toEqual([])
  })

  it('skips a description that is not a string', () => {
    expect(ids(search.search('team', items))).toEqual(['bad-description'])
  })

  it('lists every item on an empty query', () => {
    expect(ids(search.search('', items))).toEqual(ids(items.map((item) => ({ item }))))
  })
})

describe('createKeywordEngine · malformed items', () => {
  const keywords = createKeywordEngine({ billing: ['money'], reports: ['analytics'] })

  it('enriches a command without a label', () => {
    const enriched = keywords.enrichItem(noLabel)
    expect(enriched.keywords).toEqual(['billing'])
    expect(enriched.meta?._synonymKeywords).toEqual(['money'])
  })

  it('keeps only string keywords', () => {
    const enriched = keywords.enrichItem(badKeywords)
    expect(enriched.keywords).toEqual(['sales'])
    expect(enriched.meta?._synonymKeywords).toEqual(['analytics'])
  })

  it('ignores keywords that are not an array', () => {
    const enriched = keywords.enrichItem(malformed({ id: 'a', label: 'A', keywords: 5 }))
    expect(enriched.keywords).toEqual([])
  })
})

describe('createMatchSorterSearch · malformed items', () => {
  const items = [noLabel, badKeywords, billing]

  it('first search treats a missing label as empty and skips non-string keywords', () => {
    const engine = createMatchSorterSearch()
    expect(ids(engine.search('bill', items)).sort()).toEqual(['billing', 'no-label'])
    expect(ids(engine.search('sales', items))).toEqual(['bad-keywords'])
  })

  it('does not throw once match-sorter has loaded', async () => {
    const engine = createMatchSorterSearch()
    await tick()
    expect(ids(engine.search('billing', items))).toContain('billing')
    expect(ids(engine.search('sales', items))).toEqual(['bad-keywords'])
  })
})
