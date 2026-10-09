import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { CommandEngineProvider } from '../../src/react/context'
import { useCommandRegister } from '../../src/react/use-command-register'
import { CommandPalette as BaseUiPalette } from '../../src/adapters/base-ui'
import type { CommandPaletteProps as BaseUiProps } from '../../src/adapters/base-ui'
import { CommandPalette as CmdkPalette } from '../../src/adapters/cmdk'
import type { CommandPaletteProps as CmdkProps } from '../../src/adapters/cmdk'
import type { AsyncSource, CommandItem } from '../../src/core/types'

afterEach(() => vi.unstubAllGlobals())

describe('Base UI adapter: same API as the cmdk adapter', () => {
  it('takes the cmdk adapter props except vimBindings', () => {
    expectTypeOf<BaseUiProps>().toEqualTypeOf<Omit<CmdkProps, 'vimBindings'>>()
    expectTypeOf<CmdkProps>().toHaveProperty('vimBindings')
    // @ts-expect-error vimBindings exists only on the cmdk adapter
    expectTypeOf<BaseUiProps>().toHaveProperty('vimBindings')

    // One props object type-checks against either adapter: switching is an
    // import-path change.
    const props = {
      dialog: true,
      label: 'Commands',
      placeholder: 'Search...',
      loop: false,
      onSelect: (item: CommandItem) => void item,
      renderEmpty: () => 'Nothing found',
      footer: 'Tips',
    } satisfies BaseUiProps
    expectTypeOf(<CmdkPalette {...props} />).toEqualTypeOf(<BaseUiPalette {...props} />)
  })
})

const commands: CommandItem[] = [
  { id: 'billing', label: 'Billing', description: 'Invoices', icon: '$', shortcut: ['G', 'B'] },
  { id: 'settings', label: 'Settings', children: [{ id: 'general', label: 'General' }] },
]

function Register() {
  useCommandRegister(commands)
  return null
}

// Typing "load" starts a load that never settles, so the palette stays loading.
const source: AsyncSource = {
  id: 'remote',
  trigger: (query) => query === 'load',
  load: () => new Promise(() => {}),
}

function renderPalette(Palette: React.ComponentType<BaseUiProps>, props: BaseUiProps = {}) {
  render(
    <CommandEngineProvider config={{ asyncSources: [source] }}>
      <Register />
      <Palette {...props} />
    </CommandEngineProvider>,
  )
}

const type = (value: string) =>
  act(async () => {
    fireEvent.input(screen.getByRole('combobox'), { target: { value }, inputType: 'insertText' })
  })

// cmdk measures its list with ResizeObserver, which jsdom lacks.
function stubResizeObserver() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
}

/** The default renderers' markup: items, empty state, loading row and breadcrumbs. */
async function defaultMarkup(Palette: React.ComponentType<BaseUiProps>) {
  const html = (selector: string) =>
    Array.from(document.querySelectorAll(selector), (el) => el.outerHTML)
  renderPalette(Palette)
  const items = html('[data-cmdk-engine-item]')
  await type('zzz')
  const empty = html('[data-cmdk-engine-empty]')
  await type('load')
  const loading = html('[data-cmdk-engine-loading]')
  await type('')
  await act(async () => {
    fireEvent.click(screen.getByText('Settings'))
  })
  const breadcrumbs = html('[data-cmdk-engine-breadcrumbs]')
  cleanup()
  return { items, empty, loading, breadcrumbs }
}

describe('Base UI adapter: same default markup as the cmdk adapter', () => {
  it('renders the same data-cmdk-engine-* elements, so existing CSS carries over', async () => {
    const baseUi = await defaultMarkup(BaseUiPalette)
    stubResizeObserver()
    const cmdk = await defaultMarkup(CmdkPalette)

    expect(baseUi.items).toHaveLength(2)
    expect(baseUi.empty).toHaveLength(1)
    expect(baseUi.loading).toHaveLength(1)
    expect(baseUi.breadcrumbs).toHaveLength(1)
    expect(baseUi).toEqual(cmdk)
  })
})

/** How many elements carry `emptyClassName`: with results, with none, and while loading. */
async function emptyClassNameCounts(Palette: React.ComponentType<BaseUiProps>) {
  const count = () => document.querySelectorAll('.empty-state').length
  renderPalette(Palette, { emptyClassName: 'empty-state' })
  const withResults = count()
  await type('zzz')
  const noResults = count()
  await type('load')
  const loading = count()
  cleanup()
  return { withResults, noResults, loading }
}

describe('Base UI adapter: emptyClassName', () => {
  // Base UI's Empty part stays mounted (it is a live region), so the class must
  // only be there while the empty state shows, or styles like padding render a
  // blank box above the results.
  it('is on an element only while the empty state shows, as with cmdk', async () => {
    const baseUi = await emptyClassNameCounts(BaseUiPalette)
    stubResizeObserver()
    const cmdk = await emptyClassNameCounts(CmdkPalette)

    expect(baseUi).toEqual({ withResults: 0, noResults: 1, loading: 0 })
    expect(baseUi).toEqual(cmdk)
  })
})
