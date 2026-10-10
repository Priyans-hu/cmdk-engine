import type { CommandItem, CommandRegistry } from './types'
import { createBatchScheduler } from './utils'

/**
 * Create a new command registry — the central store for all commands.
 *
 * The registry implements a pub/sub pattern compatible with React's
 * useSyncExternalStore. Commands can be registered, updated, and removed,
 * and subscribers are notified of changes via batched microtask updates.
 *
 * When several registrations share an id, the newest one is visible. Removing
 * it brings back the one it replaced, so two components can register the same
 * id and either can unmount first.
 */
export function createRegistry(): CommandRegistry {
  // Every live registration, oldest first
  const entries = new Set<{ item: CommandItem }>()
  const listeners = new Set<() => void>()
  const schedule = createBatchScheduler()

  // Visible command per id (the newest entry) and the snapshot, both rebuilt
  // only after a change
  let commands = new Map<string, CommandItem>()
  let snapshot: CommandItem[] = []
  let snapshotDirty = true

  function notify(): void {
    schedule(() => {
      for (const listener of listeners) {
        listener()
      }
    })
  }

  function invalidateSnapshot(): void {
    snapshotDirty = true
    notify()
  }

  function visible(): Map<string, CommandItem> {
    if (snapshotDirty) {
      // A repeated id keeps its first position and shows its newest entry
      commands = new Map()
      for (const { item } of entries) commands.set(item.id, item)
      snapshot = Array.from(commands.values())
      snapshotDirty = false
    }
    return commands
  }

  function register(command: CommandItem): () => void {
    return registerMany([command])
  }

  function registerMany(items: CommandItem[]): () => void {
    const added = items.map((item) => ({ item: { ...item } }))
    for (const entry of added) entries.add(entry)
    invalidateSnapshot()
    // Notify only if something was removed, so a second call does nothing
    return () => {
      if (added.filter((entry) => entries.delete(entry)).length) invalidateSnapshot()
    }
  }

  function update(id: string, partial: Partial<Omit<CommandItem, 'id'>>): void {
    let newest: { item: CommandItem } | undefined
    for (const entry of entries) if (entry.item.id === id) newest = entry
    if (!newest) return
    // Keep the map key and the item's own id in sync — never let `id` drift.
    newest.item = { ...newest.item, ...partial, id }
    invalidateSnapshot()
  }

  function unregister(id: string): void {
    if ([...entries].filter((entry) => entry.item.id === id && entries.delete(entry)).length) {
      invalidateSnapshot()
    }
  }

  function getAll(): CommandItem[] {
    return Array.from(visible().values())
  }

  function getById(id: string): CommandItem | undefined {
    return visible().get(id)
  }

  function getByGroup(groupId: string): CommandItem[] {
    return getAll().filter((cmd) => cmd.group === groupId)
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function getSnapshot(): CommandItem[] {
    visible()
    return snapshot
  }

  return {
    register,
    registerMany,
    update,
    unregister,
    getAll,
    getById,
    getByGroup,
    subscribe,
    getSnapshot,
  }
}
