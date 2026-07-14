import { describe, it, expect } from 'vitest'
import { createContextEngine } from '../../src/core/context'
import type { CommandItem, ScoredItem } from '../../src/core/types'

function scored(overrides: Partial<CommandItem>, score: number): ScoredItem {
  return { item: { id: 'x', label: 'x', ...overrides }, score }
}

describe('createContextEngine', () => {
  it('boosts items whose scope matches the context path', () => {
    const engine = createContextEngine(0.2)
    const items = [
      scored({ id: 'billing', scope: ['/billing'] }, 0.5),
      scored({ id: 'settings', scope: ['/settings'] }, 0.5),
    ]

    const result = engine.boost(items, { path: '/billing/overview' })
    const billing = result.find((r) => r.item.id === 'billing')!
    const settings = result.find((r) => r.item.id === 'settings')!

    expect(billing.score).toBe(0.7) // 0.5 + 0.2 boost
    expect(settings.score).toBe(0.5) // no boost
  })

  it('matches exact path', () => {
    const engine = createContextEngine(0.2)
    const items = [scored({ id: 'a', scope: ['/billing'] }, 0.5)]

    const result = engine.boost(items, { path: '/billing' })
    expect(result[0].score).toBe(0.7)
  })

  it('matches prefix path', () => {
    const engine = createContextEngine(0.2)
    const items = [scored({ id: 'a', scope: ['/billing'] }, 0.5)]

    const result = engine.boost(items, { path: '/billing/overview' })
    expect(result[0].score).toBe(0.7)
  })

  it('matches glob pattern /billing/*', () => {
    const engine = createContextEngine(0.2)
    const items = [scored({ id: 'a', scope: ['/billing/*'] }, 0.5)]

    // Should match child paths
    const result = engine.boost(items, { path: '/billing/overview' })
    expect(result[0].score).toBe(0.7)
  })

  it('glob pattern does not match exact path', () => {
    const engine = createContextEngine(0.2)
    const items = [scored({ id: 'a', scope: ['/billing/*'] }, 0.5)]

    // Glob /* should NOT match the path itself
    const result = engine.boost(items, { path: '/billing' })
    expect(result[0].score).toBe(0.5)
  })

  it('does not boost items without scope', () => {
    const engine = createContextEngine(0.2)
    const items = [scored({ id: 'a' }, 0.5)]

    const result = engine.boost(items, { path: '/billing' })
    expect(result[0].score).toBe(0.5)
  })

  it('does not boost when context is empty', () => {
    const engine = createContextEngine(0.2)
    const items = [scored({ id: 'a', scope: ['/billing'] }, 0.5)]

    const result = engine.boost(items, {})
    expect(result[0].score).toBe(0.5)
  })

  it('clamps boosted score to 1.0', () => {
    const engine = createContextEngine(0.3)
    const items = [scored({ id: 'a', scope: ['/billing'] }, 0.9)]

    const result = engine.boost(items, { path: '/billing' })
    expect(result[0].score).toBe(1.0)
  })

  it('matches via tags', () => {
    const engine = createContextEngine(0.2)
    const items = [scored({ id: 'a', scope: ['billing'] }, 0.5)]

    const result = engine.boost(items, { tags: ['billing', 'admin'] })
    expect(result[0].score).toBe(0.7)
  })

  it('uses custom boost weight', () => {
    const engine = createContextEngine(0.1)
    const items = [scored({ id: 'a', scope: ['/billing'] }, 0.5)]

    const result = engine.boost(items, { path: '/billing' })
    expect(result[0].score).toBeCloseTo(0.6)
  })

  it('does not match unrelated paths', () => {
    const engine = createContextEngine(0.2)
    const items = [scored({ id: 'a', scope: ['/billing'] }, 0.5)]

    const result = engine.boost(items, { path: '/settings/profile' })
    expect(result[0].score).toBe(0.5)
  })

  it("boosts a command scoped to root '/' on any path", () => {
    const engine = createContextEngine(0.2)
    const items = [scored({ id: 'a', scope: ['/'] }, 0.5)]
    expect(engine.boost(items, { path: '/' })[0].score).toBeCloseTo(0.7)
    expect(engine.boost(items, { path: '/billing/overview' })[0].score).toBeCloseTo(0.7)
  })
})
