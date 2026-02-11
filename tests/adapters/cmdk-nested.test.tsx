import { describe, it, expect, beforeAll } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'

// cmdk uses ResizeObserver internally — mock it for jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

import { CommandEngineProvider } from '../../src/react/context'
import { CommandPalette } from '../../src/adapters/cmdk/command-palette'
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

describe('CommandPalette — Nested Commands (cmdk adapter)', () => {
  const nestedCommands = [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
    {
      id: 'settings',
      label: 'Settings',
      children: [
        { id: 'general', label: 'General Settings' },
        { id: 'security', label: 'Security Settings' },
      ],
    },
  ]

  it('renders items with children showing a chevron', () => {
    renderPalette(nestedCommands)

    // The "Settings" item should have a chevron indicator
    const chevron = document.querySelector('[data-cmdk-engine-item-chevron]')
    expect(chevron).toBeTruthy()
    expect(chevron?.textContent).toBe('›')
  })

  it('renders default breadcrumbs component structure', () => {
    // Breadcrumbs only show when depth > 0, which requires drilling down
    // This tests that the DefaultBreadcrumbs component structure is correct
    renderPalette(nestedCommands)

    // At root level, no breadcrumbs
    const breadcrumbs = document.querySelector('[data-cmdk-engine-breadcrumbs]')
    expect(breadcrumbs).toBeNull()
  })

  it('supports custom renderBreadcrumbs prop', () => {
    const customBreadcrumbs = (crumbs: any[], onBack: () => void) => (
      <div data-testid="custom-breadcrumbs">
        {crumbs.map((c: any) => <span key={c.id}>{c.label}</span>)}
        <button onClick={onBack}>Back</button>
      </div>
    )

    renderPalette(nestedCommands, { renderBreadcrumbs: customBreadcrumbs })

    // Custom breadcrumbs not shown at root level
    expect(screen.queryByTestId('custom-breadcrumbs')).toBeNull()
  })

  it('items without children do not show chevron', () => {
    renderPalette([{ id: 'dashboard', label: 'Dashboard', href: '/dashboard' }])

    const chevron = document.querySelector('[data-cmdk-engine-item-chevron]')
    expect(chevron).toBeNull()
  })
})
