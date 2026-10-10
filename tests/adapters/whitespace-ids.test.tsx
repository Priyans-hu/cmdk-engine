import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandRegister } from '../../src/react/use-command-register'
import * as cmdkAdapter from '../../src/adapters/cmdk'
import * as baseUiAdapter from '../../src/adapters/base-ui'
import type { CommandItem } from '../../src/core/types'

// cmdk scrolls the selected item into view, which jsdom lacks.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

// cmdk trims item values; these ids only differ from their label-free form by whitespace.
const commands: CommandItem[] = [
  { id: 'first', label: 'First' },
  { id: ' lead-trail ', label: 'Lead and trail' },
  { id: '\ttab', label: 'Leading tab' },
]

function Register({ items = commands }: { items?: CommandItem[] }) {
  useCommandRegister(items)
  return null
}

const highlighted = () =>
  document.querySelector(
    '[cmdk-item][data-selected="true"] [data-cmdk-engine-item-label], [role="option"][data-highlighted] [data-cmdk-engine-item-label]',
  )?.textContent

describe.each([
  ['cmdk', cmdkAdapter],
  ['Base UI', baseUiAdapter],
] as const)('ids with surrounding whitespace (%s adapter)', (name, { CommandPalette }) => {
  // cmdk measures its list with ResizeObserver; Base UI needs no jsdom polyfills.
  beforeEach(() => {
    if (name === 'cmdk') {
      vi.stubGlobal(
        'ResizeObserver',
        class {
          observe() {}
          unobserve() {}
          disconnect() {}
        },
      )
    }
  })

  function renderPalette(onSelect: (item: CommandItem) => void) {
    render(
      <CommandEngineProvider>
        <Register />
        <CommandPalette onSelect={onSelect} />
      </CommandEngineProvider>,
    )
    screen.getByRole('combobox').focus()
  }

  const press = (key: string) =>
    act(async () => {
      fireEvent.keyDown(screen.getByRole('combobox'), { key })
    })

  it('selects them by click with the original id', async () => {
    const onSelect = vi.fn()
    renderPalette(onSelect)
    for (const label of ['Lead and trail', 'Leading tab']) {
      await act(async () => {
        fireEvent.click(screen.getByText(label))
      })
    }
    expect(onSelect.mock.calls.map(([item]) => item.id)).toEqual([' lead-trail ', '\ttab'])
  })

  it('keeps the highlight on them and selects them with Enter', async () => {
    const onSelect = vi.fn()
    renderPalette(onSelect)
    await press('ArrowDown')
    expect(highlighted()).toBe('Lead and trail')
    await press('ArrowDown')
    expect(highlighted()).toBe('Leading tab')
    await press('Enter')
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '\ttab' }))
  })
})

describe('ids with surrounding whitespace (cmdk adapter)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  })

  const app = (items: CommandItem[]) => (
    <CommandEngineProvider>
      <Register items={items} />
      <cmdkAdapter.CommandPalette />
    </CommandEngineProvider>
  )

  // The Base UI adapter keeps the highlighted position instead (documented).
  it('keeps the highlighted item when the results change', async () => {
    const { rerender } = render(app(commands))
    await act(async () => {})
    expect(highlighted()).toBe('First')
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    })
    expect(highlighted()).toBe('Lead and trail')

    rerender(app([{ id: 'top', label: 'Top', priority: 10 }, ...commands.slice(1)]))
    await act(async () => {})
    expect(screen.getByText('Top')).toBeTruthy()
    expect(highlighted()).toBe('Lead and trail')
  })
})
