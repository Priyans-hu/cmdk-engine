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

  it('ranks original keyword match above synonym keyword match', () => {
    const testItems = [
      cmd({
        id: 'synonym-match',
        label: 'Credits Page',
        keywords: ['credits'],
        meta: { _synonymKeywords: ['billing'] },
      }),
      cmd({
        id: 'direct-match',
        label: 'Payment History',
        keywords: ['billing'],
      }),
    ]
    const results = search.search('billing', testItems)
    expect(results[0].item.id).toBe('direct-match')
    expect(results[0].score).toBeGreaterThan(results[1].score)
  })

  it('ranks label match above synonym keyword match', () => {
    const testItems = [
      cmd({
        id: 'synonym-match',
        label: 'Team Settings',
        meta: { _synonymKeywords: ['deploy'] },
      }),
      cmd({
        id: 'label-match',
        label: 'Deploy',
      }),
    ]
    const results = search.search('deploy', testItems)
    expect(results[0].item.id).toBe('label-match')
    expect(results[0].score).toBeGreaterThan(results[1].score)
  })

  it('still finds items via synonym keywords', () => {
    const testItems = [
      cmd({
        id: 'item',
        label: 'Billing Overview',
        keywords: ['invoice'],
        meta: { _synonymKeywords: ['payment', 'money'] },
      }),
    ]
    const results = search.search('money', testItems)
    expect(results).toHaveLength(1)
    expect(results[0].item.id).toBe('item')
    expect(results[0].score).toBeGreaterThan(0)
  })

  describe('fuzzy scoring strictness', () => {
    it('rejects scattered character matches like "plans" in "applications"', () => {
      const testItems = [
        cmd({ id: 'app', label: 'XML Applications' }),
        cmd({ id: 'plans', label: 'Plans & Pricing' }),
      ]
      const results = search.search('plans', testItems)
      // "Plans & Pricing" must be the top result
      expect(results[0].item.id).toBe('plans')
      expect(results[0].score).toBeGreaterThan(0.9)
      // "XML Applications" should either not match or score very low
      const appResult = results.find((r) => r.item.id === 'app')
      if (appResult) {
        expect(appResult.score).toBeLessThan(0.15)
      }
    })

    it('does not match "internal" against "external tools"', () => {
      const testItems = [
        cmd({ id: 'ext', label: 'External Tools' }),
        cmd({ id: 'int', label: 'Internal Contacts' }),
      ]
      const results = search.search('internal', testItems)
      expect(results[0].item.id).toBe('int')
      const extResult = results.find((r) => r.item.id === 'ext')
      if (extResult) {
        expect(extResult.score).toBeLessThan(0.15)
      }
    })

    it('prefix matches score high: "bill" → "Billing"', () => {
      const testItems = [cmd({ id: 'billing', label: 'Billing Overview' })]
      const results = search.search('bill', testItems)
      expect(results).toHaveLength(1)
      expect(results[0].score).toBeGreaterThan(0.8)
    })

    it('initials match scores decent: "bs" → "Billing Settings"', () => {
      const testItems = [cmd({ id: 'bs', label: 'Billing Settings' })]
      const results = search.search('bs', testItems)
      expect(results).toHaveLength(1)
      expect(results[0].score).toBeGreaterThanOrEqual(0.7)
    })

    it('prefix match for "int" → "Internal Contacts"', () => {
      const testItems = [cmd({ id: 'ic', label: 'Internal Contacts' })]
      const results = search.search('int', testItems)
      expect(results).toHaveLength(1)
      expect(results[0].score).toBeGreaterThan(0.8)
    })

    it('consecutive fuzzy matches score higher than scattered', () => {
      const testItems = [
        cmd({ id: 'consecutive', label: 'billing' }), // "blling" → b-l-l-i-n-g mostly consecutive
        cmd({ id: 'scattered', label: 'big long listing name' }), // scattered match
      ]
      const results = search.search('blling', testItems)
      const consecutive = results.find((r) => r.item.id === 'consecutive')
      const scattered = results.find((r) => r.item.id === 'scattered')
      if (consecutive && scattered) {
        expect(consecutive.score).toBeGreaterThan(scattered.score)
      }
    })
  })
})
