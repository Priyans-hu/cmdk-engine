import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import type { UseCommandPaletteReturn } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import { createInMemoryStorage } from '../../src/core/frecency'
import type { AsyncSource, CommandEngineConfig, CommandItem } from '../../src/core/types'

type Load = AsyncSource['load']

function wrapperWith(config: CommandEngineConfig) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <CommandEngineProvider config={config}>{children}</CommandEngineProvider>
  }
}

/** Render one palette consumer (plus optional registered commands). */
function renderPalette(config: CommandEngineConfig, commands: CommandItem[] = []) {
  return renderHook(
    () => {
      useCommandRegister(commands)
      return useCommandPalette()
    },
    { wrapper: wrapperWith(config) },
  )
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const ids = (palette: UseCommandPaletteReturn) => palette.results.map((r) => r.item.id)
const item = (id: string, label: string, extra: Partial<CommandItem> = {}): CommandItem => ({
  id,
  label,
  ...extra,
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('async sources · loading is owned by the provider', () => {
  it('loads once per query no matter how many consumers render', async () => {
    const load = vi.fn<Load>(async (query) => [item(`r-${query}`, `Remote ${query}`)])
    const { result } = renderHook(
      () => ({ a: useCommandPalette(), b: useCommandPalette(), c: useCommandPalette() }),
      { wrapper: wrapperWith({ asyncSources: [{ id: 'remote', load }] }) },
    )

    act(() => result.current.a.setSearch('remote'))
    await advance(200)

    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith('remote', { signal: expect.any(AbortSignal) })
    expect(ids(result.current.a)).toEqual(['r-remote'])
    expect(ids(result.current.b)).toEqual(['r-remote'])
    expect(ids(result.current.c)).toEqual(['r-remote'])

    act(() => result.current.b.setSearch('remote 2'))
    await advance(200)

    expect(load).toHaveBeenCalledTimes(2)
    expect(ids(result.current.c)).toEqual(['r-remote 2'])
  })

  it('a parent re-render with a fresh inline config neither restarts nor aborts the load', async () => {
    const gate = deferred<CommandItem[]>()
    const signals: AbortSignal[] = []
    const load = vi.fn<Load>((_query, { signal }) => {
      signals.push(signal)
      return gate.promise
    })
    // New config object, array, source object and load closure on every render.
    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <CommandEngineProvider
          config={{ asyncSources: [{ id: 'remote', load: (q, o) => load(q, o) }] }}
        >
          {children}
        </CommandEngineProvider>
      )
    }
    const { result, rerender } = renderHook(() => useCommandPalette(), { wrapper: Wrapper })

    act(() => result.current.setSearch('rem'))
    await advance(150)
    rerender() // inside the debounce window: the timer keeps running
    await advance(50)
    expect(load).toHaveBeenCalledTimes(1)

    rerender() // while in flight
    rerender()
    expect(signals[0].aborted).toBe(false)
    expect(result.current.isLoading).toBe(true)

    await act(async () => gate.resolve([item('rem-1', 'Remote item')]))
    expect(ids(result.current)).toEqual(['rem-1'])
    expect(result.current.isLoading).toBe(false)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('calls the latest load closure when the debounce fires', async () => {
    let version = 1
    const calls: number[] = []
    function Wrapper({ children }: { children: React.ReactNode }) {
      const rendered = version
      const load: Load = async () => {
        calls.push(rendered)
        return []
      }
      return (
        <CommandEngineProvider config={{ asyncSources: [{ id: 'remote', load }] }}>
          {children}
        </CommandEngineProvider>
      )
    }
    const { result, rerender } = renderHook(() => useCommandPalette(), { wrapper: Wrapper })

    act(() => result.current.setSearch('x'))
    version = 2
    rerender()
    await advance(200)

    expect(calls).toEqual([2])
  })

  it('settles under StrictMode with one load and nothing left loading', async () => {
    const load = vi.fn<Load>(async (query) => [item('strict', `Strict ${query}`)])
    const config: CommandEngineConfig = {
      asyncSources: [{ id: 'remote', load, trigger: () => true }],
    }
    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <React.StrictMode>
          <CommandEngineProvider config={config}>{children}</CommandEngineProvider>
        </React.StrictMode>
      )
    }
    const { result } = renderHook(() => useCommandPalette(), { wrapper: Wrapper })

    expect(result.current.isLoading).toBe(true)
    await advance(200)
    expect(load).toHaveBeenCalledTimes(1)
    expect(ids(result.current)).toEqual(['strict'])
    expect(result.current.isLoading).toBe(false)

    act(() => result.current.setSearch('str'))
    expect(result.current.isLoading).toBe(true)
    await advance(200)
    expect(load).toHaveBeenCalledTimes(2)
    expect(result.current.isLoading).toBe(false)
    expect(ids(result.current)).toEqual(['strict'])
  })
})

describe('async sources · surface and compatibility', () => {
  const COMMANDS = [item('billing', 'Billing'), item('settings', 'Settings', { group: 'App' })]

  it('asyncSources: [] behaves exactly like no asyncSources', async () => {
    const none = renderPalette({}, COMMANDS)
    const empty = renderPalette({ asyncSources: [] }, COMMANDS)
    await act(async () => {})

    for (const query of ['', 'bill', 'zzz']) {
      act(() => none.result.current.setSearch(query))
      act(() => empty.result.current.setSearch(query))
      await advance(500)
      expect(ids(empty.result.current)).toEqual(ids(none.result.current))
      expect(empty.result.current.groups).toEqual(none.result.current.groups)
      expect(empty.result.current.isLoading).toBe(false)
      expect(empty.result.current.asyncErrors).toEqual({})
    }

    const before = empty.result.current.results
    empty.rerender()
    expect(empty.result.current.results).toBe(before)
  })

  it('results keep their identity when inputs are unchanged', async () => {
    const config: CommandEngineConfig = {
      asyncSources: [
        { id: 'remote', load: async () => [item('remote-billing', 'Billing export')] },
      ],
    }
    const { result, rerender } = renderPalette(config, COMMANDS)
    await act(async () => {})

    act(() => result.current.setSearch('bill'))
    await advance(200)
    expect(ids(result.current)).toContain('remote-billing')

    const { results, groupedResults } = result.current
    rerender()
    act(() => result.current.open())
    expect(result.current.results).toBe(results)
    expect(result.current.groupedResults).toBe(groupedResults)
  })

  it('filters and ranks async items with the local pipeline by default', async () => {
    const config: CommandEngineConfig = {
      maxResults: 2,
      asyncSources: [
        {
          id: 'remote',
          load: async () => [
            item('remote-match', 'Billing report'),
            item('remote-other', 'Unrelated thing'),
            item('remote-match-2', 'Old billing data'),
          ],
        },
      ],
    }
    const { result } = renderPalette(config, COMMANDS)
    await act(async () => {})

    act(() => result.current.setSearch('billing'))
    await advance(200)

    // Exact local match first, the remote prefix match next; maxResults cuts the rest.
    expect(ids(result.current)).toEqual(['billing', 'remote-match'])
  })

  it('dedupes by id: registered commands win, then earlier sources', async () => {
    const config: CommandEngineConfig = {
      asyncSources: [
        {
          id: 'first',
          load: async () => [item('dup', 'First dup'), item('shared', 'First shared')],
        },
        {
          id: 'second',
          load: async () => [item('shared', 'Second shared'), item('only', 'Second only')],
        },
      ],
    }
    const { result } = renderPalette(config, [item('dup', 'Local dup')])
    await act(async () => {})

    act(() => result.current.setSearch('d'))
    await advance(200)

    const labels = Object.fromEntries(result.current.results.map((r) => [r.item.id, r.item.label]))
    expect(labels).toEqual({ dup: 'Local dup', shared: 'First shared', only: 'Second only' })
  })

  it('never records async items in frecency', async () => {
    const storage = createInMemoryStorage()
    const config: CommandEngineConfig = {
      frecency: { storage },
      asyncSources: [
        {
          id: 'remote',
          load: async () => [
            item('remote-parent', 'Remote parent', {
              children: [item('remote-child', 'Remote child', { action: () => {} })],
            }),
            item('remote-leaf', 'Remote leaf', { action: () => {} }),
          ],
        },
      ],
    }
    const { result } = renderPalette(config, [
      item('local', 'Local remote twin', { action: () => {} }),
    ])
    await act(async () => {})

    act(() => result.current.setSearch('remote'))
    await advance(200)
    act(() => result.current.select('remote-leaf'))

    act(() => result.current.setSearch('remote'))
    await advance(200)
    act(() => result.current.select('remote-parent'))
    act(() => result.current.select('remote-child'))

    act(() => result.current.setSearch('local'))
    act(() => result.current.select('local'))

    expect(storage.getAll().map((e) => e.id)).toEqual(['local'])
  })
})
