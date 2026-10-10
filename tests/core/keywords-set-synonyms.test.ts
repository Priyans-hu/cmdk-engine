import { describe, it, expect } from 'vitest'
import { createKeywordEngine } from '../../src/core/keywords'

describe('createKeywordEngine · setSynonyms', () => {
  it("leaves the caller's dictionary unchanged", () => {
    const initial = { billing: ['money'] }
    const engine = createKeywordEngine(initial)
    engine.setSynonyms({ settings: ['config'] })
    expect(initial).toEqual({ billing: ['money'] })
    expect(engine.expandQuery('settings')).toEqual(['settings', 'config'])
    expect(engine.expandQuery('money')).toEqual(['money'])
  })

  it('works when the first dictionary is frozen', () => {
    const engine = createKeywordEngine(Object.freeze({ billing: ['money'] }))
    expect(() => engine.setSynonyms({ settings: ['config'] })).not.toThrow()
    expect(engine.expandQuery('settings')).toEqual(['settings', 'config'])
  })

  it('keeps working when given the same object again', () => {
    const dictionary = { billing: ['money'] }
    const engine = createKeywordEngine(dictionary)
    engine.setSynonyms(dictionary)
    expect(engine.expandQuery('money')).toEqual(['money', 'billing'])
    expect(dictionary).toEqual({ billing: ['money'] })
  })
})
