import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import type { UseCommandPaletteReturn } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import { useCommandPaletteEvents } from '../../src/react/use-command-palette-events'
import type { CommandEngineConfig, CommandItem, CommandPaletteEvent } from '../../src/core/types'

const COMMANDS: CommandItem[] = [
  { id: 'billing', label: 'Billing', action: () => {} },
  { id: 'team', label: 'Team', children: [{ id: 'invite', label: 'Invite', action: () => {} }] },
]

let palette: UseCommandPaletteReturn

function Palette() {
  useCommandRegister(COMMANDS)
  palette = useCommandPalette()
  return null
}

// Rendered before the palette, so its effects run first.
function Events({ onEvent }: { onEvent: (event: CommandPaletteEvent) => void }) {
  useCommandPaletteEvents(onEvent)
  return null
}

function renderApp(
  onEvent: (event: CommandPaletteEvent) => void,
  config: CommandEngineConfig = {},
  strict = false,
) {
  const app = (
    <CommandEngineProvider config={config}>
      <Events onEvent={onEvent} />
      <Palette />
    </CommandEngineProvider>
  )
  return render(strict ? <StrictMode>{app}</StrictMode> : app)
}

// Registry updates reach subscribers in a microtask.
const flush = () => act(async () => {})
const types = (events: CommandPaletteEvent[]) => events.map((e) => e.type)

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCommandPaletteEvents', () => {
  it('reports open and close, and nothing on mount (StrictMode too)', async () => {
    const events: CommandPaletteEvent[] = []
    renderApp((e) => events.push(e), {}, true)
    await flush()
    expect(events).toEqual([])

    act(() => palette.open())
    act(() => palette.close())

    expect(types(events)).toEqual(['open', 'close'])
  })

  it('reports each settled query once, with the trimmed query and result count', async () => {
    const events: CommandPaletteEvent[] = []
    renderApp((e) => events.push(e))
    await flush()

    act(() => palette.setSearch('bil'))
    act(() => palette.setSearch('bil '))
    act(() => palette.setSearch('xyz'))
    act(() => palette.setSearch(''))

    expect(events).toEqual([
      { type: 'search', query: 'bil', resultCount: 1 },
      { type: 'search', query: 'xyz', resultCount: 0 },
    ])
  })

  it('waits for async sources to settle before reporting a query', async () => {
    const events: CommandPaletteEvent[] = []
    const remote = [{ id: 'remote-bill', label: 'Remote bill', action: () => {} }]
    renderApp((e) => events.push(e), {
      asyncSources: [{ id: 'remote', load: async () => remote }],
    })
    await flush()

    act(() => palette.setSearch('bill'))
    expect(events).toEqual([])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    expect(events).toEqual([{ type: 'search', query: 'bill', resultCount: 2 }])
  })

  it('reports a selection with its query and async source, but not a drill-down', async () => {
    const events: CommandPaletteEvent[] = []
    const remote: CommandItem = { id: 'remote-bill', label: 'Remote bill', action: () => {} }
    renderApp((e) => events.push(e), {
      asyncSources: [{ id: 'remote', load: async () => [remote] }],
    })
    await flush()

    act(() => palette.setSearch('team'))
    act(() => palette.select('team'))
    act(() => palette.select('invite'))
    act(() => palette.setSearch(' remote '))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    act(() => palette.select('remote-bill'))

    const selects = events.filter((e) => e.type === 'select')
    expect(selects).toEqual([
      {
        type: 'select',
        item: expect.objectContaining({ id: 'invite' }),
        query: '',
        sourceId: undefined,
      },
      {
        type: 'select',
        item: expect.objectContaining({ id: 'remote-bill' }),
        query: 'remote',
        sourceId: 'remote',
      },
    ])
  })

  it('reports an async source error once', async () => {
    const events: CommandPaletteEvent[] = []
    const error = new Error('offline')
    renderApp((e) => events.push(e), {
      asyncSources: [{ id: 'remote', load: () => Promise.reject(error) }],
    })
    await flush()

    act(() => palette.setSearch('bill'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    act(() => palette.setSearch('billi'))

    expect(events.filter((e) => e.type === 'asyncError')).toEqual([
      { type: 'asyncError', sourceId: 'remote', error },
    ])
    expect(palette.asyncErrors.remote).toBe(error)
  })

  it('never breaks the palette when the handler throws', async () => {
    const action = vi.fn()
    renderApp(() => {
      throw new Error('analytics down')
    })
    await flush()

    act(() => palette.open())
    act(() => palette.setSearch('bill'))
    act(() => palette.select({ id: 'billing', label: 'Billing', action }))

    expect(action).toHaveBeenCalledOnce()
    expect(palette.isOpen).toBe(false)
    // Each error is rethrown on its own timer, outside the palette.
    expect(() => vi.runOnlyPendingTimers()).toThrow('analytics down')
  })

  it('calls the latest handler', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderApp(first)
    await flush()

    rerender(
      <CommandEngineProvider>
        <Events onEvent={second} />
        <Palette />
      </CommandEngineProvider>,
    )
    act(() => palette.open())

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith({ type: 'open' })
  })
})
