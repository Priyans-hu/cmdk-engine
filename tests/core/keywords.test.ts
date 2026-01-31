import { describe, it, expect } from 'vitest'
import { createKeywordEngine } from '../../src/core/keywords'
import type { CommandItem } from '../../src/core/types'

const synonyms = {
  billing: ['money', 'payment', 'invoice', 'credits'],
  settings: ['preferences', 'config', 'options'],
  users: ['team', 'members', 'people'],
}

describe('createKeywordEngine', () => {
  describe('expandQuery', () => {
    it('returns query as-is when no synonyms match', () => {
      const engine = createKeywordEngine(synonyms)
      expect(engine.expandQuery('dashboard')).toEqual(['dashboard'])
    })

    it('expands synonym value to include the key', () => {
      const engine = createKeywordEngine(synonyms)
      const result = engine.expandQuery('money')
      expect(result).toContain('money')
      expect(result).toContain('billing')
    })

    it('expands synonym key to include all values', () => {
      const engine = createKeywordEngine(synonyms)
      const result = engine.expandQuery('billing')
      expect(result).toContain('billing')
      expect(result).toContain('money')
      expect(result).toContain('payment')
    })

    it('is case insensitive', () => {
      const engine = createKeywordEngine(synonyms)
      const result = engine.expandQuery('MONEY')
      expect(result).toContain('money')
      expect(result).toContain('billing')
    })

    it('returns empty for empty query', () => {
      const engine = createKeywordEngine(synonyms)
      expect(engine.expandQuery('')).toEqual([])
    })
  })

  describe('enrichItem', () => {
    it('adds synonym values to item keywords', () => {
      const engine = createKeywordEngine(synonyms)
      const item: CommandItem = {
        id: 'billing-page',
        label: 'Billing',
        keywords: ['charges'],
      }

      const enriched = engine.enrichItem(item)
      expect(enriched.keywords).toContain('charges') // original
      expect(enriched.keywords).toContain('money') // from synonym
      expect(enriched.keywords).toContain('payment') // from synonym
    })

    it('adds synonyms based on label match', () => {
      const engine = createKeywordEngine(synonyms)
      const item: CommandItem = {
        id: 'settings-page',
        label: 'Settings',
      }

      const enriched = engine.enrichItem(item)
      expect(enriched.keywords).toContain('preferences')
      expect(enriched.keywords).toContain('config')
    })

    it('adds user aliases', () => {
      const aliases = new Map([['cmd-1', ['shortcut', 'quick']]])
      const engine = createKeywordEngine({}, aliases)
      const item: CommandItem = { id: 'cmd-1', label: 'My Command' }

      const enriched = engine.enrichItem(item)
      expect(enriched.keywords).toContain('shortcut')
      expect(enriched.keywords).toContain('quick')
    })

    it('deduplicates keywords', () => {
      const engine = createKeywordEngine(synonyms)
      const item: CommandItem = {
        id: 'test',
        label: 'Billing',
        keywords: ['money'], // already a synonym
      }

      const enriched = engine.enrichItem(item)
      const moneyCount = enriched.keywords!.filter((k) => k === 'money').length
      expect(moneyCount).toBe(1)
    })
  })

  describe('enrichAll', () => {
    it('enriches all items', () => {
      const engine = createKeywordEngine(synonyms)
      const items: CommandItem[] = [
        { id: 'a', label: 'Billing' },
        { id: 'b', label: 'Settings' },
      ]

      const enriched = engine.enrichAll(items)
      expect(enriched[0].keywords).toContain('money')
      expect(enriched[1].keywords).toContain('config')
    })
  })

  describe('user aliases', () => {
    it('adds and retrieves aliases', () => {
      const engine = createKeywordEngine()
      engine.addAlias('cmd-1', 'my-shortcut')

      const aliases = engine.getAliases()
      expect(aliases.get('cmd-1')).toContain('my-shortcut')
    })

    it('does not duplicate aliases', () => {
      const engine = createKeywordEngine()
      engine.addAlias('cmd-1', 'shortcut')
      engine.addAlias('cmd-1', 'shortcut')

      expect(engine.getAliases().get('cmd-1')).toHaveLength(1)
    })

    it('removes aliases', () => {
      const engine = createKeywordEngine()
      engine.addAlias('cmd-1', 'a')
      engine.addAlias('cmd-1', 'b')
      engine.removeAlias('cmd-1', 'a')

      const aliases = engine.getAliases().get('cmd-1')!
      expect(aliases).not.toContain('a')
      expect(aliases).toContain('b')
    })
  })
})
