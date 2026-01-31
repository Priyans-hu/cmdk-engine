import { describe, it, expect, vi } from 'vitest'
import { createRegistry } from '../../src/core/registry'
import type { CommandItem } from '../../src/core/types'

function makeCommand(overrides: Partial<CommandItem> = {}): CommandItem {
  return {
    id: 'test-cmd',
    label: 'Test Command',
    ...overrides,
  }
}

describe('createRegistry', () => {
  it('creates an empty registry', () => {
    const registry = createRegistry()
    expect(registry.getAll()).toEqual([])
    expect(registry.getSnapshot()).toEqual([])
  })

  it('registers a single command', () => {
    const registry = createRegistry()
    const cmd = makeCommand({ id: 'cmd-1', label: 'Command 1' })

    registry.register(cmd)
    expect(registry.getAll()).toHaveLength(1)
    expect(registry.getAll()[0].id).toBe('cmd-1')
  })

  it('returns unregister function from register()', () => {
    const registry = createRegistry()
    const unregister = registry.register(makeCommand({ id: 'cmd-1' }))

    expect(registry.getAll()).toHaveLength(1)
    unregister()
    expect(registry.getAll()).toHaveLength(0)
  })

  it('registers multiple commands at once', () => {
    const registry = createRegistry()
    const cmds = [
      makeCommand({ id: 'cmd-1', label: 'A' }),
      makeCommand({ id: 'cmd-2', label: 'B' }),
      makeCommand({ id: 'cmd-3', label: 'C' }),
    ]

    const unregister = registry.registerMany(cmds)
    expect(registry.getAll()).toHaveLength(3)

    unregister()
    expect(registry.getAll()).toHaveLength(0)
  })

  it('updates a command by ID', () => {
    const registry = createRegistry()
    registry.register(makeCommand({ id: 'cmd-1', label: 'Original' }))

    registry.update('cmd-1', { label: 'Updated' })
    expect(registry.getById('cmd-1')?.label).toBe('Updated')
  })

  it('update on non-existent ID does nothing', () => {
    const registry = createRegistry()
    registry.update('nope', { label: 'Updated' })
    expect(registry.getAll()).toHaveLength(0)
  })

  it('unregisters a command by ID', () => {
    const registry = createRegistry()
    registry.register(makeCommand({ id: 'cmd-1' }))
    registry.register(makeCommand({ id: 'cmd-2' }))

    registry.unregister('cmd-1')
    expect(registry.getAll()).toHaveLength(1)
    expect(registry.getById('cmd-1')).toBeUndefined()
  })

  it('unregister on non-existent ID does nothing', () => {
    const registry = createRegistry()
    registry.register(makeCommand({ id: 'cmd-1' }))
    registry.unregister('nope')
    expect(registry.getAll()).toHaveLength(1)
  })

  it('getById returns the command', () => {
    const registry = createRegistry()
    registry.register(makeCommand({ id: 'cmd-1', label: 'Found' }))

    expect(registry.getById('cmd-1')?.label).toBe('Found')
    expect(registry.getById('nope')).toBeUndefined()
  })

  it('getByGroup filters by group', () => {
    const registry = createRegistry()
    registry.register(makeCommand({ id: 'a', group: 'nav' }))
    registry.register(makeCommand({ id: 'b', group: 'nav' }))
    registry.register(makeCommand({ id: 'c', group: 'actions' }))

    expect(registry.getByGroup('nav')).toHaveLength(2)
    expect(registry.getByGroup('actions')).toHaveLength(1)
    expect(registry.getByGroup('other')).toHaveLength(0)
  })

  it('getSnapshot returns a stable reference until change', () => {
    const registry = createRegistry()
    registry.register(makeCommand({ id: 'cmd-1' }))

    const snap1 = registry.getSnapshot()
    const snap2 = registry.getSnapshot()
    expect(snap1).toBe(snap2) // Same reference

    registry.register(makeCommand({ id: 'cmd-2' }))
    const snap3 = registry.getSnapshot()
    expect(snap3).not.toBe(snap1) // New reference after change
    expect(snap3).toHaveLength(2)
  })

  it('notifies subscribers on register', async () => {
    const registry = createRegistry()
    const listener = vi.fn()
    registry.subscribe(listener)

    registry.register(makeCommand({ id: 'cmd-1' }))

    // Notification is batched via microtask
    await new Promise((r) => queueMicrotask(r))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('notifies subscribers on unregister', async () => {
    const registry = createRegistry()
    registry.register(makeCommand({ id: 'cmd-1' }))

    const listener = vi.fn()
    registry.subscribe(listener)

    registry.unregister('cmd-1')
    await new Promise((r) => queueMicrotask(r))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('notifies subscribers on update', async () => {
    const registry = createRegistry()
    registry.register(makeCommand({ id: 'cmd-1' }))

    const listener = vi.fn()
    registry.subscribe(listener)

    registry.update('cmd-1', { label: 'New Label' })
    await new Promise((r) => queueMicrotask(r))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('batches multiple changes into one notification', async () => {
    const registry = createRegistry()
    const listener = vi.fn()
    registry.subscribe(listener)

    registry.register(makeCommand({ id: 'a' }))
    registry.register(makeCommand({ id: 'b' }))
    registry.register(makeCommand({ id: 'c' }))

    await new Promise((r) => queueMicrotask(r))
    // Should only fire once despite 3 register calls
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe stops notifications', async () => {
    const registry = createRegistry()
    const listener = vi.fn()
    const unsub = registry.subscribe(listener)

    unsub()
    registry.register(makeCommand({ id: 'cmd-1' }))

    await new Promise((r) => queueMicrotask(r))
    expect(listener).not.toHaveBeenCalled()
  })

  it('stores a copy of the command (no mutation leaking)', () => {
    const registry = createRegistry()
    const cmd = makeCommand({ id: 'cmd-1', label: 'Original' })
    registry.register(cmd)

    // Mutate the original object
    cmd.label = 'Mutated'

    // Registry should still have the original
    expect(registry.getById('cmd-1')?.label).toBe('Original')
  })
})
