import { describe, it, expect } from 'vitest'
import { createFuzzySearch } from '../../src/core/search'
import type { CommandItem } from '../../src/core/types'

const search = (query: string, items: CommandItem[]) => createFuzzySearch().search(query, items)
const find = (query: string, items: CommandItem[]) => search(query, items).map((r) => r.item.id)

const items: CommandItem[] = [
  { id: 'billing', label: 'Billing Overview', keywords: ['invoices'] },
  { id: 'api', label: 'API Keys' },
  { id: 'team', label: 'Team Members', description: 'Invite people' },
  { id: 'home', label: 'Home' },
]

describe('createFuzzySearch · words in any order', () => {
  it('finds the words of a query in any order', () => {
    expect(find('overview billing', items)).toEqual(['billing'])
    expect(find('keys api', items)).toEqual(['api'])
    expect(find('members team', items)).toEqual(['team'])
  })

  it('matches each word against any field', () => {
    expect(find('invoices billing', items)).toEqual(['billing'])
    expect(find('people team', items)).toEqual(['team'])
  })

  it('needs every word to match', () => {
    expect(find('overview team', items)).toEqual([])
    expect(find('keys home', items)).toEqual([])
  })

  it('scores 0.9 × the weakest word when nothing matches the whole query', () => {
    // "overview" is a substring of the label (0.8), "billing" a prefix (0.95).
    const [hit] = search('overview billing', items)
    expect(hit.score).toBeCloseTo(0.9 * 0.8, 10)
  })

  it('lists whole-query matches first, with unchanged scores; the rest never score above them', () => {
    const inOrder: CommandItem = { id: 'in-order', label: 'Billing Overview' }
    const anyOrder: CommandItem = { id: 'any-order', label: 'Overview of billing' }
    const alone = search('bill over', [inOrder])
    const both = search('bill over', [anyOrder, inOrder])

    expect(both.map((r) => r.item.id)).toEqual(['in-order', 'any-order'])
    expect(both[0]).toEqual(alone[0])
    // On its own, the any-order match would score 0.9 × 0.8, above the in-order one.
    expect(search('bill over', [anyOrder])[0].score).toBeCloseTo(0.72, 10)
    expect(both[1].score).toBe(both[0].score)
  })

  it('orders any-order matches by how well their words match', () => {
    const list: CommandItem[] = [
      { id: 'weak', label: 'Keys', description: 'For the api' },
      { id: 'strong', label: 'API Keys' },
    ]
    expect(find('keys api', list)).toEqual(['strong', 'weak'])
  })

  it('keeps hidden commands searchable (not browsable), like whole-query matches', () => {
    const list = [{ id: 'secret', label: 'Secret Settings', hidden: true }]
    expect(find('settings secret', list)).toEqual(['secret'])
    expect(find('', list)).toEqual([])
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
    expect(find('area area billing', [item])).toEqual(['billing'])
    expect(find('billing billing', [item])).toEqual(['billing'])
    reads = 0
    expect(find(`${'a '.repeat(500)}billing`, [item])).toEqual(['billing'])
    // A few reads per distinct word, not per word typed.
    expect(reads).toBeLessThan(20)
  })

  it('matches a query of one word exactly as before, with no extra results', () => {
    const list: CommandItem[] = [
      { id: 'a', label: 'Overview' },
      { id: 'b', label: 'Billing' },
    ]
    expect(find('overview', list)).toEqual(['a'])
    expect(find('billing', list)).toEqual(['b'])
  })
})
