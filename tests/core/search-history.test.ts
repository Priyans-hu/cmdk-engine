import { describe, it, expect, beforeEach } from 'vitest'
import { createInMemorySearchHistory } from '../../src/core/search-history'

describe('createSearchHistory (in-memory)', () => {
  let history: ReturnType<typeof createInMemorySearchHistory>

  beforeEach(() => {
    history = createInMemorySearchHistory()
  })

  it('records a search query', () => {
    history.record('billing', 5)
    const recent = history.getRecent()
    expect(recent).toHaveLength(1)
    expect(recent[0].query).toBe('billing')
    expect(recent[0].resultCount).toBe(5)
  })

  it('returns recent searches sorted by timestamp (newest first)', () => {
    history.record('billing', 5)
    history.record('settings', 3)
    history.record('users', 8)

    const recent = history.getRecent()
    expect(recent.map((e) => e.query)).toEqual(['users', 'settings', 'billing'])
  })

  it('deduplicates by query string (updates timestamp)', () => {
    history.record('billing', 5)
    history.record('settings', 3)
    history.record('billing', 10) // Re-search

    const recent = history.getRecent()
    expect(recent).toHaveLength(2)
    expect(recent[0].query).toBe('billing') // Most recent
    expect(recent[0].resultCount).toBe(10) // Updated count
  })

  it('respects maxEntries limit', () => {
    const small = createInMemorySearchHistory({ maxEntries: 3 })
    small.record('a', 1)
    small.record('bb', 2)
    small.record('ccc', 3)
    small.record('dddd', 4)

    const recent = small.getRecent()
    expect(recent).toHaveLength(3)
    expect(recent[0].query).toBe('dddd')
    // 'a' should be trimmed (oldest, single char, but 'a' is only 1 char → below minQueryLength)
  })

  it('ignores queries shorter than minQueryLength', () => {
    const strict = createInMemorySearchHistory({ minQueryLength: 3 })
    strict.record('ab', 5)
    strict.record('abc', 3)

    const recent = strict.getRecent()
    expect(recent).toHaveLength(1)
    expect(recent[0].query).toBe('abc')
  })

  it('trims whitespace from queries', () => {
    history.record('  billing  ', 5)
    const recent = history.getRecent()
    expect(recent[0].query).toBe('billing')
  })

  it('removes a specific query', () => {
    history.record('billing', 5)
    history.record('settings', 3)
    history.remove('billing')

    const recent = history.getRecent()
    expect(recent).toHaveLength(1)
    expect(recent[0].query).toBe('settings')
  })

  it('clears all history', () => {
    history.record('billing', 5)
    history.record('settings', 3)
    history.clear()

    expect(history.getRecent()).toHaveLength(0)
  })

  it('getRecent with count limits results', () => {
    history.record('aa', 1)
    history.record('bb', 2)
    history.record('cc', 3)

    const recent = history.getRecent(2)
    expect(recent).toHaveLength(2)
    expect(recent[0].query).toBe('cc')
    expect(recent[1].query).toBe('bb')
  })

  it('handles default minQueryLength of 2', () => {
    history.record('a', 5) // too short
    history.record('ab', 3) // ok

    expect(history.getRecent()).toHaveLength(1)
    expect(history.getRecent()[0].query).toBe('ab')
  })
})
