import { describe, it, expect } from 'vitest'
import { createGroupManager } from '../../src/core/grouping'
import type { CommandItem, ScoredItem } from '../../src/core/types'

function scored(item: Partial<CommandItem>, score: number): ScoredItem {
  return { item: { id: 'x', label: 'x', ...item }, score }
}

describe('createGroupManager', () => {
  it('starts with initial groups', () => {
    const gm = createGroupManager([
      { id: 'nav', label: 'Navigation', priority: 10 },
      { id: 'actions', label: 'Actions', priority: 5 },
    ])
    expect(gm.getAllGroups()).toHaveLength(2)
    expect(gm.getAllGroups()[0].id).toBe('nav') // higher priority first
  })

  it('adds and retrieves a group', () => {
    const gm = createGroupManager()
    gm.addGroup({ id: 'settings', label: 'Settings' })
    expect(gm.getGroup('settings')?.label).toBe('Settings')
  })

  it('removes a group', () => {
    const gm = createGroupManager([{ id: 'nav', label: 'Nav' }])
    gm.removeGroup('nav')
    expect(gm.getGroup('nav')).toBeUndefined()
    expect(gm.getAllGroups()).toHaveLength(0)
  })

  it('getAllGroups returns sorted by priority descending', () => {
    const gm = createGroupManager([
      { id: 'low', label: 'Low', priority: 1 },
      { id: 'high', label: 'High', priority: 100 },
      { id: 'mid', label: 'Mid', priority: 50 },
    ])
    const all = gm.getAllGroups()
    expect(all.map((g) => g.id)).toEqual(['high', 'mid', 'low'])
  })

  describe('groupResults', () => {
    it('groups items by their group field', () => {
      const gm = createGroupManager([
        { id: 'nav', label: 'Navigation', priority: 10 },
        { id: 'actions', label: 'Actions', priority: 5 },
      ])

      const items = [
        scored({ id: 'a', group: 'nav' }, 0.9),
        scored({ id: 'b', group: 'actions' }, 0.8),
        scored({ id: 'c', group: 'nav' }, 0.7),
      ]

      const result = gm.groupResults(items)
      expect(result).toHaveLength(2)
      expect(result[0].group.id).toBe('nav')
      expect(result[0].items).toHaveLength(2)
      expect(result[1].group.id).toBe('actions')
      expect(result[1].items).toHaveLength(1)
    })

    it('puts ungrouped items at the end', () => {
      const gm = createGroupManager([{ id: 'nav', label: 'Nav' }])

      const items = [
        scored({ id: 'a', group: 'nav' }, 0.9),
        scored({ id: 'b' }, 0.8), // no group
      ]

      const result = gm.groupResults(items)
      expect(result).toHaveLength(2)
      expect(result[0].group.id).toBe('nav')
      expect(result[1].group.label).toBe('Other')
      expect(result[1].items).toHaveLength(1)
    })

    it('handles items with undefined groups as auto-discovered', () => {
      const gm = createGroupManager()

      const items = [
        scored({ id: 'a', group: 'Billing' }, 0.9),
        scored({ id: 'b', group: 'Billing' }, 0.7),
      ]

      const result = gm.groupResults(items)
      expect(result).toHaveLength(1)
      expect(result[0].group.label).toBe('Billing') // auto-labeled
    })

    it('sorts items within group by score descending', () => {
      const gm = createGroupManager([{ id: 'nav', label: 'Nav' }])

      const items = [
        scored({ id: 'low', group: 'nav' }, 0.3),
        scored({ id: 'high', group: 'nav' }, 0.9),
        scored({ id: 'mid', group: 'nav' }, 0.6),
      ]

      const result = gm.groupResults(items)
      expect(result[0].items.map((i) => i.item.id)).toEqual(['high', 'mid', 'low'])
    })

    it('returns empty for no items', () => {
      const gm = createGroupManager()
      expect(gm.groupResults([])).toEqual([])
    })

    it('orders groups by priority when no search query', () => {
      const gm = createGroupManager([
        { id: 'deploy', label: 'Deploy', priority: 10 },
        { id: 'settings', label: 'Settings', priority: 5 },
      ])

      const items = [
        scored({ id: 'a', group: 'settings' }, 0.95),
        scored({ id: 'b', group: 'deploy' }, 0.3),
      ]

      const result = gm.groupResults(items)
      expect(result[0].group.id).toBe('deploy') // higher priority first
      expect(result[1].group.id).toBe('settings')
    })

    it('orders groups by best item score when search query is provided', () => {
      const gm = createGroupManager([
        { id: 'deploy', label: 'Deploy', priority: 10 },
        { id: 'settings', label: 'Settings', priority: 5 },
      ])

      const items = [
        scored({ id: 'internal-contacts', group: 'settings' }, 0.95),
        scored({ id: 'external-tools', group: 'deploy' }, 0.3),
      ]

      // With search query: settings group should come first (higher score)
      const result = gm.groupResults(items, 'internal')
      expect(result[0].group.id).toBe('settings')
      expect(result[1].group.id).toBe('deploy')
    })

    it('falls back to priority order with empty search query', () => {
      const gm = createGroupManager([
        { id: 'deploy', label: 'Deploy', priority: 10 },
        { id: 'settings', label: 'Settings', priority: 5 },
      ])

      const items = [
        scored({ id: 'a', group: 'settings' }, 0.95),
        scored({ id: 'b', group: 'deploy' }, 0.3),
      ]

      const resultEmpty = gm.groupResults(items, '')
      expect(resultEmpty[0].group.id).toBe('deploy') // priority order
      const resultUndefined = gm.groupResults(items)
      expect(resultUndefined[0].group.id).toBe('deploy') // priority order
    })

    it('keeps ungrouped items at the end even during search', () => {
      const gm = createGroupManager([
        { id: 'nav', label: 'Nav', priority: 10 },
      ])

      const items = [
        scored({ id: 'a', group: 'nav' }, 0.3),
        scored({ id: 'b' }, 0.95), // ungrouped but high score
      ]

      const result = gm.groupResults(items, 'test')
      expect(result[result.length - 1].group.id).toBe('__ungrouped__')
    })
  })

  describe('extractGroups', () => {
    it('extracts unique groups from commands', () => {
      const gm = createGroupManager([
        { id: 'nav', label: 'Navigation', priority: 10 },
      ])

      const commands: CommandItem[] = [
        { id: 'a', label: 'A', group: 'nav' },
        { id: 'b', label: 'B', group: 'nav' },
        { id: 'c', label: 'C', group: 'settings' },
      ]

      const groups = gm.extractGroups(commands)
      expect(groups).toHaveLength(2)
      expect(groups[0].id).toBe('nav')
      expect(groups[0].label).toBe('Navigation') // uses defined label
      expect(groups[1].id).toBe('settings')
      expect(groups[1].label).toBe('settings') // fallback for undefined
    })

    it('returns empty for commands with no groups', () => {
      const gm = createGroupManager()
      const commands: CommandItem[] = [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ]
      expect(gm.extractGroups(commands)).toEqual([])
    })
  })

  describe('destructured usage', () => {
    it('groupResults works when pulled off the returned object (no `this`)', () => {
      const { groupResults } = createGroupManager([{ id: 'nav', label: 'Navigation' }])
      const out = groupResults([scored({ id: 'a', label: 'A', group: 'nav' }, 1)], '')
      expect(out.map((g) => g.group.id)).toContain('nav')
    })
  })
})
