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
    await new Promise<void>((r) => queueMicrotask(r))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('notifies subscribers on unregister', async () => {
    const registry = createRegistry()
    registry.register(makeCommand({ id: 'cmd-1' }))

    const listener = vi.fn()
    registry.subscribe(listener)

    registry.unregister('cmd-1')
    await new Promise<void>((r) => queueMicrotask(r))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('notifies subscribers on update', async () => {
    const registry = createRegistry()
    registry.register(makeCommand({ id: 'cmd-1' }))

    const listener = vi.fn()
    registry.subscribe(listener)

    registry.update('cmd-1', { label: 'New Label' })
    await new Promise<void>((r) => queueMicrotask(r))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('batches multiple changes into one notification', async () => {
    const registry = createRegistry()
    const listener = vi.fn()
    registry.subscribe(listener)

    registry.register(makeCommand({ id: 'a' }))
    registry.register(makeCommand({ id: 'b' }))
    registry.register(makeCommand({ id: 'c' }))

    await new Promise<void>((r) => queueMicrotask(r))
    // Should only fire once despite 3 register calls
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe stops notifications', async () => {
    const registry = createRegistry()
    const listener = vi.fn()
    const unsub = registry.subscribe(listener)

    unsub()
    registry.register(makeCommand({ id: 'cmd-1' }))

    await new Promise<void>((r) => queueMicrotask(r))
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

  it('update() never lets the id drift from the map key', () => {
    const registry = createRegistry()
    registry.register(makeCommand({ id: 'a', label: 'A' }))
    // Cast around the compile-time Omit guard to prove the runtime is safe too.
    registry.update('a', { label: 'A2', ...({ id: 'b' } as object) })
    expect(registry.getById('a')?.label).toBe('A2')
    expect(registry.getById('a')?.id).toBe('a')
    expect(registry.getById('b')).toBeUndefined()
  })
})

describe('createRegistry · one id, several registrations', () => {
  const labels = (registry: ReturnType<typeof createRegistry>) =>
    registry.getAll().map((c) => `${c.id}:${c.label}`)

  it('keeps the newer registration when the older one is removed', () => {
    const registry = createRegistry()
    const removeA = registry.registerMany([makeCommand({ id: 'help', label: 'A' })])
    registry.registerMany([makeCommand({ id: 'help', label: 'B' })])

    removeA()
    expect(labels(registry)).toEqual(['help:B'])
  })

  it('brings the older registration back when the newer one is removed', () => {
    const registry = createRegistry()
    registry.registerMany([makeCommand({ id: 'help', label: 'A' })])
    const removeB = registry.registerMany([makeCommand({ id: 'help', label: 'B' })])
    expect(labels(registry)).toEqual(['help:B'])

    removeB()
    expect(labels(registry)).toEqual(['help:A'])
  })

  it('applies the same rules to register()', () => {
    const registry = createRegistry()
    const removeA = registry.register(makeCommand({ id: 'help', label: 'A' }))
    const removeB = registry.register(makeCommand({ id: 'help', label: 'B' }))

    removeB()
    expect(registry.getById('help')?.label).toBe('A')
    removeA()
    expect(registry.getAll()).toEqual([])
  })

  it('updates the visible registration; the one it replaced comes back without the update', () => {
    const registry = createRegistry()
    registry.register(makeCommand({ id: 'help', label: 'A' }))
    const removeB = registry.register(makeCommand({ id: 'help', label: 'B' }))

    registry.update('help', { label: 'B2' })
    expect(registry.getById('help')?.label).toBe('B2')
    removeB()
    expect(registry.getById('help')?.label).toBe('A')
  })

  it('unregister(id) removes every registration of the id', () => {
    const registry = createRegistry()
    const removeA = registry.register(makeCommand({ id: 'help', label: 'A' }))
    registry.register(makeCommand({ id: 'help', label: 'B' }))

    registry.unregister('help')
    expect(registry.getAll()).toEqual([])
    removeA()
    expect(registry.getAll()).toEqual([])
  })

  it('does nothing when a cleanup runs a second time', async () => {
    const registry = createRegistry()
    const removeA = registry.registerMany([
      makeCommand({ id: 'help', label: 'A' }),
      makeCommand({ id: 'docs', label: 'A' }),
    ])
    registry.registerMany([makeCommand({ id: 'help', label: 'B' })])
    removeA()
    const snapshot = registry.getSnapshot()
    await new Promise<void>((r) => queueMicrotask(r))

    const listener = vi.fn()
    registry.subscribe(listener)
    removeA()
    await new Promise<void>((r) => queueMicrotask(r))

    expect(labels(registry)).toEqual(['help:B'])
    expect(registry.getSnapshot()).toBe(snapshot)
    expect(listener).not.toHaveBeenCalled()
  })

  it('keeps the order of the remaining ids', () => {
    const registry = createRegistry()
    const removeA = registry.registerMany([
      makeCommand({ id: 'a', label: 'A' }),
      makeCommand({ id: 'b', label: 'A' }),
      makeCommand({ id: 'c', label: 'A' }),
    ])
    const removeB = registry.registerMany([makeCommand({ id: 'b', label: 'B' })])
    registry.register(makeCommand({ id: 'd', label: 'C' }))
    expect(labels(registry)).toEqual(['a:A', 'b:B', 'c:A', 'd:C'])

    removeB()
    expect(labels(registry)).toEqual(['a:A', 'b:A', 'c:A', 'd:C'])
    removeA()
    expect(labels(registry)).toEqual(['d:C'])
  })
})
