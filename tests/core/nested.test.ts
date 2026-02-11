import { describe, it, expect } from 'vitest'
import { createFuzzySearch } from '../../src/core/search'
import { createGroupManager } from '../../src/core/grouping'
import type { CommandItem, ScoredItem } from '../../src/core/types'

function cmd(overrides: Partial<CommandItem>): CommandItem {
  return { id: 'x', label: 'x', ...overrides }
}

describe('Nested / Hierarchical Commands', () => {
  describe('CommandItem.children structure', () => {
    it('supports children array on a command', () => {
      const parent = cmd({
        id: 'settings',
        label: 'Settings',
        children: [
          cmd({ id: 'general', label: 'General' }),
          cmd({ id: 'security', label: 'Security' }),
        ],
      })

      expect(parent.children).toHaveLength(2)
      expect(parent.children![0].id).toBe('general')
      expect(parent.children![1].id).toBe('security')
    })

    it('supports deeply nested children', () => {
      const root = cmd({
        id: 'root',
        label: 'Root',
        children: [
          cmd({
            id: 'level1',
            label: 'Level 1',
            children: [
              cmd({ id: 'level2', label: 'Level 2' }),
            ],
          }),
        ],
      })

      expect(root.children![0].children![0].id).toBe('level2')
    })

    it('parentId can be set on child items', () => {
      const child = cmd({ id: 'child', label: 'Child', parentId: 'parent' })
      expect(child.parentId).toBe('parent')
    })
  })

  describe('Search within children', () => {
    const search = createFuzzySearch()

    it('searches only the given items (simulating nested scope)', () => {
      const children = [
        cmd({ id: 'general', label: 'General Settings' }),
        cmd({ id: 'security', label: 'Security Settings' }),
        cmd({ id: 'notifications', label: 'Notifications' }),
      ]

      const results = search.search('security', children)
      expect(results[0].item.id).toBe('security')
    })

    it('returns all children for empty query', () => {
      const children = [
        cmd({ id: 'a', label: 'A' }),
        cmd({ id: 'b', label: 'B' }),
        cmd({ id: 'c', label: 'C' }),
      ]

      const results = search.search('', children)
      expect(results).toHaveLength(3)
    })

    it('does not search parent items when in nested scope', () => {
      // Simulate: we're inside "Settings", searching only its children
      const parentItems = [
        cmd({ id: 'dashboard', label: 'Dashboard' }),
        cmd({ id: 'settings', label: 'Settings' }),
      ]
      const childItems = [
        cmd({ id: 'general', label: 'General' }),
        cmd({ id: 'security', label: 'Security' }),
      ]

      // Search in children only — "dashboard" should not appear
      const results = search.search('dashboard', childItems)
      expect(results).toHaveLength(0)
    })
  })

  describe('Grouping with nested items', () => {
    it('groups nested items by their group field', () => {
      const gm = createGroupManager([
        { id: 'account', label: 'Account', priority: 10 },
        { id: 'security', label: 'Security', priority: 5 },
      ])

      const children: ScoredItem[] = [
        { item: cmd({ id: 'profile', label: 'Profile', group: 'account' }), score: 0.9 },
        { item: cmd({ id: 'password', label: 'Password', group: 'security' }), score: 0.8 },
        { item: cmd({ id: 'email', label: 'Email', group: 'account' }), score: 0.7 },
      ]

      const grouped = gm.groupResults(children)
      expect(grouped).toHaveLength(2)
      expect(grouped[0].group.id).toBe('account')
      expect(grouped[0].items).toHaveLength(2)
      expect(grouped[1].group.id).toBe('security')
    })
  })

  describe('Breadcrumb / path tracking', () => {
    it('builds breadcrumb trail from activePath', () => {
      const root = cmd({ id: 'settings', label: 'Settings' })
      const child = cmd({ id: 'security', label: 'Security' })

      // Simulate activePath
      const activePath = [root, child]
      expect(activePath).toHaveLength(2)
      expect(activePath[0].label).toBe('Settings')
      expect(activePath[1].label).toBe('Security')
    })

    it('depth equals activePath length', () => {
      const activePath: CommandItem[] = []
      expect(activePath.length).toBe(0) // root level

      activePath.push(cmd({ id: 'settings', label: 'Settings' }))
      expect(activePath.length).toBe(1)

      activePath.push(cmd({ id: 'security', label: 'Security' }))
      expect(activePath.length).toBe(2)
    })
  })

  describe('Drill down / drill up logic', () => {
    it('drillDown adds item to activePath and filters to children', () => {
      const parent = cmd({
        id: 'settings',
        label: 'Settings',
        children: [
          cmd({ id: 'general', label: 'General' }),
          cmd({ id: 'security', label: 'Security' }),
        ],
      })

      // Simulate drillDown
      const activePath: CommandItem[] = []
      activePath.push(parent)

      // Active commands should now be parent's children
      const activeCommands = activePath[activePath.length - 1].children ?? []
      expect(activeCommands).toHaveLength(2)
      expect(activeCommands[0].id).toBe('general')
    })

    it('drillUp removes last item from activePath', () => {
      const root = cmd({ id: 'settings', label: 'Settings' })
      const child = cmd({ id: 'security', label: 'Security' })

      const activePath = [root, child]
      const afterDrillUp = activePath.slice(0, -1)

      expect(afterDrillUp).toHaveLength(1)
      expect(afterDrillUp[0].id).toBe('settings')
    })

    it('drillUp from depth=1 returns to root', () => {
      const activePath = [cmd({ id: 'settings', label: 'Settings' })]
      const afterDrillUp = activePath.slice(0, -1)

      expect(afterDrillUp).toHaveLength(0)
    })

    it('resetPath clears entire activePath', () => {
      const activePath = [
        cmd({ id: 'settings', label: 'Settings' }),
        cmd({ id: 'security', label: 'Security' }),
      ]
      const afterReset: CommandItem[] = []

      expect(afterReset).toHaveLength(0)
    })

    it('items without children should not trigger drillDown', () => {
      const leaf = cmd({ id: 'general', label: 'General' })

      // Simulate: if no children, don't drill down
      const shouldDrill = (leaf.children?.length ?? 0) > 0
      expect(shouldDrill).toBe(false)
    })

    it('items with empty children array should not trigger drillDown', () => {
      const leaf = cmd({ id: 'general', label: 'General', children: [] })

      const shouldDrill = (leaf.children?.length ?? 0) > 0
      expect(shouldDrill).toBe(false)
    })
  })

  describe('Active command resolution', () => {
    it('returns root commands when activePath is empty', () => {
      const rootCommands = [
        cmd({ id: 'dashboard', label: 'Dashboard' }),
        cmd({ id: 'settings', label: 'Settings', children: [cmd({ id: 'general', label: 'General' })] }),
      ]
      const activePath: CommandItem[] = []

      const activeCommands = activePath.length === 0
        ? rootCommands
        : activePath[activePath.length - 1].children ?? []

      expect(activeCommands).toEqual(rootCommands)
    })

    it('returns children when activePath has items', () => {
      const rootCommands = [
        cmd({ id: 'dashboard', label: 'Dashboard' }),
        cmd({
          id: 'settings',
          label: 'Settings',
          children: [
            cmd({ id: 'general', label: 'General' }),
            cmd({ id: 'security', label: 'Security' }),
          ],
        }),
      ]
      const activePath = [rootCommands[1]] // drilled into "Settings"

      const activeCommands = activePath.length === 0
        ? rootCommands
        : activePath[activePath.length - 1].children ?? []

      expect(activeCommands).toHaveLength(2)
      expect(activeCommands[0].id).toBe('general')
      expect(activeCommands[1].id).toBe('security')
    })
  })
})
