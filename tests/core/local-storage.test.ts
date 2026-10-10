// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { getLocalStorage } from '../../src/core/local-storage'
import { createLocalStorageFrecencyStorage } from '../../src/core/frecency-storage'
import { createSearchHistory } from '../../src/core/search-history'

// A host can define a `window` that is not the global object (a test DOM set up
// by hand, for example), and Node 25+ defines a global `localStorage` of its own.
// The storages must use `window.localStorage` and nothing else.
const host = globalThis as { window?: unknown }

function fakeStorage() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

afterEach(() => {
  delete host.window
})

describe('storages use window.localStorage', () => {
  it('persists frecency there', () => {
    const local = fakeStorage()
    host.window = { localStorage: local }
    const storage = createLocalStorageFrecencyStorage()
    const entry = { id: 'billing', count: 1, lastUsed: 1, halfLifeScore: 0 }

    storage.set('billing', entry)
    expect(JSON.parse(local.data.get('cmdk-frecency')!)).toEqual({ billing: entry })
    expect(storage.get('billing')).toEqual(entry)
    storage.clear()
    expect(local.data.has('cmdk-frecency')).toBe(false)
  })

  it('persists search history there', () => {
    const local = fakeStorage()
    host.window = { localStorage: local }
    const history = createSearchHistory()

    history.record('billing', 3)
    expect(local.data.get('cmdk-search-history')).toContain('billing')
    expect(history.getRecent().map((e) => e.query)).toEqual(['billing'])
    history.clear()
    expect(local.data.has('cmdk-search-history')).toBe(false)
  })
})

describe('getLocalStorage', () => {
  it('returns window.localStorage', () => {
    const local = fakeStorage()
    host.window = { localStorage: local }
    expect(getLocalStorage()).toBe(local)
  })

  it('is undefined without a window, or when window.localStorage is missing or null', () => {
    expect(getLocalStorage()).toBeUndefined()
    host.window = {}
    expect(getLocalStorage()).toBeUndefined()
    host.window = { localStorage: null }
    expect(getLocalStorage()).toBeUndefined()
  })

  it('is undefined when reading window.localStorage throws', () => {
    host.window = {
      get localStorage() {
        throw new Error('The document is sandboxed')
      },
    }
    expect(getLocalStorage()).toBeUndefined()
  })

  it('leaves the storages empty and quiet when window.localStorage is null', () => {
    host.window = { localStorage: null }
    const storage = createLocalStorageFrecencyStorage()
    storage.set('billing', { id: 'billing', count: 1, lastUsed: 1, halfLifeScore: 0 })
    expect(storage.getAll()).toEqual([])
    const history = createSearchHistory()
    history.record('billing', 3)
    expect(history.getRecent()).toEqual([])
  })
})
