import type { CommandItem, CommandRegistry } from './types'
import { createBatchScheduler } from './utils'

/**
 * Create a new command registry — the central store for all commands.
 *
 * The registry implements a pub/sub pattern compatible with React's
 * useSyncExternalStore. Commands can be registered, updated, and removed,
 * and subscribers are notified of changes via batched microtask updates.
 */
export function createRegistry(): CommandRegistry {
  const commands = new Map<string, CommandItem>()
  const listeners = new Set<() => void>()
  const schedule = createBatchScheduler()

  // Cached snapshot — only recalculated when commands change
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

  function register(command: CommandItem): () => void {
    commands.set(command.id, { ...command })
    invalidateSnapshot()
    return () => unregister(command.id)
  }

  function registerMany(items: CommandItem[]): () => void {
    for (const item of items) {
      commands.set(item.id, { ...item })
    }
    invalidateSnapshot()
    return () => {
      for (const item of items) {
        commands.delete(item.id)
      }
      invalidateSnapshot()
    }
  }

  function update(id: string, partial: Partial<CommandItem>): void {
    const existing = commands.get(id)
    if (!existing) return
    commands.set(id, { ...existing, ...partial })
    invalidateSnapshot()
  }

  function unregister(id: string): void {
    if (commands.delete(id)) {
      invalidateSnapshot()
    }
  }

  function getAll(): CommandItem[] {
    return Array.from(commands.values())
  }

  function getById(id: string): CommandItem | undefined {
    return commands.get(id)
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
    if (snapshotDirty) {
      snapshot = Array.from(commands.values())
      snapshotDirty = false
    }
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
