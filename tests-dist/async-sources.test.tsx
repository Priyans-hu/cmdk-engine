import { describe, it, expect, vi, beforeAll } from 'vitest'
import React from 'react'
import { createRequire } from 'node:module'
import { render, screen, fireEvent, act } from '@testing-library/react'
// Self-reference: these resolve through package.json `exports` to the built dist/, not src/.
import { CommandEngineProvider } from 'cmdk-engine/react'
import { CommandPalette } from 'cmdk-engine/adapters/cmdk'
import type { AsyncSource, CommandItem } from 'cmdk-engine'

// cmdk uses ResizeObserver + scrollIntoView internally — mock them for jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView = vi.fn()
})

interface AsyncEntries {
  CommandEngineProvider: typeof CommandEngineProvider
  CommandPalette: typeof CommandPalette
}

// The provider (cmdk-engine/react) loads; the palette (cmdk-engine/adapters/cmdk)
// must see that shared state across the entry boundary.
async function checkAsyncSources(entries: AsyncEntries) {
  let finish: (items: CommandItem[]) => void = () => {}
  const load = vi.fn<AsyncSource['load']>(() => new Promise((resolve) => (finish = resolve)))
  const source: AsyncSource = { id: 'remote', debounceMs: 0, shouldFilter: false, load }
  const view = render(
    <entries.CommandEngineProvider config={{ asyncSources: [source] }}>
      <entries.CommandPalette
        renderItem={(item) => (
          <a data-testid={item.id} href={item.href}>
            {item.label}
          </a>
        )}
      />
    </entries.CommandEngineProvider>,
  )

  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'remote' } })
  expect(await screen.findByText('Loading...')).toBeTruthy()
  await vi.waitFor(() => expect(load).toHaveBeenCalledOnce())

  await act(async () =>
    finish([
      { id: 'ok', label: 'Remote result', href: '/ok' },
      { id: 'evil', label: 'Evil result', href: 'javascript:alert(1)' },
    ]),
  )
  expect(await screen.findByText('Remote result')).toBeTruthy()
  expect(screen.getByTestId('ok').getAttribute('href')).toBe('/ok')
  expect(screen.getByTestId('evil').hasAttribute('href')).toBe(false)
  expect(screen.queryByText('Loading...')).toBeNull()
  view.unmount()
}

describe('built package: async sources', () => {
  it('loads, shows the loading row and strips unsafe hrefs through the ESM entries', async () => {
    await checkAsyncSources({ CommandEngineProvider, CommandPalette })
  })

  it('loads, shows the loading row and strips unsafe hrefs through the CJS entries', async () => {
    const require = createRequire(import.meta.url)
    await checkAsyncSources({
      ...require('cmdk-engine/react'),
      ...require('cmdk-engine/adapters/cmdk'),
    })
  })
})
