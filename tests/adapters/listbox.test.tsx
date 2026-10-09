import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandRegister } from '../../src/react/use-command-register'
import { createDefaultTranslation } from '../../src/core/i18n'
import * as cmdkAdapter from '../../src/adapters/cmdk'
import * as baseUiAdapter from '../../src/adapters/base-ui'
import type { CommandEngineConfig, CommandItem, TranslationFn } from '../../src/core/types'

// cmdk scrolls the selected item into view, which jsdom lacks.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const commands: CommandItem[] = [
  { id: 'billing', label: 'Billing', group: 'Pages' },
  { id: 'team', label: 'Team', group: 'Pages' },
]

function Register() {
  useCommandRegister(commands)
  return null
}

const english = createDefaultTranslation()

describe.each([
  ['cmdk', cmdkAdapter],
  ['Base UI', baseUiAdapter],
] as const)('the results listbox (%s adapter)', (name, { CommandPalette }) => {
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

  function renderPalette(config?: CommandEngineConfig) {
    render(
      <CommandEngineProvider config={config}>
        <Register />
        <CommandPalette />
      </CommandEngineProvider>,
    )
  }

  const listName = () => screen.getByRole('listbox').getAttribute('aria-label')

  describe('accessible name', () => {
    it('is "Suggestions" by default', () => {
      renderPalette()
      expect(listName()).toBe('Suggestions')
    })

    it('comes from the palette.list translation', () => {
      const t: TranslationFn = (key) => (key === 'palette.list' ? 'Vorschläge' : english(key))
      renderPalette({ t })
      expect(listName()).toBe('Vorschläge')
    })

    it('stays "Suggestions" when the translation echoes the key', () => {
      // The README pattern: `(key) => dictionary[key] ?? key`, for a dictionary without the key
      const echo: TranslationFn = (key) => (key === 'palette.list' ? key : english(key))
      renderPalette({ t: echo })
      expect(listName()).toBe('Suggestions')
    })

    it('stays "Suggestions" when the translation returns an empty string', () => {
      const blank: TranslationFn = (key) => (key === 'palette.list' ? '' : english(key))
      renderPalette({ t: blank })
      expect(listName()).toBe('Suggestions')
    })
  })
})
