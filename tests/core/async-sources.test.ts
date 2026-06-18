import { describe, it, expect } from 'vitest'
import {
  defaultTrigger,
  shouldRunSource,
  mergeAsyncCommands,
  flattenAsyncItems,
  DEFAULT_ASYNC_DEBOUNCE_MS,
} from '../../src/core/async-sources'
import type { AsyncSource, CommandItem } from '../../src/core/types'

const cmd = (id: string, extra: Partial<CommandItem> = {}): CommandItem => ({
  id,
  label: id,
  ...extra,
})

describe('async-sources core helpers', () => {
  it('exposes a sane default debounce', () => {
    expect(DEFAULT_ASYNC_DEBOUNCE_MS).toBeGreaterThan(0)
  })

  describe('defaultTrigger', () => {
    it('returns true for a non-empty query', () => {
      expect(defaultTrigger('foo')).toBe(true)
    })
    it('returns false for empty / whitespace-only queries', () => {
      expect(defaultTrigger('')).toBe(false)
      expect(defaultTrigger('   ')).toBe(false)
    })
  })

  describe('shouldRunSource', () => {
    it('falls back to defaultTrigger when source has no override', () => {
      const source: AsyncSource = { id: 's', load: async () => [] }
      expect(shouldRunSource(source, '')).toBe(false)
      expect(shouldRunSource(source, 'q')).toBe(true)
    })

    it('honours an explicit trigger predicate', () => {
      const source: AsyncSource = {
        id: 's',
        load: async () => [],
        trigger: (q) => q.startsWith('>'),
      }
      expect(shouldRunSource(source, 'foo')).toBe(false)
      expect(shouldRunSource(source, '>cmd')).toBe(true)
    })
  })

  describe('mergeAsyncCommands', () => {
    it('returns the static list unchanged when there are no async items', () => {
      const items = [cmd('a'), cmd('b')]
      expect(mergeAsyncCommands(items, [])).toBe(items)
    })

    it('appends async items that do not collide with static ids', () => {
      const merged = mergeAsyncCommands([cmd('a')], [cmd('b'), cmd('c')])
      expect(merged.map((i) => i.id)).toEqual(['a', 'b', 'c'])
    })

    it('lets async items override static items with the same id', () => {
      const merged = mergeAsyncCommands(
        [cmd('a', { label: 'Static' })],
        [cmd('a', { label: 'Async' })],
      )
      expect(merged).toHaveLength(1)
      expect(merged[0].label).toBe('Async')
    })
  })

  describe('flattenAsyncItems', () => {
    it('returns an empty array for an empty map', () => {
      expect(flattenAsyncItems({})).toEqual([])
    })

    it('flattens multiple sources into a single deduped list', () => {
      const merged = flattenAsyncItems({
        a: [cmd('x'), cmd('y')],
        b: [cmd('z')],
      })
      expect(merged.map((i) => i.id)).toEqual(['x', 'y', 'z'])
    })

    it('dedupes by id, keeping the first occurrence', () => {
      const merged = flattenAsyncItems({
        a: [cmd('shared', { label: 'From A' })],
        b: [cmd('shared', { label: 'From B' })],
      })
      expect(merged).toHaveLength(1)
      expect(merged[0].label).toBe('From A')
    })
  })
})
