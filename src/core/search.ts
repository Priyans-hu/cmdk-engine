import type { CommandItem, SearchEngine, ScoredItem } from './types'

/**
 * Built-in lightweight fuzzy search engine.
 * Searches label, description, and keywords fields.
 * No external dependencies. Target: < 1KB gzipped.
 *
 * Scoring bonuses:
 * - Exact prefix match (highest)
 * - Word boundary match
 * - Consecutive character matches
 * - Case-sensitive exact match
 */
export function createFuzzySearch(): SearchEngine {
  return {
    search(query: string, items: CommandItem[]): ScoredItem[] {
      if (!query || query.trim() === '') {
        // Empty query returns all items with max score, sorted by priority
        return items
          .filter((item) => !item.hidden)
          .map((item) => ({ item, score: 1 }))
          .sort((a, b) => (b.item.priority ?? 0) - (a.item.priority ?? 0))
      }

      const normalizedQuery = query.toLowerCase().trim()
      const results: ScoredItem[] = []

      for (const item of items) {
        // `hidden` only excludes items from the empty-query browse list (handled above).
        // With a non-empty query, hidden items are still searchable — just not browsable.
        const score = scoreItem(normalizedQuery, item)
        if (score > 0) {
          results.push({ item, score })
        }
      }

      // Sort by score descending, then by priority descending.
      // Scores are rounded to a fixed grid first so "approximately equal"
      // is a transitive relation (an epsilon compare is not, and can produce
      // inconsistent orderings under TimSort).
      results.sort((a, b) => {
        const aScore = Math.round(a.score * 1000)
        const bScore = Math.round(b.score * 1000)
        if (aScore !== bScore) return bScore - aScore
        return (b.item.priority ?? 0) - (a.item.priority ?? 0)
      })

      return results
    },
  }
}

/**
 * Score a single item against a query.
 * Returns 0 if no match, up to 1 for perfect match.
 *
 * Scoring weights:
 * - Label:            1.0x  (exact label match is highest signal)
 * - Original keywords: 0.85x (user explicitly tagged these)
 * - Description:      0.7x
 * - Synonym keywords:  0.55x (injected by keyword engine, lower confidence)
 */
function scoreItem(query: string, item: CommandItem): number {
  let bestScore = 0

  // Score against label (highest weight)
  bestScore = Math.max(bestScore, fuzzyScore(query, item.label.toLowerCase()) * 1.0)

  // Score against description (medium weight)
  if (item.description) {
    bestScore = Math.max(bestScore, fuzzyScore(query, item.description.toLowerCase()) * 0.7)
  }

  // Score against original keywords (medium-high weight)
  if (item.keywords) {
    for (const kw of item.keywords) {
      bestScore = Math.max(bestScore, fuzzyScore(query, kw.toLowerCase()) * 0.85)
    }
  }

  // Score against synonym-expanded keywords (lower weight)
  const synonymKeywords = (item.meta?._synonymKeywords as string[] | undefined)
  if (synonymKeywords) {
    for (const kw of synonymKeywords) {
      bestScore = Math.max(bestScore, fuzzyScore(query, kw.toLowerCase()) * 0.55)
    }
  }

  const finalScore = Math.min(bestScore, 1)

  // Reject very low-confidence matches
  if (finalScore < 0.15) return 0

  return finalScore
}

/**
 * Fuzzy match a query against a target string.
 * Returns a score between 0 and 1.
 *
 * Scoring tiers:
 * - Exact match: 1.0
 * - Prefix match: 0.95
 * - Substring match: 0.8
 * - Word initials: 0.7
 * - Fuzzy (consecutive chars): up to 0.6
 * - Fuzzy (scattered chars): heavily penalized, often rejected
 */
function fuzzyScore(query: string, target: string): number {
  if (query === target) return 1 // Exact match
  if (target.startsWith(query)) return 0.95 // Prefix match
  if (target.includes(query)) return 0.8 // Substring match

  // Check word boundary matches
  const words = target.split(/[\s\-_]+/)
  const wordInitials = words.map((w) => w[0]).join('')
  if (wordInitials.includes(query)) return 0.7 // Initials match (e.g., "bs" matches "Billing Settings")

  // Fuzzy character-by-character matching
  let queryIdx = 0
  let currentConsecutive = 0
  let maxConsecutive = 0
  let totalBonus = 0
  let matchCount = 0
  let totalGaps = 0
  let lastMatchIdx = -1

  for (let i = 0; i < target.length && queryIdx < query.length; i++) {
    if (target[i] === query[queryIdx]) {
      matchCount++
      queryIdx++

      // Track gaps between matches
      if (lastMatchIdx >= 0) {
        totalGaps += i - lastMatchIdx - 1
      }
      lastMatchIdx = i

      // Track consecutive matches
      currentConsecutive++
      if (currentConsecutive > maxConsecutive) {
        maxConsecutive = currentConsecutive
      }
      totalBonus += currentConsecutive * 0.1

      // Bonus for word boundary match
      if (i === 0 || /[\s\-_]/.test(target[i - 1])) {
        totalBonus += 0.15
      }
    } else {
      currentConsecutive = 0
    }
  }

  // All query characters must match
  if (queryIdx < query.length) return 0

  // Contiguity ratio: how consecutive are the matches?
  const contiguityRatio = matchCount > 0 ? maxConsecutive / matchCount : 0

  // Aggressive penalty for scattered matches (contiguity < 50%)
  // If most chars are scattered, the match is likely a false positive
  const contiguityMultiplier =
    contiguityRatio < 0.5
      ? contiguityRatio * 0.5 // Very scattered: 0 to 0.25x
      : 0.4 + 0.6 * contiguityRatio // Mostly consecutive: 0.7 to 1.0x

  // Average gap penalty
  const avgGap = matchCount > 1 ? totalGaps / (matchCount - 1) : 0
  const gapPenalty = avgGap > 3 ? 0.15 : 0

  // Base score from match ratio + bonuses
  const matchRatio = matchCount / target.length
  const rawScore = 0.2 + matchRatio * 0.3 + Math.min(totalBonus, 0.4)
  const score = (rawScore - gapPenalty) * contiguityMultiplier

  return Math.min(Math.max(score, 0), 0.6) // Cap fuzzy matches well below substring matches
}
