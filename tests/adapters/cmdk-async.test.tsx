import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { CommandPalette } from '../../src/adapters/cmdk/command-palette'
import type { AsyncSource, CommandEngineConfig, CommandItem } from '../../src/core/types'

// cmdk uses ResizeObserver + scrollIntoView internally — mock them for jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView = vi.fn()
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function renderPalette(
  config: CommandEngineConfig,
  props: Partial<React.ComponentProps<typeof CommandPalette>> = {},
) {
  return render(
    <CommandEngineProvider config={config}>
      <CommandPalette {...props} />
    </CommandEngineProvider>,
  )
}

async function type(value: string) {
  await act(async () => {
    fireEvent.change(screen.getByRole('combobox'), { target: { value } })
  })
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const item = (id: string, label: string, extra: Partial<CommandItem> = {}): CommandItem => ({
  id,
  label,
  ...extra,
})

describe('CommandPalette with async sources', () => {
  it('shows the palette.loading row instead of the empty state while sources load', async () => {
    let finish: (items: CommandItem[]) => void = () => {}
    const load = vi.fn<AsyncSource['load']>(
      () => new Promise<CommandItem[]>((resolve) => (finish = resolve)),
    )
    renderPalette({ asyncSources: [{ id: 'remote', load }] })
    expect(screen.queryByText('Loading...')).toBeNull()

    await type('rem')
    // Debounce window: nothing requested yet, but no "No results found." flash.
    expect(load).not.toHaveBeenCalled()
    expect(screen.getByText('Loading...')).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe('Loading...')
    expect(screen.queryByText('No results found.')).toBeNull()

    await advance(200)
    expect(screen.getByText('Loading...')).toBeTruthy()
    await act(async () => finish([item('remote-1', 'Remote one')]))

    expect(screen.queryByText('Loading...')).toBeNull()
    expect(screen.getByText('Remote one')).toBeTruthy()
  })

  it('translates the loading row and honours renderLoading', async () => {
    const config: CommandEngineConfig = {
      t: (key) => (key === 'palette.loading' ? 'Chargement...' : key),
      asyncSources: [{ id: 'remote', load: () => new Promise(() => {}) }],
    }
    const { unmount } = renderPalette(config)
    await type('x')
    expect(screen.getByText('Chargement...')).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe('Chargement...')
    unmount()

    renderPalette(config, { renderLoading: () => <span>Fetching</span> })
    await type('x')
    expect(screen.getByText('Fetching')).toBeTruthy()
  })

  it('renders no loading row without async sources', async () => {
    renderPalette({})
    await type('anything')
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByText('No results found.')).toBeTruthy()
  })

  it('loads in an inline palette that never opens', async () => {
    renderPalette({
      asyncSources: [{ id: 'remote', load: async () => [item('inline', 'Inline result')] }],
    })

    await type('inline')
    await advance(200)

    expect(screen.getByText('Inline result')).toBeTruthy()
  })

  it('custom renderItem anchors only ever see allowed hrefs', async () => {
    const source: AsyncSource = {
      id: 'links',
      shouldFilter: false,
      load: async () => [
        item('evil', 'Evil link', { href: 'JaVaScRiPt:alert(1)' }),
        item('fine', 'Fine link', { href: 'https://example.com/fine' }),
      ],
    }
    renderPalette(
      { asyncSources: [source] },
      {
        renderItem: (it) => (
          <a data-testid={`anchor-${it.id}`} href={it.href}>
            {it.label}
          </a>
        ),
      },
    )

    await type('link')
    await advance(200)

    expect(screen.getByTestId('anchor-evil').hasAttribute('href')).toBe(false)
    expect(screen.getByTestId('anchor-fine').getAttribute('href')).toBe('https://example.com/fine')
  })
})
