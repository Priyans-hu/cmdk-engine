import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'

import type { AsyncSource, CommandItem, CommandEngineConfig } from '../../src/core/types'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'

// Default debounce in the hook is 200 ms — most tests advance past that.
const DEFAULT_DEBOUNCE = 200

function wrapper(config: CommandEngineConfig) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <CommandEngineProvider config={config}>{children}</CommandEngineProvider>
  }
}

/** Helper that wraps a result list in a resolved promise. */
function resolveWith(items: CommandItem[]) {
  return vi.fn(async () => items)
}

/**
 * Drain pending microtasks so async state updates triggered by `.then` /
 * `.catch` / `.finally` settle. With fake timers `waitFor` would block, so we
 * flush the microtask queue manually.
 */
async function flushMicrotasks() {
  await act(async () => {
    // A handful of `await Promise.resolve()` cycles is enough to drain the
    // chained .then().catch().finally() the hook sets up per source.
    for (let i = 0; i < 5; i++) {
      await Promise.resolve()
    }
  })
}

describe('useCommandPalette — async sources', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('runs a single async source and exposes its items', async () => {
    const remote: CommandItem[] = [
      { id: 'remote-1', label: 'Remote One' },
      { id: 'remote-2', label: 'Remote Two' },
    ]
    const load = resolveWith(remote)
    const source: AsyncSource = { id: 'remote', load }

    const { result } = renderHook(() => useCommandPalette(), {
      wrapper: wrapper({ asyncSources: [source] }),
    })

    expect(result.current.isLoading).toBe(false)

    act(() => {
      result.current.setSearch('rem')
    })

    // Before debounce window elapses the loader should not have fired.
    expect(load).not.toHaveBeenCalled()

    // Advance past debounce — loader fires.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE)
    })
    await flushMicrotasks()

    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith('rem', expect.any(AbortSignal))
    expect(result.current.isLoading).toBe(false)

    const ids = result.current.flatResults.map((r) => r.item.id)
    expect(ids).toEqual(expect.arrayContaining(['remote-1', 'remote-2']))
  })

  it('toggles isLoading true while a source is in flight', async () => {
    let resolveLoad: (items: CommandItem[]) => void = () => {}
    const load = vi.fn(
      () =>
        new Promise<CommandItem[]>((resolve) => {
          resolveLoad = resolve
        }),
    )
    const source: AsyncSource = { id: 'pending', load }

    const { result } = renderHook(() => useCommandPalette(), {
      wrapper: wrapper({ asyncSources: [source] }),
    })

    act(() => {
      result.current.setSearch('foo')
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE)
    })
    await flushMicrotasks()

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveLoad([{ id: 'p-1', label: 'Pending One' }])
    })
    await flushMicrotasks()

    expect(result.current.isLoading).toBe(false)
  })

  it('aggregates results from multiple async sources', async () => {
    // Use the same query token as the labels so fuzzy search keeps both items.
    const sourceA: AsyncSource = {
      id: 'a',
      load: resolveWith([{ id: 'a-1', label: 'A item match' }]),
    }
    const sourceB: AsyncSource = {
      id: 'b',
      load: resolveWith([{ id: 'b-1', label: 'B item match' }]),
    }

    const { result } = renderHook(() => useCommandPalette(), {
      wrapper: wrapper({ asyncSources: [sourceA, sourceB] }),
    })

    act(() => {
      result.current.setSearch('match')
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE)
    })
    await flushMicrotasks()

    const ids = result.current.flatResults.map((r) => r.item.id)
    expect(ids).toEqual(expect.arrayContaining(['a-1', 'b-1']))
  })

  it('isolates errors: failing source records error, others still deliver results', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const goodSource: AsyncSource = {
      id: 'good',
      load: resolveWith([{ id: 'good-1', label: 'Good query item' }]),
    }
    const badSource: AsyncSource = {
      id: 'bad',
      load: vi.fn(async () => {
        throw new Error('boom')
      }),
    }

    const { result } = renderHook(() => useCommandPalette(), {
      wrapper: wrapper({ asyncSources: [goodSource, badSource] }),
    })

    act(() => {
      result.current.setSearch('query')
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE)
    })
    await flushMicrotasks()

    expect(result.current.asyncErrors?.bad?.message).toBe('boom')
    expect(result.current.asyncErrors?.good).toBeUndefined()
    const ids = result.current.flatResults.map((r) => r.item.id)
    expect(ids).toContain('good-1')

    consoleSpy.mockRestore()
  })

  it('aborts an in-flight request when the query changes', async () => {
    const seenSignals: AbortSignal[] = []
    const load = vi.fn(async (_query: string, signal: AbortSignal) => {
      seenSignals.push(signal)
      // Resolve only after a long delay so we can interrupt it.
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 1_000)
        signal.addEventListener('abort', () => {
          clearTimeout(t)
          resolve()
        })
      })
      if (signal.aborted) throw new Error('aborted')
      return [{ id: 'late', label: 'Late' }]
    })
    const source: AsyncSource = { id: 'slow', load }

    const { result } = renderHook(() => useCommandPalette(), {
      wrapper: wrapper({ asyncSources: [source] }),
    })

    act(() => {
      result.current.setSearch('one')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE)
    })
    await flushMicrotasks()

    expect(seenSignals).toHaveLength(1)
    expect(seenSignals[0].aborted).toBe(false)

    // New query before the previous loader completes — should abort it.
    act(() => {
      result.current.setSearch('two')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE)
    })
    await flushMicrotasks()

    expect(seenSignals[0].aborted).toBe(true)
    expect(seenSignals).toHaveLength(2)
    expect(seenSignals[1].aborted).toBe(false)
  })

  it('respects a custom trigger predicate', async () => {
    const load = resolveWith([{ id: 't-1', label: 'Triggered' }])
    const source: AsyncSource = {
      id: 'gated',
      trigger: (query) => query.startsWith('>'),
      load,
    }

    const { result } = renderHook(() => useCommandPalette(), {
      wrapper: wrapper({ asyncSources: [source] }),
    })

    // Query that does not match the trigger — loader should not fire.
    act(() => {
      result.current.setSearch('hello')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE * 2)
    })
    await flushMicrotasks()
    expect(load).not.toHaveBeenCalled()

    // Now use a matching prefix.
    act(() => {
      result.current.setSearch('>cmd')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE)
    })
    await flushMicrotasks()

    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith('>cmd', expect.any(AbortSignal))
  })

  it('debounces rapid keystrokes — only the last query fires the loader', async () => {
    const load = resolveWith([{ id: 'd-1', label: 'Debounced' }])
    const source: AsyncSource = { id: 'debounced', load, debounceMs: 100 }

    const { result } = renderHook(() => useCommandPalette(), {
      wrapper: wrapper({ asyncSources: [source] }),
    })

    act(() => {
      result.current.setSearch('a')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    act(() => {
      result.current.setSearch('ab')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    act(() => {
      result.current.setSearch('abc')
    })

    // Only after a full debounce window with no further changes should it fire.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    await flushMicrotasks()

    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenLastCalledWith('abc', expect.any(AbortSignal))
  })

  it('does not fire for empty query when no trigger override is provided', async () => {
    const load = resolveWith([{ id: 'e-1', label: 'Empty' }])
    const source: AsyncSource = { id: 'empty-skip', load }

    renderHook(() => useCommandPalette(), {
      wrapper: wrapper({ asyncSources: [source] }),
    })

    // Initial query is '' — default trigger returns false on empty strings.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEFAULT_DEBOUNCE * 2)
    })
    await flushMicrotasks()

    expect(load).not.toHaveBeenCalled()
  })
})
