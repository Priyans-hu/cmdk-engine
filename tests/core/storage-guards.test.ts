import { describe, it, expect, beforeEach } from 'vitest'
import { createFrecencyEngine } from '../../src/core/frecency'
import { createLocalStorageFrecencyStorage } from '../../src/core/frecency-storage'
import { createSearchHistory } from '../../src/core/search-history'
import type { CommandItem, FrecencyEntry } from '../../src/core/types'

// The default keys are shared by every app on the origin, so another app, an
// old version or a hand edit can leave anything under them.
const FRECENCY_KEY = 'cmdk-frecency'
const HISTORY_KEY = 'cmdk-search-history'

const valid: FrecencyEntry = { id: 'billing', count: 3, lastUsed: Date.now(), halfLifeScore: 0 }
const items = (...ids: string[]) =>
  ids.map((id) => ({ item: { id, label: id } as CommandItem, score: 0.5 }))

beforeEach(() => {
  localStorage.clear()
})

describe('createLocalStorageFrecencyStorage · malformed data', () => {
  it.each([
    ['null', 'null'],
    ['a number', '123'],
    ['a string', '"text"'],
    ['an array', '[1,2]'],
    ['invalid JSON', '{not json'],
  ])('treats %s under the key as empty', (_, raw) => {
    localStorage.setItem(FRECENCY_KEY, raw)
    const storage = createLocalStorageFrecencyStorage()

    expect(storage.getAll()).toEqual([])
    expect(storage.get('billing')).toBeNull()
  })

  it('drops entries that are not frecency entries and keeps the valid ones', () => {
    localStorage.setItem(
      FRECENCY_KEY,
      JSON.stringify({
        a: null,
        b: 5,
        c: { id: 'c' },
        d: { id: 7, count: 1, lastUsed: 1 },
        billing: valid,
      }),
    )
    const storage = createLocalStorageFrecencyStorage()

    expect(storage.getAll()).toEqual([valid])
    expect(storage.get('a')).toBeNull()
    expect(storage.get('billing')).toEqual(valid)
  })

  it('replaces malformed data on the next write', () => {
    localStorage.setItem(FRECENCY_KEY, JSON.stringify({ a: null, billing: valid }))
    const storage = createLocalStorageFrecencyStorage()

    storage.set('home', { id: 'home', count: 1, lastUsed: 1, halfLifeScore: 0 })

    const stored = JSON.parse(localStorage.getItem(FRECENCY_KEY)!)
    expect(Object.keys(stored).sort()).toEqual(['billing', 'home'])
  })

  it('keeps the frecency engine working on top of it', () => {
    localStorage.setItem(FRECENCY_KEY, JSON.stringify({ a: null, b: 'x' }))
    const engine = createFrecencyEngine({ storage: createLocalStorageFrecencyStorage() })

    expect(() => engine.rank(items('a', 'b'))).not.toThrow()
    expect(engine.getRecent()).toEqual([])

    engine.recordUsage('a')
    expect(engine.getRecent()).toEqual(['a'])
    expect(engine.getScore('a')).toBeGreaterThan(0)
  })

  it('round-trips valid data unchanged', () => {
    localStorage.setItem(FRECENCY_KEY, JSON.stringify({ billing: valid }))
    const storage = createLocalStorageFrecencyStorage()

    expect(storage.get('billing')).toEqual(valid)
    storage.set('home', { id: 'home', count: 1, lastUsed: 1, halfLifeScore: 0 })
    expect(JSON.parse(localStorage.getItem(FRECENCY_KEY)!)).toEqual({
      billing: valid,
      home: { id: 'home', count: 1, lastUsed: 1, halfLifeScore: 0 },
    })
  })
})

describe('createSearchHistory · malformed data', () => {
  it.each([
    ['null', 'null'],
    ['an object', '{}'],
    ['a string', '"billing"'],
    ['invalid JSON', '[not json'],
  ])('treats %s under the key as empty', (_, raw) => {
    localStorage.setItem(HISTORY_KEY, raw)
    const history = createSearchHistory()

    expect(history.getRecent()).toEqual([])
    expect(() => history.remove('billing')).not.toThrow()
  })

  it('drops entries that are not history entries and keeps the valid ones', () => {
    const entry = { query: 'billing', timestamp: 1, resultCount: 2 }
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([null, 1, 'x', { query: 2 }, { query: 'no-numbers' }, entry]),
    )
    const history = createSearchHistory()

    expect(history.getRecent()).toEqual([entry])
  })

  it('records over malformed data and replaces it', () => {
    localStorage.setItem(HISTORY_KEY, '{}')
    const history = createSearchHistory()

    history.record('settings', 4)

    expect(history.getRecent().map((e) => e.query)).toEqual(['settings'])
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)).toHaveLength(1)
  })

  it('round-trips valid data unchanged', () => {
    const entry = { query: 'billing', timestamp: 1, resultCount: 2 }
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry]))
    const history = createSearchHistory()

    history.record('settings', 4)

    expect(history.getRecent().map((e) => e.query)).toEqual(['settings', 'billing'])
    expect(history.getRecent()[1]).toEqual(entry)
  })
})
