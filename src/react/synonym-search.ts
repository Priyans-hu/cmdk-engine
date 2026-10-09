import type { CommandItem, ScoredItem, SearchEngine } from '../core/types'

/** Score factor for a match found only through a synonym of the query */
const SYNONYM_WEIGHT = 0.55

/**
 * Search `items` for `query`, then append what only its synonyms match.
 *
 * When the whole query is a synonym key or value, each other term from
 * `expandQuery` is searched too (one engine call per term). The direct results
 * stay first, as returned. The rest follow, deduped by id, scored
 * `min(0.55 × score, lowest direct score)` so the list stays sorted by score on
 * any engine's scale; ties keep their first appearance. Frecency and context
 * boosts apply later and may still reorder them. When nothing new matches,
 * the engine's own array is returned.
 */
export function searchWithSynonyms(
  engine: SearchEngine,
  expandQuery: (query: string) => string[],
  query: string,
  items: CommandItem[],
): ScoredItem[] {
  const direct = engine.search(query, items)
  const terms = expandQuery(query)
  if (terms.length < 2) return direct

  const own = query.toLowerCase().trim()
  const seen = new Set(direct.map((s) => s.item.id))
  let ceiling = Infinity
  for (const { score } of direct) if (score < ceiling) ceiling = score

  const extra = new Map<string, ScoredItem>()
  for (const term of terms) {
    if (term === own) continue
    for (const { item, score } of engine.search(term, items)) {
      if (seen.has(item.id)) continue
      const capped = Math.min(score * SYNONYM_WEIGHT, ceiling)
      const prev = extra.get(item.id)
      if (!prev || capped > prev.score) extra.set(item.id, { item, score: capped })
    }
  }
  if (extra.size === 0) return direct
  return direct.concat([...extra.values()].sort((a, b) => b.score - a.score))
}
