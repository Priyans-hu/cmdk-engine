import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, renderHook, act } from '@testing-library/react'
import { CommandEngineProvider, useEngineContext, usePaletteState } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import { useSearchHistory } from '../../src/react/use-search-history'
import { useFrecency } from '../../src/react/use-frecency'
import { useCommandContext } from '../../src/react/use-command-context'
import type { UseCommandPaletteReturn } from '../../src/react/use-command-palette'
import type { CommandEngineConfig, CommandItem } from '../../src/core/types'

const FRECENCY_KEY = 'cmdk-frecency'

const COMMANDS: CommandItem[] = [
  { id: 'home', label: 'Home', action: () => {} },
  { id: 'billing', label: 'Billing Overview', action: () => {} },
]

const CONFIG: CommandEngineConfig = {
  frecency: { showRecent: true },
  searchHistory: { enabled: true },
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

function searchAndSelectBilling(result: Rendered) {
  act(() => result.current.palette.setSearch('bill'))
  act(() => result.current.palette.select('billing'))
}

const recent = (result: Rendered) =>
  result.current.palette.results.filter((r) => r.item.group === 'Recent').map((r) => r.item.id)

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CommandEngineProvider · without a config prop', () => {
  it('does not re-render engine consumers on each keystroke', () => {
    let renders = 0
    function Commands() {
      renders++
      useCommandRegister([{ id: 'a', label: 'Alpha' }])
      return null
    }
    let palette!: UseCommandPaletteReturn
    function Palette() {
      palette = useCommandPalette()
      return null
    }
    render(
      <CommandEngineProvider>
        <Commands />
        <Palette />
      </CommandEngineProvider>,
    )
    const before = renders

    for (const query of ['a', 'al', 'alp', 'alph', 'alpha']) {
      act(() => palette.setSearch(query))
    }

    expect(palette.search).toBe('alpha')
    expect(renders).toBe(before)
  })
})

describe('CommandEngineProvider · storage that cannot be written', () => {
  it('keeps frecency and search history in memory when writes throw', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('writes are blocked')
    })
    const { result } = renderPalette()

    searchAndSelectBilling(result)

    expect(recent(result)).toEqual(['billing'])
    expect(result.current.history.getRecent().map((e) => e.query)).toEqual(['bill'])
  })

  it('keeps them in memory when window.localStorage is null', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!
    Object.defineProperty(window, 'localStorage', { configurable: true, value: null })
    try {
      const { result } = renderPalette()

      searchAndSelectBilling(result)

      expect(recent(result)).toEqual(['billing'])
      expect(result.current.history.getRecent().map((e) => e.query)).toEqual(['bill'])
    } finally {
      Object.defineProperty(window, 'localStorage', original)
    }
  })

  it('still reads full storage: a quota error with stored data counts as available', () => {
    const home = { id: 'home', count: 1, lastUsed: Date.now(), halfLifeScore: 0 }
    localStorage.setItem(FRECENCY_KEY, JSON.stringify({ home }))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    })

    const { result } = renderPalette()

    expect(recent(result)).toEqual(['home'])
  })

  it('falls back to memory on a quota error with nothing stored', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    })
    const { result } = renderPalette()

    searchAndSelectBilling(result)

    expect(recent(result)).toEqual(['billing'])
  })
})

describe('CommandEngineProvider · in-memory fallback', () => {
  it('survives an engine rebuild from an inline config', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('writes are blocked')
    })
    let palette!: UseCommandPaletteReturn
    let history!: ReturnType<typeof useSearchHistory>
    function Palette() {
      useCommandRegister(COMMANDS)
      palette = useCommandPalette()
      history = useSearchHistory()
      return null
    }
    // A new config object (and new frecency/searchHistory objects) on every render
    function App(_: { n: number }) {
      return (
        <CommandEngineProvider
          config={{ frecency: { showRecent: true }, searchHistory: { enabled: true } }}
        >
          <Palette />
        </CommandEngineProvider>
      )
    }
    const { rerender } = render(<App n={1} />)
    act(() => palette.setSearch('bill'))
    act(() => palette.select('billing'))

    rerender(<App n={2} />)

    expect(palette.results[0].item).toMatchObject({ id: 'billing', group: 'Recent' })
    expect(history.getRecent().map((e) => e.query)).toEqual(['bill'])
  })
})

describe('frecency.enabled: false', () => {
  const off: CommandEngineConfig = { frecency: { enabled: false, showRecent: true } }

  it('stores nothing and shows no Recent group, even with showRecent', () => {
    const { result } = renderPalette(off)

    searchAndSelectBilling(result)

    expect(localStorage.getItem(FRECENCY_KEY)).toBeNull()
    expect(recent(result)).toEqual([])
    expect(result.current.palette.results.map((r) => r.item.id)).toEqual(['home', 'billing'])
  })

  it('does not read or rank earlier usage', () => {
    const billing = { id: 'billing', count: 9, lastUsed: Date.now(), halfLifeScore: 0 }
    localStorage.setItem(FRECENCY_KEY, JSON.stringify({ billing }))
    const { result } = renderPalette(off)

    expect(recent(result)).toEqual([])
    expect(result.current.palette.results.map((r) => r.item.id)).toEqual(['home', 'billing'])
  })

  it('turns useFrecency() into a no-op', () => {
    const { result } = renderHook(() => useFrecency(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <CommandEngineProvider config={off}>{children}</CommandEngineProvider>
      ),
    })

    act(() => result.current.recordUsage('home'))

    expect(result.current.getScore('home')).toBe(0)
    expect(result.current.getRecent()).toEqual([])
    expect(localStorage.getItem(FRECENCY_KEY)).toBeNull()
  })
})

describe('hooks outside a provider', () => {
  function errorOf(hook: () => unknown): string {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      renderHook(hook)
    } catch (error) {
      return (error as Error).message
    }
    return 'no error'
  }

  it.each([
    ['useCommandPalette', () => useCommandPalette()],
    ['useCommandRegister', () => useCommandRegister([])],
    ['useFrecency', () => useFrecency()],
    ['useSearchHistory', () => useSearchHistory()],
    ['useCommandContext', () => useCommandContext()],
    ['useEngineContext', () => useEngineContext()],
    ['usePaletteState', () => usePaletteState()],
  ])('%s names itself and keeps the old wording', (name, hook) => {
    const message = errorOf(hook)

    expect(message.startsWith(`${name} must be used within a <CommandEngineProvider> (`)).toBe(true)
    expect(message).toMatch(/not in the component that renders it/)
    expect(message).toMatch(/two copies of cmdk-engine/)
  })

  it('names a caller passed by a component', () => {
    expect(errorOf(() => useEngineContext('CommandPalette'))).toMatch(
      /^CommandPalette must be used within a <CommandEngineProvider>/,
    )
  })
})
