import { describe, it, expect } from 'vitest'
import { createFuzzySearch } from '../../src/core/search'
import type { CommandItem } from '../../src/core/types'

const search = createFuzzySearch()

function cmd(overrides: Partial<CommandItem>): CommandItem {
  return { id: 'x', label: 'x', ...overrides }
}

const items: CommandItem[] = [
  cmd({ id: 'billing', label: 'Billing Overview', keywords: ['money', 'payment'], group: 'Billing' }),
  cmd({ id: 'settings', label: 'Settings', keywords: ['preferences', 'config'] }),
  cmd({ id: 'users', label: 'Team Members', keywords: ['users', 'people'] }),
  cmd({ id: 'dashboard', label: 'Dashboard', description: 'Main overview page' }),
  cmd({ id: 'hidden', label: 'Secret Page', hidden: true }),
  cmd({ id: 'phone', label: 'Phone Numbers', keywords: ['DID', 'buy number'] }),
]

describe('createFuzzySearch', () => {
  it('returns all non-hidden items for empty query', () => {
    const results = search.search('', items)
    expect(results).toHaveLength(5) // excludes hidden
  })

  it('returns all non-hidden items for whitespace query', () => {
    const results = search.search('   ', items)
    expect(results).toHaveLength(5)
  })

  it('finds exact label match', () => {
    const results = search.search('Settings', items)
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].item.id).toBe('settings')
    expect(results[0].score).toBeGreaterThan(0.9)
  })

  it('finds prefix match', () => {
    const results = search.search('bill', items)
    expect(results[0].item.id).toBe('billing')
    expect(results[0].score).toBeGreaterThan(0.8)
  })

  it('finds substring match', () => {
    const results = search.search('overview', items)
    const billing = results.find((r) => r.item.id === 'billing')
    expect(billing).toBeDefined()
    expect(billing!.score).toBeGreaterThan(0)
  })

  it('matches against keywords', () => {
    const results = search.search('money', items)
    expect(results[0].item.id).toBe('billing')
  })

  it('matches against description', () => {
    const results = search.search('overview page', items)
    const dash = results.find((r) => r.item.id === 'dashboard')
    expect(dash).toBeDefined()
  })

  it('does not return hidden items', () => {
    const results = search.search('secret', items)
    expect(results.find((r) => r.item.id === 'hidden')).toBeUndefined()
  })

  it('returns empty for no match', () => {
    const results = search.search('xyzabc123', items)
    expect(results).toHaveLength(0)
  })

  it('is case insensitive', () => {
    const results = search.search('BILLING', items)
    expect(results[0].item.id).toBe('billing')
  })

  it('handles fuzzy matching', () => {
    const results = search.search('blling', items)
    // "blling" should fuzzy match "billing"
    const billing = results.find((r) => r.item.id === 'billing')
    expect(billing).toBeDefined()
  })

  it('ranks exact matches higher than fuzzy', () => {
    const testItems = [
      cmd({ id: 'exact', label: 'test' }),
      cmd({ id: 'fuzzy', label: 'testing something' }),
    ]
    const results = search.search('test', testItems)
    expect(results[0].item.id).toBe('exact')
    expect(results[0].score).toBeGreaterThan(results[1].score)
  })

  it('respects priority when scores are equal (empty query)', () => {
    const testItems = [
      cmd({ id: 'low', label: 'A', priority: 1 }),
      cmd({ id: 'high', label: 'B', priority: 10 }),
    ]
    const results = search.search('', testItems)
    expect(results[0].item.id).toBe('high')
  })

  it('handles keyword search for DID', () => {
    const results = search.search('DID', items)
    expect(results[0].item.id).toBe('phone')
  })
})
