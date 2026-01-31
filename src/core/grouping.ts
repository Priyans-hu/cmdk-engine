import type { CommandGroup, CommandItem, ScoredItem } from './types'

/**
 * Create a group manager that tracks command groups and their ordering.
 */
export function createGroupManager(initialGroups: CommandGroup[] = []) {
  const groups = new Map<string, CommandGroup>()

  for (const group of initialGroups) {
    groups.set(group.id, group)
  }

  return {
    /** Add or update a group definition */
    addGroup(group: CommandGroup): void {
      groups.set(group.id, group)
    },

    /** Remove a group */
    removeGroup(id: string): void {
      groups.delete(id)
    },

    /** Get a group by ID */
    getGroup(id: string): CommandGroup | undefined {
      return groups.get(id)
    },

    /** Get all defined groups sorted by priority (higher first) */
    getAllGroups(): CommandGroup[] {
      return Array.from(groups.values()).sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
      )
    },

    /**
     * Group scored items by their group field.
     * Returns groups in priority order, with items sorted by score within each group.
     * Items without a group go into an "Other" bucket at the end.
     */
    groupResults(items: ScoredItem[]): GroupedResults {
      const grouped = new Map<string, ScoredItem[]>()

      for (const scored of items) {
        const groupId = scored.item.group ?? '__ungrouped__'
        if (!grouped.has(groupId)) {
          grouped.set(groupId, [])
        }
        grouped.get(groupId)!.push(scored)
      }

      // Sort items within each group by score descending
      for (const items of grouped.values()) {
        items.sort((a, b) => b.score - a.score)
      }

      // Build result: defined groups first (by priority), then ungrouped
      const result: GroupedResults = []
      const definedGroups = this.getAllGroups()
      const usedGroupIds = new Set<string>()

      for (const group of definedGroups) {
        const groupItems = grouped.get(group.id)
        if (groupItems && groupItems.length > 0) {
          result.push({ group, items: groupItems })
          usedGroupIds.add(group.id)
        }
      }

      // Add any groups that weren't pre-defined (auto-discovered from items)
      for (const [groupId, groupItems] of grouped) {
        if (groupId === '__ungrouped__' || usedGroupIds.has(groupId)) continue
        result.push({
          group: { id: groupId, label: groupId },
          items: groupItems,
        })
      }

      // Add ungrouped items last
      const ungrouped = grouped.get('__ungrouped__')
      if (ungrouped && ungrouped.length > 0) {
        result.push({
          group: { id: '__ungrouped__', label: 'Other' },
          items: ungrouped,
        })
      }

      return result
    },

    /**
     * Extract unique groups from a list of commands.
     * Returns only groups that have at least one command.
     */
    extractGroups(commands: CommandItem[]): CommandGroup[] {
      const seen = new Set<string>()
      const result: CommandGroup[] = []

      for (const cmd of commands) {
        if (cmd.group && !seen.has(cmd.group)) {
          seen.add(cmd.group)
          const defined = groups.get(cmd.group)
          result.push(defined ?? { id: cmd.group, label: cmd.group })
        }
      }

      return result.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    },
  }
}

/** A group with its scored items */
export interface GroupedResult {
  group: CommandGroup
  items: ScoredItem[]
}

/** Array of grouped results */
export type GroupedResults = GroupedResult[]
