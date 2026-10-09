import { describe, it, expect } from 'vitest'
import { createFuzzySearch } from '../../src/core/search'
import { createKeywordEngine } from '../../src/core/keywords'
import type { CommandItem, ScoredItem } from '../../src/core/types'

// The 0.5 built-in search, frozen as the oracle for plain-ASCII commands: a
// one-word query must give exactly its results, and a query of several words
// must start with exactly its results (any-order matches only come after).
function searchV05(query: string, items: CommandItem[]): ScoredItem[] {
  const q = query.toLowerCase().trim()
  const results: ScoredItem[] = []
  for (const item of items) {
    const score = scoreV05(q, item)
    if (score > 0) results.push({ item, score })
  }
  return results.sort((a, b) => {
    const aScore = Math.round(a.score * 1000)
    const bScore = Math.round(b.score * 1000)
    if (aScore !== bScore) return bScore - aScore
    return (b.item.priority ?? 0) - (a.item.priority ?? 0)
  })
}

function scoreV05(query: string, item: CommandItem): number {
  let best = Math.max(
    fuzzyV05(query, item.label.toLowerCase()),
    item.description ? fuzzyV05(query, item.description.toLowerCase()) * 0.7 : 0,
  )
  for (const kw of item.keywords ?? [])
    best = Math.max(best, fuzzyV05(query, kw.toLowerCase()) * 0.85)
  for (const kw of (item.meta?._synonymKeywords as string[] | undefined) ?? []) {
    best = Math.max(best, fuzzyV05(query, kw.toLowerCase()) * 0.55)
  }
  const final = Math.min(best, 1)
  return final < 0.15 ? 0 : final
}

function fuzzyV05(query: string, target: string): number {
  if (query === target) return 1
  if (target.startsWith(query)) return 0.95
  if (target.includes(query)) return 0.8
  const wordInitials = target
    .split(/[\s\-_]+/)
    .map((w) => w[0])
    .join('')
  if (wordInitials.includes(query)) return 0.7
  let queryIdx = 0
  let current = 0
  let maxConsecutive = 0
  let bonus = 0
  let matches = 0
  let gaps = 0
  let last = -1
  for (let i = 0; i < target.length && queryIdx < query.length; i++) {
    if (target[i] === query[queryIdx]) {
      matches++
      queryIdx++
      if (last >= 0) gaps += i - last - 1
      last = i
      current++
      if (current > maxConsecutive) maxConsecutive = current
      bonus += current * 0.1
      if (i === 0 || /[\s\-_]/.test(target[i - 1])) bonus += 0.15
    } else {
      current = 0
    }
  }
  if (queryIdx < query.length) return 0
  const ratio = matches > 0 ? maxConsecutive / matches : 0
  const multiplier = ratio < 0.5 ? ratio * 0.5 : 0.4 + 0.6 * ratio
  const gapPenalty = (matches > 1 ? gaps / (matches - 1) : 0) > 3 ? 0.15 : 0
  const raw = 0.2 + (matches / target.length) * 0.3 + Math.min(bonus, 0.4)
  return Math.min(Math.max((raw - gapPenalty) * multiplier, 0), 0.6)
}

let seed = 7
const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)]
const WORDS = (
  'billing overview invoices payment settings profile security team members api keys ' +
  'webhooks reports usage analytics dashboard home help guide plans pricing upgrade ' +
  'account notifications email phone numbers logs status admin audit export import users'
).split(' ')
const phrase = (min: number, max: number) =>
  Array.from({ length: min + Math.floor(random() * (max - min + 1)) }, () => pick(WORDS)).join(' ')
const title = (text: string) => text.replace(/\b\w/g, (c) => c.toUpperCase())

const commands = createKeywordEngine({
  billing: ['money', 'payment'],
  settings: ['preferences', 'config'],
  team: ['people'],
}).enrichAll(
  Array.from({ length: 400 }, (_, n) => ({
    id: `c${n}`,
    label: title(phrase(1, 3)),
    priority: Math.floor(random() * 3),
    description: random() < 0.5 ? phrase(3, 8) : undefined,
    keywords: random() < 0.4 ? [pick(WORDS), pick(WORDS)] : undefined,
  })),
)

const word = () => {
  const w = pick(WORDS)
  const typed = w.slice(0, 1 + Math.floor(random() * w.length))
  return random() < 0.2 ? typed.toUpperCase() : typed
}
const summary = (results: ScoredItem[]) => results.map((r) => `${r.item.id}:${r.score}`)

describe('createFuzzySearch · differential against the 0.5 search (plain ASCII)', () => {
  it('gives exactly the 0.5 results for one-word queries', () => {
    const engine = createFuzzySearch()
    for (let run = 0; run < 600; run++) {
      const query = random() < 0.2 ? `  ${word()} ` : word()
      expect(summary(engine.search(query, commands))).toEqual(summary(searchV05(query, commands)))
    }
  })

  it('starts with exactly the 0.5 results for several words, then appends any-order matches below them', () => {
    const engine = createFuzzySearch()
    let appended = 0
    for (let run = 0; run < 600; run++) {
      const query = Array.from({ length: 2 + Math.floor(random() * 2) }, word).join(' ')
      const before = searchV05(query, commands)
      const after = engine.search(query, commands)
      expect(summary(after.slice(0, before.length))).toEqual(summary(before))

      const tail = after.slice(before.length)
      const ids = after.map((r) => r.item.id)
      expect(new Set(ids).size).toBe(ids.length)
      const floor = Math.min(...before.map((r) => r.score))
      tail.forEach((r, n) => {
        expect(r.score).toBeLessThanOrEqual(floor)
        if (n > 0) expect(r.score).toBeLessThanOrEqual(tail[n - 1].score)
      })
      appended += tail.length
    }
    // The any-order pass really ran.
    expect(appended).toBeGreaterThan(1000)
  })
})
