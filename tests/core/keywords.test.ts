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
    it('keeps original keywords separate from synonym expansions', () => {
      const engine = createKeywordEngine(synonyms)
      const item: CommandItem = {
        id: 'billing-page',
        label: 'Billing',
        keywords: ['charges'],
      }

      const enriched = engine.enrichItem(item)
      const synKws = enriched.meta?._synonymKeywords as string[]
      expect(enriched.keywords).toContain('charges') // original preserved
      expect(enriched.keywords).not.toContain('money') // synonym NOT in keywords
      expect(synKws).toContain('money') // synonym in meta
      expect(synKws).toContain('payment')
    })

    it('puts label-derived synonyms in _synonymKeywords', () => {
      const engine = createKeywordEngine(synonyms)
      const item: CommandItem = {
        id: 'settings-page',
        label: 'Settings',
      }

      const enriched = engine.enrichItem(item)
      const synKws = enriched.meta?._synonymKeywords as string[]
      expect(synKws).toContain('preferences')
      expect(synKws).toContain('config')
    })

    it('adds user aliases as original keywords (not synonyms)', () => {
      const aliases = new Map([['cmd-1', ['shortcut', 'quick']]])
      const engine = createKeywordEngine({}, aliases)
      const item: CommandItem = { id: 'cmd-1', label: 'My Command' }

      const enriched = engine.enrichItem(item)
      expect(enriched.keywords).toContain('shortcut')
      expect(enriched.keywords).toContain('quick')
    })

    it('does not duplicate original keywords into synonym list', () => {
      const engine = createKeywordEngine(synonyms)
      const item: CommandItem = {
        id: 'test',
        label: 'Billing',
        keywords: ['money'], // already a synonym value
      }

      const enriched = engine.enrichItem(item)
      const synKws = (enriched.meta?._synonymKeywords as string[] | undefined) ?? []
      expect(enriched.keywords).toContain('money')
      expect(enriched.keywords!.filter((k) => k === 'money')).toHaveLength(1)
      // 'money' should NOT appear in synonyms since it's already original
      expect(synKws).not.toContain('money')
    })

    it('does not set _synonymKeywords when there are no expansions', () => {
      const engine = createKeywordEngine({})
      const item: CommandItem = {
        id: 'plain',
        label: 'Dashboard',
        keywords: ['home'],
      }

      const enriched = engine.enrichItem(item)
      expect(enriched.meta?._synonymKeywords).toBeUndefined()
    })
  })

  describe('enrichAll', () => {
    it('enriches all items with synonym keywords in meta', () => {
      const engine = createKeywordEngine(synonyms)
      const items: CommandItem[] = [
        { id: 'a', label: 'Billing' },
        { id: 'b', label: 'Settings' },
      ]

      const enriched = engine.enrichAll(items)
      expect((enriched[0].meta?._synonymKeywords as string[])).toContain('money')
      expect((enriched[1].meta?._synonymKeywords as string[])).toContain('config')
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
