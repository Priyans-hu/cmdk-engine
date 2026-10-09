import { describe, it, expect } from 'vitest'
import { searchWithSynonyms } from '../../src/react/synonym-search'
import { createFuzzySearch } from '../../src/core/search'
import { createKeywordEngine } from '../../src/core/keywords'
import type { CommandItem, ScoredItem, SearchEngine, SynonymMap } from '../../src/core/types'

const item = (id: string, label = id): CommandItem => ({ id, label })

/** Wraps an engine and keeps every query and array it returned, in call order. */
function recording(engine: SearchEngine) {
  const queries: string[] = []
  const returned: ScoredItem[][] = []
  const wrapped: SearchEngine = {
    search(query, items) {
      const result = engine.search(query, items)
      queries.push(query)
      returned.push(result)
      return result
    },
  }
  return { engine: wrapped, queries, returned }
}

/** An engine that answers each query with a fixed list (ignores the items). */
const fixed = (answers: Record<string, ScoredItem[]>): SearchEngine => ({
  search: (query) => answers[query] ?? [],
})

const summary = (results: ScoredItem[]) => results.map((s) => [s.item.id, s.score])

describe('searchWithSynonyms', () => {
  const items = [
    item('overview', 'Billing Overview'),
    item('transfer', 'Money Transfer'),
    item('cards', 'Payment Cards'),
    item('home', 'Home'),
  ]

  it("returns the engine's own array when nothing new matches", () => {
    const cases: [SynonymMap, string][] = [
      [{}, 'money'], // no synonyms
      [{ billing: ['money'] }, 'bill'], // not a key or value
      [{ billing: ['money'] }, '   '], // blank
      [{ refund: ['money'] }, 'money'], // the other term matches nothing
      [{ billing: ['overview'] }, 'overview'], // it matches only direct results
    ]
    for (const [synonyms, query] of cases) {
      const rec = recording(createFuzzySearch())
      const { expandQuery } = createKeywordEngine(synonyms)
      const out = searchWithSynonyms(rec.engine, expandQuery, query, items)
      expect(out).toBe(rec.returned[0])
    }
  })

  it('keeps the direct results and appends the rest, capped at the lowest direct score', () => {
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) => item(id))
    const direct = [
      { item: a, score: 0.9 },
      { item: b, score: 0.3 },
    ]
    const engine = fixed({
      money: direct,
      billing: [
        { item: c, score: 1 },
        { item: a, score: 1 },
        { item: d, score: 0.4 },
      ],
    })

    const out = searchWithSynonyms(engine, () => ['money', 'billing'], 'money', [])
    expect(out[0]).toBe(direct[0])
    expect(out[1]).toBe(direct[1])
    expect(out[2].item).toBe(c)
    expect(summary(out)).toEqual([
      ['a', 0.9],
      ['b', 0.3],
      ['c', 0.3], // 0.55 × 1, capped at 0.3
      ['d', 0.55 * 0.4],
    ])
  })

  it('scores 0.55 × score when there is no direct match', () => {
    const engine = fixed({ billing: [{ item: item('c'), score: 0.8 }] })
    const out = searchWithSynonyms(engine, () => ['money', 'billing'], 'money', [])
    expect(summary(out)).toEqual([['c', 0.55 * 0.8]])
  })

  it('keeps the best score of an item found by several terms; ties keep first appearance', () => {
    const [x, p, q, r, s] = ['x', 'p', 'q', 'r', 's'].map((id) => item(id))
    const engine = fixed({
      billing: [{ item: x, score: 0.9 }],
      money: [
        { item: p, score: 0.9 },
        { item: q, score: 0.8 },
        { item: s, score: 0.2 },
      ],
      payment: [
        { item: r, score: 0.8 },
        { item: p, score: 0.5 }, // lower than its "money" score: kept at 0.55 × 0.9
        { item: s, score: 0.7 }, // higher: raised to 0.55 × 0.7
      ],
    })

    const out = searchWithSynonyms(engine, () => ['billing', 'money', 'payment'], 'billing', [])
    expect(summary(out)).toEqual([
      ['x', 0.9],
      ['p', 0.55 * 0.9],
      ['q', 0.55 * 0.8],
      ['r', 0.55 * 0.8],
      ['s', 0.55 * 0.7],
    ])
  })

  it('searches each other term once, not the query again', () => {
    const rec = recording(createFuzzySearch())
    const { expandQuery } = createKeywordEngine({ billing: ['money', 'payment'] })
    searchWithSynonyms(rec.engine, expandQuery, ' Money', items)
    expect(rec.queries).toEqual([' Money', 'billing'])
  })

  it('holds its invariants over randomized synonyms, items and queries', () => {
    let seed = 7
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
    const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)]
    const words = ['bill', 'billing', 'money', 'pay', 'payment', 'credits', 'set', 'settings']
    // Scores by position, like match-sorter: its own scale, not the fuzzy one.
    const byPosition: SearchEngine = {
      search: (query, list) => {
        const hits = list.filter((i) => i.label.includes(query.toLowerCase().trim()))
        return hits.map((i, n) => ({ item: i, score: 1 - n / hits.length }))
      },
    }
    let appended = 0
    let same = 0

    for (let run = 0; run < 1000; run++) {
      const list = Array.from({ length: 2 + Math.floor(random() * 10) }, (_, n) => ({
        id: `i${n}`,
        label: `${pick(words)} ${pick(words)}`,
        keywords: random() < 0.3 ? [pick(words)] : undefined,
      }))
      const synonyms: SynonymMap = {}
      for (let k = Math.floor(random() * 4); k > 0; k--) synonyms[pick(words)] = [pick(words)]
      const keywords = createKeywordEngine(synonyms)
      const enriched = keywords.enrichAll(list)
      const query = random() < 0.2 ? ` ${pick(words).toUpperCase()}` : pick(words)

      for (const engine of [createFuzzySearch(), byPosition]) {
        const rec = recording(engine)
        const out = searchWithSynonyms(rec.engine, keywords.expandQuery, query, enriched)
        const direct = rec.returned[0]
        const tail = out.slice(direct.length)

        direct.forEach((s, n) => expect(out[n]).toBe(s))
        const outIds = out.map((s) => s.item.id)
        expect(new Set(outIds).size).toBe(outIds.length)
        // Every other term's new match is appended, and nothing else.
        const directIds = new Set(direct.map((s) => s.item.id))
        const found = rec.returned.slice(1).flat()
        const others = new Set(found.map((s) => s.item.id))
        expect(new Set(tail.map((s) => s.item.id))).toEqual(
          new Set([...others].filter((id) => !directIds.has(id))),
        )
        const ceiling = Math.min(...direct.map((s) => s.score))
        tail.forEach((s, n) => {
          expect(s.score).toBeLessThanOrEqual(ceiling)
          if (n > 0) expect(s.score).toBeLessThanOrEqual(tail[n - 1].score)
        })
        if (tail.length === 0) {
          expect(out).toBe(direct)
          same++
        } else {
          appended++
        }
      }
    }
    // Both branches are exercised.
    expect(appended).toBeGreaterThan(100)
    expect(same).toBeGreaterThan(100)
  })
})
