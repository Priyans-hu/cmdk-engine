import { describe, it, expect } from 'vitest'
import { createAccessFilter, createSimpleAccessProvider } from '../../src/core/access-control'
import type { CommandItem } from '../../src/core/types'

function cmd(overrides: Partial<CommandItem>): CommandItem {
  return { id: 'x', label: 'x', ...overrides }
}

describe('createAccessFilter', () => {
  const provider = createSimpleAccessProvider(['billing.view', 'settings.view', 'admin'])

  it('passes through items with no permissions required', () => {
    const filter = createAccessFilter(provider)
    const items = [cmd({ id: 'a' }), cmd({ id: 'b' })]
    expect(filter(items)).toHaveLength(2)
  })

  it('passes through items with empty permissions array', () => {
    const filter = createAccessFilter(provider)
    const items = [cmd({ id: 'a', permissions: [] })]
    expect(filter(items)).toHaveLength(1)
  })

  it('filters items the user has permission for (any mode)', () => {
    const filter = createAccessFilter(provider, 'any')
    const items = [
      cmd({ id: 'billing', permissions: ['billing.view'] }),
      cmd({ id: 'secret', permissions: ['super.admin'] }),
      cmd({ id: 'open', permissions: [] }),
    ]

    const result = filter(items)
    expect(result).toHaveLength(2)
    expect(result.map((i) => i.id)).toEqual(['billing', 'open'])
  })

  it('filters with all mode — requires all permissions', () => {
    const filter = createAccessFilter(provider, 'all')
    const items = [
      cmd({ id: 'a', permissions: ['billing.view', 'settings.view'] }), // has both
      cmd({ id: 'b', permissions: ['billing.view', 'super.admin'] }), // missing super.admin
    ]

    const result = filter(items)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })

  it('defaults to any mode', () => {
    const filter = createAccessFilter(provider)
    const items = [cmd({ id: 'a', permissions: ['billing.view', 'super.admin'] })]
    expect(filter(items)).toHaveLength(1) // passes because user has billing.view
  })
})

describe('createSimpleAccessProvider', () => {
  it('creates provider from array', () => {
    const provider = createSimpleAccessProvider(['a', 'b'])
    expect(provider.hasPermission('a')).toBe(true)
    expect(provider.hasPermission('c')).toBe(false)
  })

  it('creates provider from Set', () => {
    const provider = createSimpleAccessProvider(new Set(['a', 'b']))
    expect(provider.hasPermission('a')).toBe(true)
  })

  it('hasAnyPermission works', () => {
    const provider = createSimpleAccessProvider(['a', 'b'])
    expect(provider.hasAnyPermission(['a', 'c'])).toBe(true)
    expect(provider.hasAnyPermission(['c', 'd'])).toBe(false)
  })

  it('hasAllPermissions works', () => {
    const provider = createSimpleAccessProvider(['a', 'b'])
    expect(provider.hasAllPermissions(['a', 'b'])).toBe(true)
    expect(provider.hasAllPermissions(['a', 'c'])).toBe(false)
  })
})
