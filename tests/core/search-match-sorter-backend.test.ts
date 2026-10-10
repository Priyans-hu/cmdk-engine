import { describe, it, expect } from 'vitest'
import { createMatchSorterSearch } from '../../src/core/search-match-sorter'
import { createKeywordEngine } from '../../src/core/keywords'
import type { CommandItem, ScoredItem } from '../../src/core/types'

const ids = (results: ScoredItem[]) => results.map((r) => r.item.id)
// Gives a lazily loaded match-sorter time to resolve.
const tick = () => new Promise((r) => setTimeout(r, 50))

const keywords = createKeywordEngine({ settings: ['config', 'preferences'] })
const items: CommandItem[] = keywords.enrichAll([
  { id: 'settings', label: 'Settings' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'billing', label: 'Billing Overview', keywords: ['invoices'] },
  { id: 'team', label: 'Team Members', description: 'Invite people' },
  { id: 'cafe', label: 'Caf\u00e9' },
])

describe('createMatchSorterSearch · ranks with match-sorter from the first search', () => {
  it('gives the same results right after creation as later', async () => {
    const engine = createMatchSorterSearch()
    const first = engine.search('invite', items)
    await tick()
    expect(ids(first)).toEqual(['team'])
    expect(ids(first)).toEqual(ids(engine.search('invite', items)))
  })
})

describe('createMatchSorterSearch · synonym keywords', () => {
  it('finds a command by its synonym keywords, also while the word is partial', async () => {
    const engine = createMatchSorterSearch()
    await tick()
    expect(ids(engine.search('preferences', items))).toEqual(['settings'])
    expect(ids(engine.search('prefer', items))).toEqual(['settings'])
  })

  it('ranks synonym matches below direct matches', async () => {
    const engine = createMatchSorterSearch()
    await tick()
    expect(ids(engine.search('config', items))).toEqual(['configuration', 'settings'])
  })
})

describe('createMatchSorterSearch · folded query', () => {
  it('matches a decomposed query and collapses repeated spaces', async () => {
    const engine = createMatchSorterSearch()
    await tick()
    expect(ids(engine.search('Cafe\u0301', items))).toEqual(['cafe'])
    expect(ids(engine.search('billing  over', items))).toEqual(['billing'])
  })

  it('a query that folds to nothing matches nothing', async () => {
    const engine = createMatchSorterSearch()
    await tick()
    expect(engine.search('\u00b4', items)).toEqual([])
  })
})

describe('createMatchSorterSearch · words in any order', () => {
  it('appends commands that have every word, after the whole-query matches', async () => {
    const engine = createMatchSorterSearch()
    await tick()
    const list = [...items, { id: 'report', label: 'Overview Billing Report' }]
    expect(ids(engine.search('overview billing', list))).toEqual(['report', 'billing'])
    expect(ids(engine.search('invoices billing', items))).toEqual(['billing'])
    expect(ids(engine.search('overview team', items))).toEqual([])
  })

  it('checks a repeated word once', () => {
    let reads = 0
    const item = {
      id: 'billing',
      get label() {
        reads++
        return 'Billing Area'
      },
    }
    const engine = createMatchSorterSearch()
    expect(ids(engine.search('area area billing', [item]))).toEqual(['billing'])
    expect(ids(engine.search('billing billing', [item]))).toEqual(['billing'])
    reads = 0
    expect(ids(engine.search(`${'a '.repeat(500)}billing`, [item]))).toEqual(['billing'])
    // A few reads per distinct word, not per word typed.
    expect(reads).toBeLessThan(20)
  })

  it('keeps scores decreasing down the list', async () => {
    const engine = createMatchSorterSearch()
    await tick()
    const scores = engine
      .search('overview billing', [...items, { id: 'r', label: 'Overview Billing' }])
      .map((r) => r.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })
})

describe('createMatchSorterSearch · scripts and case', () => {
  // Composed, as typed and as command text is usually written.
  const settings = '설정'.normalize('NFC')
  const password = 'パスワード'.normalize('NFC')
  const guide = 'ガイド'.normalize('NFC')
  const list: CommandItem[] = [
    { id: 'settings', label: settings },
    { id: 'password', label: password },
    { id: 'guide', label: guide },
  ]

  it('matches Hangul and voiced kana as written', () => {
    const engine = createMatchSorterSearch()
    expect(ids(engine.search(settings, list))).toEqual(['settings'])
    expect(ids(engine.search(settings.slice(0, 1), list))).toEqual(['settings'])
    expect(ids(engine.search(password, list))).toEqual(['password'])
    expect(ids(engine.search(password.slice(0, 2), list))).toEqual(['password'])
    expect(ids(engine.search(guide, list))).toEqual(['guide'])
  })

  it('ranks an exact-case match first', () => {
    const engine = createMatchSorterSearch()
    const cased = [
      { id: 'lower', label: 'api' },
      { id: 'upper', label: 'API' },
    ]
    expect(ids(engine.search('API', cased))).toEqual(['upper', 'lower'])
    expect(ids(engine.search('api', cased))).toEqual(['lower', 'upper'])
  })
})
