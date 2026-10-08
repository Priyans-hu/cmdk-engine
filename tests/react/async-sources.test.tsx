import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider, usePaletteState } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import type { UseCommandPaletteReturn } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import { createInMemoryStorage } from '../../src/core/frecency'
import { createSimpleAccessProvider } from '../../src/core/access-control'
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

describe('async sources · lifecycle', () => {
  it('isLoading is true from the trigger passing, through the debounce, until every source settles', async () => {
    const fast = deferred<CommandItem[]>()
    const slow = deferred<CommandItem[]>()
    const loadFast = vi.fn<Load>(() => fast.promise)
    const loadSlow = vi.fn<Load>(() => slow.promise)
    const { result } = renderPalette({
      asyncSources: [
        { id: 'fast', load: loadFast, debounceMs: 100 },
        { id: 'slow', load: loadSlow, debounceMs: 300 },
      ],
    })
    expect(result.current.isLoading).toBe(false)

    act(() => result.current.setSearch('x'))
    expect(result.current.isLoading).toBe(true) // debounce window, nothing called yet
    expect(loadFast).not.toHaveBeenCalled()

    await advance(100)
    expect(loadFast).toHaveBeenCalledTimes(1)
    await act(async () => fast.resolve([item('f', 'x fast')]))
    expect(ids(result.current)).toEqual(['f'])
    expect(result.current.isLoading).toBe(true) // slow is still debouncing

    await advance(200)
    expect(loadSlow).toHaveBeenCalledTimes(1)
    expect(result.current.isLoading).toBe(true)
    await act(async () => slow.resolve([item('s', 'x slow')]))
    expect(result.current.isLoading).toBe(false)
    expect(ids(result.current)).toEqual(['f', 's'])
  })

  it('isLoading never sticks when the query is cleared mid-flight', async () => {
    const gate = deferred<CommandItem[]>()
    const failing = deferred<CommandItem[]>()
    const { result } = renderPalette({
      asyncSources: [
        { id: 'ok', load: () => gate.promise },
        { id: 'bad', load: () => failing.promise },
      ],
    })

    act(() => result.current.setSearch('abc'))
    await advance(200)
    expect(result.current.isLoading).toBe(true)

    act(() => result.current.setSearch(''))
    expect(result.current.isLoading).toBe(false)

    // The superseded loads settle afterwards and change nothing.
    await act(async () => {
      gate.resolve([item('late', 'abc late')])
      failing.reject(new Error('late failure'))
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.results).toEqual([])
    expect(result.current.asyncErrors).toEqual({})
  })

  it('aborts and clears the previous query as soon as the query changes', async () => {
    const signals: AbortSignal[] = []
    const gates: ReturnType<typeof deferred<CommandItem[]>>[] = []
    const load = vi.fn<Load>((_query, { signal }) => {
      signals.push(signal)
      gates.push(deferred<CommandItem[]>())
      return gates[gates.length - 1].promise
    })
    const { result } = renderPalette({ asyncSources: [{ id: 'remote', load }] })

    act(() => result.current.setSearch('alpha'))
    await advance(200)
    await act(async () => gates[0].resolve([item('alpha-1', 'alpha one')]))
    expect(ids(result.current)).toEqual(['alpha-1'])

    act(() => result.current.setSearch('alphab'))
    expect(ids(result.current)).toEqual([]) // cleared before the new load even starts
    await advance(200)
    expect(load).toHaveBeenLastCalledWith('alphab', { signal: expect.any(AbortSignal) })

    act(() => result.current.setSearch('alphabe'))
    expect(signals[1].aborted).toBe(true)
    expect(signals[2]).toBeUndefined()
  })

  it('never renders the new query with the old items or with isLoading false', async () => {
    const frames: { search: string; ids: string[]; isLoading: boolean }[] = []
    // The label matches both queries, so a stale item would survive the client filter.
    const load: Load = async (query) => [item(`${query}-hit`, 'alpha beta hit')]
    const { result } = renderHook(
      () => {
        const palette = useCommandPalette()
        frames.push({ search: palette.search, ids: ids(palette), isLoading: palette.isLoading })
        return palette
      },
      { wrapper: wrapperWith({ asyncSources: [{ id: 'remote', load }] }) },
    )

    act(() => result.current.setSearch('alpha'))
    await advance(200)
    expect(ids(result.current)).toEqual(['alpha-hit'])

    frames.length = 0
    act(() => result.current.setSearch('beta'))
    const beta = frames.filter((frame) => frame.search === 'beta')
    expect(beta.length).toBeGreaterThan(0)
    expect(beta.every((frame) => frame.ids.length === 0 && frame.isLoading)).toBe(true)
  })

  it('ignores stale and out-of-order responses', async () => {
    const gates = new Map<string, ReturnType<typeof deferred<CommandItem[]>>>()
    const load: Load = (query) => {
      const gate = deferred<CommandItem[]>()
      gates.set(query, gate)
      return gate.promise // ignores the signal on purpose
    }
    const { result } = renderPalette({ asyncSources: [{ id: 'remote', load }] })

    act(() => result.current.setSearch('rep'))
    await advance(200)
    act(() => result.current.setSearch('repo'))
    await advance(200)

    await act(async () => gates.get('repo')!.resolve([item('new', 'repo new')]))
    await act(async () => gates.get('rep')!.resolve([item('old', 'rep old')]))

    expect(ids(result.current)).toEqual(['new'])
    expect(result.current.isLoading).toBe(false)
  })

  it('aborts and clears on close() and on a toggle that closes', async () => {
    const signals: AbortSignal[] = []
    const load = vi.fn<Load>((query, { signal }) => {
      signals.push(signal)
      return query === 'done' ? Promise.resolve([item('d', 'done item')]) : new Promise(() => {})
    })
    const { result } = renderPalette({
      asyncSources: [{ id: 'remote', load, trigger: () => true }],
    })
    await advance(200) // the empty-query load of the never-opened palette

    act(() => result.current.open())
    act(() => result.current.setSearch('x'))
    await advance(200)
    expect(result.current.isLoading).toBe(true)
    act(() => result.current.close())
    expect(signals[1].aborted).toBe(true)
    expect(result.current.isLoading).toBe(false)

    act(() => result.current.toggle())
    act(() => result.current.setSearch('done'))
    await advance(200)
    expect(ids(result.current)).toEqual(['d'])
    act(() => result.current.toggle())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.results).toEqual([])
    expect(result.current.isLoading).toBe(false)

    // Closed with the query reset: nothing loads until it reopens.
    const calls = load.mock.calls.length
    await advance(1000)
    expect(load).toHaveBeenCalledTimes(calls)
  })

  it('pauses when the palette closes with the query kept, and loads afresh on reopen', async () => {
    const signals: AbortSignal[] = []
    const load = vi.fn<Load>(async (query, { signal }) => {
      signals.push(signal)
      return [item(`hit-${signals.length}`, `${query} hit`)]
    })
    const { result } = renderHook(
      () => ({ palette: useCommandPalette(), state: usePaletteState() }),
      { wrapper: wrapperWith({ asyncSources: [{ id: 'remote', load }] }) },
    )

    act(() => result.current.state.setIsOpen(true))
    act(() => result.current.palette.setSearch('foo'))
    await advance(200)
    expect(ids(result.current.palette)).toEqual(['hit-1'])

    // Close through the raw state setter: the query is NOT reset.
    act(() => result.current.state.setIsOpen(false))
    expect(result.current.palette.search).toBe('foo')
    expect(result.current.palette.results).toEqual([])
    expect(result.current.palette.isLoading).toBe(false)
    await advance(1000)
    expect(load).toHaveBeenCalledTimes(1)

    act(() => result.current.state.setIsOpen(true))
    expect(result.current.palette.isLoading).toBe(true)
    await advance(200)
    expect(load).toHaveBeenCalledTimes(2)
    expect(load).toHaveBeenLastCalledWith('foo', { signal: expect.any(AbortSignal) })
    expect(ids(result.current.palette)).toEqual(['hit-2'])

    // An in-flight load is aborted by the close too.
    const pending = deferred<CommandItem[]>()
    load.mockImplementationOnce((_query, { signal }) => {
      signals.push(signal)
      return pending.promise
    })
    act(() => result.current.palette.setSearch('foo bar'))
    await advance(200)
    act(() => result.current.state.setIsOpen(false))
    expect(signals[2].aborted).toBe(true)
    await act(async () => pending.resolve([item('stale', 'foo bar stale')]))
    expect(result.current.palette.results).toEqual([])
  })

  it('keeps loading for a palette that never opened (inline palette)', async () => {
    const load = vi.fn<Load>(async () => [item('inline', 'inline result')])
    const { result } = renderPalette({ asyncSources: [{ id: 'remote', load }] })

    act(() => result.current.setSearch('inline'))
    await advance(200)

    expect(result.current.isOpen).toBe(false)
    expect(load).toHaveBeenCalledTimes(1)
    expect(ids(result.current)).toEqual(['inline'])
  })

  it('resumes loading when the query changes after a close (inline palette plus a shortcut)', async () => {
    const load = vi.fn<Load>(async () => [item('again', 'typed again')])
    const { result } = renderPalette({ asyncSources: [{ id: 'remote', load }] })

    act(() => result.current.toggle())
    act(() => result.current.toggle())
    act(() => result.current.setSearch('typed'))
    await advance(200)

    expect(result.current.isOpen).toBe(false)
    expect(ids(result.current)).toEqual(['again'])
  })

  it('loads only at the root: drillDown aborts and clears, drillUp loads again', async () => {
    const signals: AbortSignal[] = []
    const load = vi.fn<Load>((_query, { signal }) => {
      signals.push(signal)
      return new Promise(() => {})
    })
    const parent = item('parent', 'Parent', { children: [item('child', 'Child')] })
    const { result } = renderPalette(
      { asyncSources: [{ id: 'remote', load, trigger: () => true }] },
      [parent],
    )
    await advance(200)
    expect(load).toHaveBeenCalledTimes(1)
    expect(result.current.isLoading).toBe(true)

    act(() => result.current.drillDown(result.current.results[0].item))
    expect(signals[0].aborted).toBe(true)
    expect(result.current.isLoading).toBe(false)

    act(() => result.current.setSearch('chi'))
    await advance(1000)
    expect(load).toHaveBeenCalledTimes(1)
    expect(ids(result.current)).toEqual(['child'])

    act(() => result.current.drillUp())
    expect(result.current.isLoading).toBe(true)
    await advance(200)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('aborts on unmount', async () => {
    const signals: AbortSignal[] = []
    const gate = deferred<CommandItem[]>()
    const { result, unmount } = renderPalette({
      asyncSources: [
        {
          id: 'remote',
          load: (_query, { signal }) => {
            signals.push(signal)
            return gate.promise
          },
        },
      ],
    })

    act(() => result.current.setSearch('x'))
    await advance(200)
    unmount()
    expect(signals[0].aborted).toBe(true)
    await act(async () => gate.resolve([item('late', 'x late')]))
  })

  it('debounces bursts and honours a custom trigger', async () => {
    const load = vi.fn<Load>(async () => [])
    const { result } = renderPalette({
      asyncSources: [{ id: 'cmd', load, debounceMs: 50, trigger: (q) => q.startsWith('>') }],
    })

    act(() => result.current.setSearch('hello'))
    expect(result.current.isLoading).toBe(false)
    await advance(500)
    expect(load).not.toHaveBeenCalled()

    act(() => result.current.setSearch('>a'))
    await advance(20)
    act(() => result.current.setSearch('>ab'))
    await advance(20)
    act(() => result.current.setSearch('>abc'))
    await advance(50)
    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith('>abc', { signal: expect.any(AbortSignal) })
  })
})

describe('async sources · errors', () => {
  it('reports sync throws and rejections per source and clears them on the next success', async () => {
    let mode: 'throw' | 'string' | 'object' | 'ok' = 'throw'
    const failing: Load = (query) => {
      if (mode === 'throw') throw new Error('sync boom')
      if (mode === 'string') return Promise.reject('flat reason')
      if (mode === 'object') return Promise.reject({ status: 500 })
      return Promise.resolve([item('recovered', `${query} recovered`)])
    }
    const { result } = renderPalette({
      asyncSources: [
        { id: 'flaky', load: failing },
        { id: 'steady', load: async (query) => [item('steady', `${query} steady`)] },
      ],
    })

    act(() => result.current.setSearch('q'))
    await advance(200)
    expect(result.current.asyncErrors.flaky.message).toBe('sync boom')
    expect(result.current.asyncErrors.steady).toBeUndefined()
    expect(ids(result.current)).toEqual(['steady'])
    expect(result.current.isLoading).toBe(false)

    // Errors outlive query changes until that source succeeds.
    act(() => result.current.setSearch(''))
    expect(result.current.asyncErrors.flaky.message).toBe('sync boom')

    mode = 'string'
    act(() => result.current.setSearch('q2'))
    await advance(200)
    expect(result.current.asyncErrors.flaky).toBeInstanceOf(Error)
    expect(result.current.asyncErrors.flaky.message).toBe('flat reason')

    mode = 'object'
    act(() => result.current.setSearch('q3'))
    await advance(200)
    expect(result.current.asyncErrors.flaky).toBeInstanceOf(Error)
    expect((result.current.asyncErrors.flaky as Error & { cause?: unknown }).cause).toEqual({
      status: 500,
    })

    mode = 'ok'
    act(() => result.current.setSearch('q4'))
    await advance(200)
    expect(result.current.asyncErrors).toEqual({})
    expect(ids(result.current).sort()).toEqual(['recovered', 'steady'])
  })

  it('treats an AbortError rejection as a settled load, not an error', async () => {
    const { result } = renderPalette({
      asyncSources: [
        {
          id: 'remote',
          load: () => Promise.reject(new DOMException('The operation was aborted.', 'AbortError')),
        },
      ],
    })

    act(() => result.current.setSearch('x'))
    await advance(200)

    expect(result.current.asyncErrors).toEqual({})
    expect(result.current.isLoading).toBe(false)
  })

  it('reports a throwing trigger as an error without loading', async () => {
    const load = vi.fn<Load>(async () => [])
    const { result } = renderPalette({
      asyncSources: [
        {
          id: 'remote',
          load,
          trigger: () => {
            throw new Error('bad trigger')
          },
        },
      ],
    })

    act(() => result.current.setSearch('x'))
    await advance(500)

    expect(load).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.asyncErrors.remote.message).toBe('bad trigger')
  })

  it('drops the errors of sources that are no longer configured', async () => {
    let sources: AsyncSource[] = [
      {
        id: 'gone',
        load: () => {
          throw new Error('boom')
        },
      },
    ]
    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <CommandEngineProvider config={{ asyncSources: sources }}>{children}</CommandEngineProvider>
      )
    }
    const { result, rerender } = renderHook(() => useCommandPalette(), { wrapper: Wrapper })

    act(() => result.current.setSearch('x'))
    await advance(200)
    expect(Object.keys(result.current.asyncErrors)).toEqual(['gone'])

    sources = [{ id: 'other', load: async () => [] }]
    rerender()
    await act(async () => {})
    expect(result.current.asyncErrors).toEqual({})
  })

  it('never writes to the console', async () => {
    const spies = (['error', 'warn', 'log', 'info', 'debug'] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    )
    const { result, unmount } = renderPalette({
      asyncSources: [
        {
          id: 'throws',
          load: () => {
            throw new Error('sync')
          },
        },
        { id: 'rejects', load: () => Promise.reject('nope') },
        { id: 'aborts', load: () => Promise.reject(new DOMException('x', 'AbortError')) },
        { id: 'hangs', load: () => new Promise(() => {}) },
      ],
    })

    act(() => result.current.setSearch('x'))
    await advance(200)
    act(() => result.current.setSearch('y'))
    await advance(200)
    unmount()
    await advance(1000)

    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    }
  })
})

describe('async sources · unfiltered items (shouldFilter: false)', () => {
  const grouped = (palette: UseCommandPaletteReturn) =>
    palette.groupedResults.map((g) => `${g.group.id}=${g.items.map((s) => s.item.id).join(',')}`)

  it('shows a non-matching server item with shouldFilter false and drops it otherwise', async () => {
    const load: Load = async () => [item('server-hit', 'Quarterly numbers')]
    const on = renderPalette({ asyncSources: [{ id: 'srv', load, shouldFilter: false }] })
    const off = renderPalette({ asyncSources: [{ id: 'srv', load }] })

    act(() => on.result.current.setSearch('revenue'))
    act(() => off.result.current.setSearch('revenue'))
    await advance(200)

    expect(ids(on.result.current)).toEqual(['server-hit'])
    expect(ids(off.result.current)).toEqual([])
  })

  it('bypasses enrichment, search, frecency, the context boost and maxResults', async () => {
    const storage = createInMemoryStorage()
    storage.set('srv-2', { id: 'srv-2', count: 10, lastUsed: Date.now(), halfLifeScore: 0 })
    const config: CommandEngineConfig = {
      maxResults: 1,
      context: { path: '/x' },
      synonyms: { server: ['backend'] },
      frecency: { storage },
      asyncSources: [
        {
          id: 'srv',
          shouldFilter: false,
          load: async () => [
            item('srv-1', 'Server one', { scope: ['/x'], keywords: ['server'] }),
            item('srv-2', 'Server two'),
            item('srv-3', 'Server three'),
          ],
        },
      ],
    }
    const { result } = renderPalette(config, [
      item('local-a', 'Alpha one', { keywords: ['server'] }),
      item('local-b', 'Alpha two'),
    ])
    await act(async () => {})

    act(() => result.current.setSearch('alpha'))
    await advance(200)

    // One local result (maxResults: 1), then every server item in server order.
    expect(ids(result.current)).toEqual(['local-a', 'srv-1', 'srv-2', 'srv-3'])
    const server = result.current.results.slice(1)
    expect(server.map((r) => r.score)).toEqual([0, 0, 0])
    expect(server[0].item.meta?._synonymKeywords).toBeUndefined()
    expect(result.current.results[0].item.meta?._synonymKeywords).toEqual(['backend'])
  })

  it('applies when, access control and hidden (empty query only); disabled items stay', async () => {
    const items = [
      item('plain', 'Plain'),
      item('gated', 'Gated', { when: () => false }),
      item('denied', 'Denied', { permissions: ['nope'] }),
      item('allowed', 'Allowed', { permissions: ['ok'] }),
      item('hidden', 'Hidden', { hidden: true }),
      item('disabled', 'Disabled', { disabled: true }),
    ]
    const { result } = renderPalette({
      accessControl: createSimpleAccessProvider(['ok']),
      asyncSources: [
        { id: 'srv', shouldFilter: false, trigger: () => true, load: async () => items },
      ],
    })

    act(() => result.current.setSearch('q'))
    await advance(200)
    expect(ids(result.current)).toEqual(['plain', 'allowed', 'hidden', 'disabled'])
    expect(result.current.results[3].item.disabled).toBe(true)

    act(() => result.current.setSearch(''))
    await advance(200)
    expect(ids(result.current)).toEqual(['plain', 'allowed', 'disabled'])
  })

  it('caps each source at 10 by default, or at its own maxResults after visibility', async () => {
    const many = Array.from({ length: 15 }, (_, i) => item(`many-${i}`, `Many ${i}`))
    const { result } = renderPalette({
      asyncSources: [
        { id: 'many', shouldFilter: false, load: async () => many },
        {
          id: 'few',
          shouldFilter: false,
          maxResults: 2,
          load: async () => [
            item('few-0', 'Few 0', { when: () => false }),
            item('few-1', 'Few 1'),
            item('few-2', 'Few 2'),
            item('few-3', 'Few 3'),
          ],
        },
      ],
    })

    act(() => result.current.setSearch('q'))
    await advance(200)

    const all = ids(result.current)
    expect(all.filter((id) => id.startsWith('many-'))).toEqual(many.slice(0, 10).map((i) => i.id))
    expect(all.filter((id) => id.startsWith('few-'))).toEqual(['few-1', 'few-2'])
  })

  it('dedupes across modes: registered commands first, then source order', async () => {
    const { result } = renderPalette(
      {
        asyncSources: [
          { id: 'filtered', load: async () => [item('shared', 'Shared filtered')] },
          {
            id: 'srv',
            shouldFilter: false,
            load: async () => [
              item('dup', 'Dup server'),
              item('shared', 'Shared server'),
              item('only', 'Only server'),
            ],
          },
        ],
      },
      [item('dup', 'Dup local')],
    )
    await act(async () => {})

    act(() => result.current.setSearch('d'))
    await advance(200)

    const labels = Object.fromEntries(result.current.results.map((r) => [r.item.id, r.item.label]))
    expect(labels).toEqual({ dup: 'Dup local', shared: 'Shared filtered', only: 'Only server' })
  })

  it('places server groups after local groups, in server order', async () => {
    const { result } = renderPalette(
      {
        groups: [{ id: 'Pages', label: 'Pages', priority: 1 }],
        asyncSources: [
          {
            id: 'srv',
            shouldFilter: false,
            load: async () => [
              item('t1', 'One', { group: 'Tickets' }),
              item('d1', 'Two', { group: 'Docs' }),
              item('t2', 'Three', { group: 'Tickets' }),
              item('p2', 'Four', { group: 'Pages' }),
              item('u1', 'Five'),
            ],
          },
        ],
      },
      [item('p1', 'Report page', { group: 'Pages' }), item('o1', 'Report misc')],
    )
    await act(async () => {})

    act(() => result.current.setSearch('report'))
    await advance(200)

    // Server items join a matching local group at its end; new groups follow
    // the local ones in server order; ungrouped items stay in "Other", last.
    expect(grouped(result.current)).toEqual([
      'Pages=p1,p2',
      'Tickets=t1,t2',
      'Docs=d1',
      '__ungrouped__=o1,u1',
    ])
  })

  it('puts every item of a source with a group into that group', async () => {
    const { result } = renderPalette(
      {
        asyncSources: [
          {
            id: 'issues',
            shouldFilter: false,
            group: 'Issues',
            load: async () => [
              item('i1', 'First', { group: 'Elsewhere' }),
              item('i2', 'Second'),
              item('i3', 'Third', { group: 'Pages' }),
            ],
          },
        ],
      },
      [item('p1', 'Issue page', { group: 'Pages' })],
    )
    await act(async () => {})

    act(() => result.current.setSearch('issue'))
    await advance(200)

    expect(grouped(result.current)).toEqual(['Pages=p1', 'Issues=i1,i2,i3'])
  })

  it('never records unfiltered items in frecency, and select() still runs them', async () => {
    const storage = createInMemoryStorage()
    const action = vi.fn()
    const { result } = renderPalette({
      frecency: { storage },
      asyncSources: [
        {
          id: 'srv',
          shouldFilter: false,
          load: async () => [item('srv-action', 'Server action', { action })],
        },
      ],
    })

    act(() => result.current.open())
    act(() => result.current.setSearch('anything'))
    await advance(200)
    act(() => result.current.select('srv-action'))

    expect(action).toHaveBeenCalledOnce()
    expect(result.current.isOpen).toBe(false)
    expect(storage.getAll()).toEqual([])
  })

  it('never renders the previous query items for the new query', async () => {
    const frames: { search: string; ids: string[] }[] = []
    const load: Load = async (query) => [item(`${query}-hit`, `${query} hit`)]
    const { result } = renderHook(
      () => {
        const palette = useCommandPalette()
        frames.push({ search: palette.search, ids: ids(palette) })
        return palette
      },
      { wrapper: wrapperWith({ asyncSources: [{ id: 'srv', load, shouldFilter: false }] }) },
    )

    act(() => result.current.setSearch('alpha'))
    await advance(200)
    expect(ids(result.current)).toEqual(['alpha-hit'])

    frames.length = 0
    act(() => result.current.setSearch('beta'))
    expect(frames.filter((f) => f.search === 'beta').every((f) => f.ids.length === 0)).toBe(true)
    await advance(200)
    expect(ids(result.current)).toEqual(['beta-hit'])
  })
})

describe('async sources · href allowlist', () => {
  const REJECTED = [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'javascript\r:alert(1)',
    '\u0001javascript:alert(1)',
    '\u0000 \u001fjavascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'blob:https://example.com/0f6a',
    'file:///etc/passwd',
    'ftp://example.com/file',
    'myapp://open/item',
    'http://[bad',
  ]
  const ALLOWED = [
    '/relative/path',
    'relative/path',
    '?tab=2',
    '#section',
    '//example.com/x',
    'https://example.com/a',
    'HTTPS://EXAMPLE.COM/A',
    'http://example.com',
    'mailto:team@example.com',
    'tel:+15551234567',
    // Not a scheme: parses as a relative path, as it does in browsers.
    'java\u0001script:alert(1)',
  ]
  const links = (prefix: string, hrefs: string[]) =>
    hrefs.map((href, i) => item(`${prefix}-${i}`, `link ${prefix} ${i}`, { href }))

  async function loadLinks(shouldFilter: boolean) {
    const { result } = renderPalette({
      asyncSources: [
        {
          id: 'links',
          shouldFilter,
          maxResults: 100,
          load: async () => [...links('bad', REJECTED), ...links('ok', ALLOWED)],
        },
      ],
    })
    act(() => result.current.setSearch('link'))
    await advance(200)
    return result
  }

  for (const shouldFilter of [true, false]) {
    it(`strips every href outside the allowlist when items arrive (shouldFilter: ${shouldFilter})`, async () => {
      const result = await loadLinks(shouldFilter)
      const hrefs = Object.fromEntries(result.current.results.map((r) => [r.item.id, r.item.href]))

      expect(Object.keys(hrefs)).toHaveLength(REJECTED.length + ALLOWED.length)
      REJECTED.forEach((_, i) => expect(hrefs[`bad-${i}`]).toBeUndefined())
      ALLOWED.forEach((href, i) => expect(hrefs[`ok-${i}`]).toBe(href))
    })
  }

  it('strips hrefs on children and non-string hrefs', async () => {
    const { result } = renderPalette({
      asyncSources: [
        {
          id: 'nested',
          load: async () => [
            item('parent', 'Parent link', {
              children: [
                item('child-bad', 'Child bad', { href: 'javascript:alert(1)' }),
                item('child-ok', 'Child ok', { href: '/child' }),
              ],
            }),
            item('number', 'Number link', { href: 42 as unknown as string }),
          ],
        },
      ],
    })

    act(() => result.current.setSearch('link'))
    await advance(200)
    const parent = result.current.results.find((r) => r.item.id === 'parent')!.item
    expect(result.current.results.find((r) => r.item.id === 'number')!.item).not.toHaveProperty(
      'href',
    )

    act(() => result.current.drillDown(parent))
    const children = Object.fromEntries(result.current.results.map((r) => [r.item.id, r.item]))
    expect(children['child-bad']).not.toHaveProperty('href')
    expect(children['child-ok'].href).toBe('/child')
  })

  it('select() never navigates to a stripped href', async () => {
    const onNavigate = vi.fn()
    const { result } = renderPalette({
      onNavigate,
      asyncSources: [
        {
          id: 'links',
          shouldFilter: false,
          load: async () => [
            item('evil', 'Evil', { href: 'javascript:alert(1)' }),
            item('fine', 'Fine', { href: '/fine' }),
          ],
        },
      ],
    })

    act(() => result.current.setSearch('x'))
    await advance(200)
    act(() => result.current.select('evil'))
    expect(onNavigate).not.toHaveBeenCalled()

    act(() => result.current.setSearch('x'))
    await advance(200)
    act(() => result.current.select('fine'))
    expect(onNavigate).toHaveBeenCalledWith('/fine', expect.objectContaining({ id: 'fine' }))
  })

  it('leaves registered commands untouched', async () => {
    const { result } = renderPalette({ asyncSources: [{ id: 'remote', load: async () => [] }] }, [
      item('local', 'Local link', { href: 'myapp://local' }),
    ])
    await act(async () => {})

    act(() => result.current.setSearch('link'))
    await advance(200)
    expect(result.current.results[0].item.href).toBe('myapp://local')
  })
})
