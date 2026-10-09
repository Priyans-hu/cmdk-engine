import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import type { UseCommandPaletteReturn } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import type { AsyncSource, CommandEngineConfig, CommandItem } from '../../src/core/types'

// Loaded items are untrusted: a server can return anything.
const malformed = (o: unknown) => o as CommandItem

function renderPalette(config: CommandEngineConfig, commands: CommandItem[] = []) {
  return renderHook(
    () => {
      useCommandRegister(commands)
      return useCommandPalette()
    },
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <CommandEngineProvider config={config}>{children}</CommandEngineProvider>
      ),
    },
  )
}

function source(items: unknown[], extra: Partial<AsyncSource> = {}): AsyncSource {
  return { id: 'remote', load: async () => items as CommandItem[], ...extra }
}

async function search(result: { current: UseCommandPaletteReturn }, query: string) {
  act(() => result.current.setSearch(query))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200)
  })
}

const ids = (palette: UseCommandPaletteReturn) => palette.results.map((r) => r.item.id)
const message = (palette: UseCommandPaletteReturn) => palette.asyncErrors.remote?.message

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe.each([
  ['shouldFilter: true', true],
  ['shouldFilter: false', false],
])('async items without an id or label (%s)', (_, shouldFilter) => {
  it('drops an item without a label, keeps rendering the rest and reports it', async () => {
    const load = [
      { id: 'r1', label: 'Remote one' },
      { id: 'r2' },
      { id: 'r3', label: 42 },
      { id: 'r4', label: '   ' },
    ]
    const { result } = renderPalette({ asyncSources: [source(load, { shouldFilter })] }, [
      { id: 'local', label: 'Remote local' },
    ])

    await search(result, 'remote')

    expect(ids(result.current)).toEqual(['local', 'r1'])
    expect(result.current.asyncErrors.remote).toBeInstanceOf(Error)
    expect(message(result.current)).toBe('3 items dropped: missing label')
  })

  it('drops children without a label', async () => {
    const parent = {
      id: 'parent',
      label: 'Remote parent',
      children: [{ id: 'child', label: 'Child' }, { id: 'nameless' }],
    }
    const { result } = renderPalette({ asyncSources: [source([parent], { shouldFilter })] })

    await search(result, 'remote')

    expect(ids(result.current)).toEqual(['parent'])
    expect(result.current.results[0].item.children!.map((c) => c.id)).toEqual(['child'])
    expect(message(result.current)).toBe('1 item dropped: missing label')
  })

  it('drops items without a non-empty string id, and names both reasons', async () => {
    const load = [null, 'text', { label: 'Remote no id' }, { id: '', label: 'Remote empty id' }]
    const { result } = renderPalette({
      asyncSources: [source([...load, { id: 7, label: 'Remote' }, { id: 'ok' }], { shouldFilter })],
    })

    await search(result, 'remote')

    expect(ids(result.current)).toEqual([])
    expect(message(result.current)).toBe('6 items dropped: missing id (5), missing label (1)')
  })

  it('keeps an item whose keywords include non-strings, without them', async () => {
    const load = [malformed({ id: 'r1', label: 'Remote', keywords: ['kw', null, 3] })]
    const { result } = renderPalette({ asyncSources: [source(load, { shouldFilter })] })

    await search(result, 'remote')

    expect(result.current.results[0].item.keywords).toEqual(['kw'])
    expect(result.current.asyncErrors).toEqual({})
  })
})

describe('async item validation · errors and valid items', () => {
  it('clears the error on the next load that drops nothing', async () => {
    const load: AsyncSource['load'] = async (query) =>
      query === 'bad' ? [malformed({ id: 'x' })] : [{ id: 'ok', label: 'Okay' }]
    const { result } = renderPalette({
      asyncSources: [{ id: 'remote', load, shouldFilter: false }],
    })

    await search(result, 'bad')
    expect(message(result.current)).toBe('1 item dropped: missing label')

    await search(result, 'good')
    expect(ids(result.current)).toEqual(['ok'])
    expect(result.current.asyncErrors).toEqual({})
  })

  it('passes valid items through unchanged and reports nothing', async () => {
    const valid: CommandItem[] = [
      { id: 'a', label: 'Remote A', keywords: ['k'], description: 'd', group: 'G', href: '/a' },
      { id: 'b', label: 'Remote B', children: [{ id: 'b1', label: 'Child' }] },
    ]
    const { result } = renderPalette({ asyncSources: [source(valid, { shouldFilter: false })] })

    await search(result, 'remote')

    const loaded = result.current.results.map((r) => r.item)
    expect(loaded).toHaveLength(valid.length)
    loaded.forEach((item, i) => {
      expect(item).toMatchObject(valid[i])
      expect(Object.keys(item)).toEqual(Object.keys(valid[i]))
    })
    expect(result.current.asyncErrors).toEqual({})
  })

  it('keeps an item with null keywords, with none', async () => {
    const load = [malformed({ id: 'r1', label: 'Remote', keywords: null })]
    const { result } = renderPalette({ asyncSources: [source(load, { shouldFilter: false })] })

    await search(result, 'remote')

    expect(result.current.results[0].item.keywords).toEqual([])
  })
})

describe('a load() that does not resolve to an array', () => {
  it.each([
    ['an object', { items: [] }],
    ['null', null],
  ])('reports %s by name instead of a minified "is not iterable"', async (_, response) => {
    const { result } = renderPalette({
      asyncSources: [{ id: 'remote', load: async () => response as unknown as CommandItem[] }],
    })

    await search(result, 'remote')

    expect(message(result.current)).toBe('load() must resolve to an array')
    expect(result.current.asyncErrors.remote).toBeInstanceOf(TypeError)
  })
})
