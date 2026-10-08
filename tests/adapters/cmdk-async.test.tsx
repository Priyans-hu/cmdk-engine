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
