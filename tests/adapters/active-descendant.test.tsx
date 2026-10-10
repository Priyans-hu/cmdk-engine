import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandRegister } from '../../src/react/use-command-register'
import { useCommandPalette } from '../../src/react/use-command-palette'
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

const commands: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'billing', label: 'Billing' },
  {
    id: 'settings',
    label: 'Settings',
    children: [
      { id: 'general', label: 'General' },
      { id: 'security', label: 'Security' },
    ],
  },
]

function Register() {
  useCommandRegister(commands)
  return null
}

function Opener() {
  const { open } = useCommandPalette()
  return (
    <button type="button" onClick={open}>
      open
    </button>
  )
}

const highlighted = () =>
  document.querySelector('[cmdk-item][aria-selected="true"], [role="option"][data-highlighted]')

/** The input and the listbox name the highlighted option, or nothing when none is. */
function expectActiveDescendant() {
  const option = highlighted()
  for (const el of [screen.getByRole('combobox'), screen.getByRole('listbox')]) {
    const id = el.getAttribute('aria-activedescendant')
    expect(id === null ? null : document.getElementById(id)).toBe(option)
  }
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)))

describe.each([
  ['cmdk', cmdkAdapter],
  ['Base UI', baseUiAdapter],
] as const)('aria-activedescendant (%s adapter)', (name, { CommandPalette }) => {
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

  const press = async (key: string) => {
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('combobox'), { key })
    })
    await settle()
  }

  const type = async (value: string) => {
    await act(async () => {
      fireEvent.input(screen.getByRole('combobox'), {
        target: { value },
        inputType: 'insertText',
      })
    })
    await settle()
  }

  it('names the highlighted option after drilling down, going back and filtering', async () => {
    render(
      <CommandEngineProvider>
        <Register />
        <Opener />
        <CommandPalette dialog />
      </CommandEngineProvider>,
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'open' }))
    })
    await settle()
    expect(highlighted()?.textContent).toBe('Dashboard')
    expectActiveDescendant()

    await press('ArrowDown')
    await press('ArrowDown')
    expect(highlighted()?.textContent).toContain('Settings')
    expectActiveDescendant()

    await press('Enter')
    expect(highlighted()?.textContent).toBe('General')
    expectActiveDescendant()

    await press('Backspace')
    expect(highlighted()?.textContent).toBe('Dashboard')
    expectActiveDescendant()

    // Billing is highlighted, then filtered out
    await press('ArrowDown')
    await type('set')
    expect(highlighted()?.textContent).toContain('Settings')
    expectActiveDescendant()

    await type('zzz')
    expect(highlighted()).toBeNull()
    expectActiveDescendant()
  })
})
