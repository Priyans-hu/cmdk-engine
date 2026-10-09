import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import { useSearchHistory } from '../../src/react/use-search-history'
import type { CommandEngineConfig, CommandItem } from '../../src/core/types'

const FRECENCY_KEY = 'cmdk-frecency'
const HISTORY_KEY = 'cmdk-search-history'

const COMMANDS: CommandItem[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'billing', label: 'Billing Overview', href: '/billing', keywords: ['invoices'] },
]

const CONFIG: CommandEngineConfig = {
  frecency: { showRecent: true },
  searchHistory: { enabled: true },
  onNavigate: () => {},
}

// Sandboxed iframes without allow-same-origin, and browsers that block cookies,
// throw on any read of `window.localStorage`.
function blockLocalStorage(): () => void {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException(
        "Failed to read the 'localStorage' property from 'Window': The document is sandboxed and lacks the 'allow-same-origin' flag.",
        'SecurityError',
      )
    },
  })
  return () => Object.defineProperty(window, 'localStorage', original)
}

function renderPalette(config: CommandEngineConfig = CONFIG) {
  return renderHook(
    () => {
      useCommandRegister(COMMANDS)
      return { palette: useCommandPalette(), history: useSearchHistory() }
    },
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <CommandEngineProvider config={config}>{children}</CommandEngineProvider>
      ),
    },
  )
}

type Rendered = ReturnType<typeof renderPalette>['result']

const labels = (result: Rendered) => result.current.palette.results.map((r) => r.item.label)

function searchAndSelectBilling(result: Rendered) {
  act(() => result.current.palette.setSearch('bill'))
  act(() => result.current.palette.select('billing'))
}

let restore: (() => void) | null = null

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  restore?.()
  restore = null
})

describe('CommandEngineProvider · window.localStorage access throws', () => {
  it('mounts and searches', () => {
    restore = blockLocalStorage()
    const { result } = renderPalette({})

    expect(labels(result)).toEqual(['Home', 'Billing Overview'])
    act(() => result.current.palette.setSearch('invoices'))
    expect(labels(result)).toEqual(['Billing Overview'])
  })

  it('keeps frecency and search history in memory', () => {
    restore = blockLocalStorage()
    const { result } = renderPalette()

    searchAndSelectBilling(result)

    expect(result.current.palette.results[0].item).toMatchObject({ id: 'billing', group: 'Recent' })
    expect(result.current.history.getRecent().map((e) => e.query)).toEqual(['bill'])
  })
})

describe('CommandEngineProvider · malformed data under the storage keys', () => {
  it.each([
    ['null', 'null', 'null'],
    ['values of the wrong type', '123', '{}'],
    ['invalid entries', '{"a":null,"b":{"id":"b"}}', '[null,1,{"query":2}]'],
    ['invalid JSON', '{not json', '[not json'],
  ])('renders, selects and replaces %s', (_, frecency, history) => {
    localStorage.setItem(FRECENCY_KEY, frecency)
    localStorage.setItem(HISTORY_KEY, history)
    const { result } = renderPalette()

    expect(labels(result)).toEqual(['Home', 'Billing Overview'])
    searchAndSelectBilling(result)

    expect(result.current.palette.results[0].item).toMatchObject({ id: 'billing', group: 'Recent' })
    expect(result.current.history.getRecent().map((e) => e.query)).toEqual(['bill'])
    expect(Object.keys(JSON.parse(localStorage.getItem(FRECENCY_KEY)!))).toEqual(['billing'])
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)).toHaveLength(1)
  })
})

describe('CommandEngineProvider · available localStorage', () => {
  it('reads and writes it as before', () => {
    const home = { id: 'home', count: 2, lastUsed: Date.now(), halfLifeScore: 0 }
    const old = { query: 'old', timestamp: 1, resultCount: 1 }
    localStorage.setItem(FRECENCY_KEY, JSON.stringify({ home }))
    localStorage.setItem(HISTORY_KEY, JSON.stringify([old]))
    const { result } = renderPalette()

    expect(result.current.palette.results[0].item).toMatchObject({ id: 'home', group: 'Recent' })
    expect(result.current.history.getRecent()).toEqual([old])

    searchAndSelectBilling(result)

    const stored = JSON.parse(localStorage.getItem(FRECENCY_KEY)!)
    expect(stored.home).toEqual(home)
    expect(stored.billing).toMatchObject({ id: 'billing', count: 1 })
    expect(
      JSON.parse(localStorage.getItem(HISTORY_KEY)!).map((e: { query: string }) => e.query),
    ).toEqual(['bill', 'old'])
  })
})
