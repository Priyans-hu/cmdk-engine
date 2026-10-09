import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandPalette } from '../../src/react/use-command-palette'
import { useCommandRegister } from '../../src/react/use-command-register'
import { CommandPalette } from '../../src/adapters/cmdk/command-palette'
import type { CommandEngineConfig, CommandItem } from '../../src/core/types'

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

// Commands typed as CommandItem can still arrive malformed from plain JS or JSON.
const malformed = (o: Record<string, unknown>) => o as unknown as CommandItem

function Register({ commands }: { commands: CommandItem[] }) {
  useCommandRegister(commands)
  return null
}

function AsyncError() {
  const { asyncErrors } = useCommandPalette()
  return <p data-testid="async-error">{asyncErrors.remote?.message ?? 'none'}</p>
}

function renderApp(config: CommandEngineConfig, commands: CommandItem[] = []) {
  return render(
    <CommandEngineProvider config={config}>
      <Register commands={commands} />
      <h1>App</h1>
      <AsyncError />
      <CommandPalette />
    </CommandEngineProvider>,
  )
}

async function type(value: string) {
  await act(async () => {
    fireEvent.change(screen.getByRole('combobox'), { target: { value } })
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200)
  })
}

const options = () => screen.queryAllByRole('option').map((o) => o.textContent)

describe('cmdk adapter · malformed registered commands', () => {
  it('renders and searches commands without a label or with non-string keywords', async () => {
    renderApp({}, [
      malformed({ id: 'no-label', keywords: ['billing'] }),
      malformed({ id: 'reports', label: 'Reports', keywords: ['sales', null] }),
      { id: 'billing', label: 'Billing Overview' },
    ])

    expect(options()).toEqual(['', 'Reports', 'Billing Overview'])
    await type('sales')
    expect(options()).toEqual(['Reports'])
    expect(screen.getByRole('heading', { name: 'App' })).toBeTruthy()
  })
})

describe.each([
  ['shouldFilter: true', true],
  ['shouldFilter: false', false],
])('cmdk adapter · malformed async items (%s)', (_, shouldFilter) => {
  it('keeps the app rendering, shows the valid items and reports the dropped ones', async () => {
    const load = async () => [
      malformed({ id: 'r1', label: 'Remote one', keywords: ['kw', null] }),
      malformed({ id: 'r2' }),
      malformed({ id: 'r3', label: 'Remote three', keywords: null }),
    ]
    renderApp({ asyncSources: [{ id: 'remote', load, shouldFilter }] })

    await type('remote')

    expect(options()).toEqual(['Remote one', 'Remote three'])
    expect(screen.getByTestId('async-error').textContent).toBe('1 item dropped: missing label')
    expect(screen.getByRole('heading', { name: 'App' })).toBeTruthy()
  })
})
