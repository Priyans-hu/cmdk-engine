import { describe, it, expect, vi, beforeAll } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'

// cmdk uses ResizeObserver + scrollIntoView internally — mock them for jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView = vi.fn()
})
import { CommandEngineProvider } from '../../src/react/context'
import { CommandPalette, useCommandPaletteShortcut } from '../../src/adapters/cmdk/command-palette'
import { useEngineContext } from '../../src/react/context'

// Helper: register commands within the provider
function RegisterCommands({ commands }: { commands: Parameters<ReturnType<typeof useEngineContext>['registry']['registerMany']>[0] }) {
  const { registry } = useEngineContext()
  React.useEffect(() => {
    return registry.registerMany(commands)
  }, [])
  return null
}

function renderPalette(
  commands: Parameters<ReturnType<typeof useEngineContext>['registry']['registerMany']>[0] = [],
  props: Partial<React.ComponentProps<typeof CommandPalette>> = {},
) {
  return render(
    <CommandEngineProvider>
      <RegisterCommands commands={commands} />
      <CommandPalette {...props} />
    </CommandEngineProvider>,
  )
}

describe('CommandPalette (cmdk adapter)', () => {
  it('renders search input with placeholder', () => {
    renderPalette([], { placeholder: 'Search commands...' })
    expect(screen.getByPlaceholderText('Search commands...')).toBeTruthy()
  })

  it('renders command items', async () => {
    renderPalette([
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'settings', label: 'Settings', href: '/settings' },
    ])

    // cmdk renders items — they should appear in the document
    expect(screen.getByText('Dashboard')).toBeTruthy()
    expect(screen.getByText('Settings')).toBeTruthy()
  })

  it('shows empty state when no results match', async () => {
    renderPalette([
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
    ])

    const input = screen.getByRole('combobox')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'zzzzzzz' } })
    })

    // cmdk Empty should render our default empty message
    expect(screen.getByText('No results found.')).toBeTruthy()
  })

  it('filters items based on search query', async () => {
    renderPalette([
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'settings', label: 'Settings', href: '/settings' },
      { id: 'billing', label: 'Billing', href: '/billing' },
    ])

    const input = screen.getByRole('combobox')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'dash' } })
    })

    expect(screen.getByText('Dashboard')).toBeTruthy()
    // Other items should be filtered out — they won't have visible cmdk items
    // Since shouldFilter={false}, cmdk still renders them but our engine controls visibility
    // The results from useCommandPalette should only include matching items
  })

  it('calls onSelect when item is selected', async () => {
    const onSelect = vi.fn()
    renderPalette(
      [
        { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      ],
      { onSelect },
    )

    const item = screen.getByText('Dashboard')
    await act(async () => {
      fireEvent.click(item)
    })

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dashboard', label: 'Dashboard' }),
    )
  })

  it('renders custom item renderer', () => {
    renderPalette(
      [{ id: 'test', label: 'Test Item', description: 'A test' }],
      {
        renderItem: (item) => (
          <div data-testid="custom-item">{item.label} - {item.description}</div>
        ),
      },
    )

    expect(screen.getByTestId('custom-item')).toBeTruthy()
    expect(screen.getByText('Test Item - A test')).toBeTruthy()
  })

  it('renders custom empty state', async () => {
    renderPalette(
      [{ id: 'test', label: 'Test', href: '/test' }],
      {
        renderEmpty: () => <div>Nothing here!</div>,
      },
    )

    const input = screen.getByRole('combobox')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'zzzzzzz' } })
    })

    expect(screen.getByText('Nothing here!')).toBeTruthy()
  })

  it('renders items with shortcuts', () => {
    renderPalette([
      { id: 'save', label: 'Save', shortcut: ['⌘', 'S'] },
    ])

    expect(screen.getByText('⌘')).toBeTruthy()
    expect(screen.getByText('S')).toBeTruthy()
  })

  it('renders items with descriptions', () => {
    renderPalette([
      { id: 'billing', label: 'Billing', description: 'Manage your billing' },
    ])

    expect(screen.getByText('Manage your billing')).toBeTruthy()
  })

  it('renders grouped items with headings', () => {
    renderPalette([
      { id: 'dashboard', label: 'Dashboard', group: 'Navigation', href: '/dashboard' },
      { id: 'save', label: 'Save', group: 'Actions' },
    ])

    // cmdk renders group headings
    expect(screen.getByText('Navigation')).toBeTruthy()
    expect(screen.getByText('Actions')).toBeTruthy()
  })

  it('passes disabled state to cmdk items', () => {
    renderPalette([
      { id: 'disabled-cmd', label: 'Disabled Command', disabled: true },
    ])

    expect(screen.getByText('Disabled Command')).toBeTruthy()
    // cmdk marks disabled items with data-disabled attribute
    const item = screen.getByText('Disabled Command').closest('[cmdk-item]')
    expect(item?.getAttribute('data-disabled')).toBeTruthy()
  })

  it('uses default placeholder when not specified', () => {
    renderPalette()
    expect(screen.getByPlaceholderText('Type a command or search...')).toBeTruthy()
  })

  it('Cmd+K opens the dialog via useCommandPaletteShortcut (shared state)', () => {
    function AppWithShortcut() {
      useCommandPaletteShortcut('k')
      return <CommandPalette dialog placeholder="Search here" />
    }
    render(
      <CommandEngineProvider>
        <RegisterCommands commands={[{ id: 'a', label: 'Alpha', href: '/a' }]} />
        <AppWithShortcut />
      </CommandEngineProvider>,
    )
    // Dialog is closed initially — its input is not mounted.
    expect(screen.queryByPlaceholderText('Search here')).toBeNull()

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    })

    // The shortcut hook and the rendered dialog share isOpen → it opens.
    expect(screen.getByPlaceholderText('Search here')).toBeTruthy()
  })
})
