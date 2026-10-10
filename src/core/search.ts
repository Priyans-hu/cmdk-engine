import type { CommandItem, SearchEngine, ScoredItem } from './types'

/**
 * Fold text for matching: compatibility decomposition (NFKD), combining
 * accents U+0300 to U+036F removed, lowercased, whitespace runs collapsed to
 * one space, trimmed. "Résumé" folds to "resume", full-width letters and
 * ligatures to plain ones, a no-break space to a space. Other marks (Indic
 * vowel signs, kana voicing marks) are kept; ß and dotless ı are unchanged.
 */
export function foldText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Folded text and word initials per field string, shared by every engine, so
// a string is folded once instead of on every keystroke. Cleared when it
// reaches 50,000 strings.
const folded = new Map<string, [text: string, initials: string]>()

function fold(value: string): [text: string, initials: string] {
  let entry = folded.get(value)
  if (!entry) {
    const text = foldText(value)
    const initials = text
      .split(/[\s\-_]+/)
      .map((w) => w[0])
      .join('')
    if (folded.size >= 50000) folded.clear()
    folded.set(value, (entry = [text, initials]))
  }
  return entry
}

/**
 * Built-in lightweight fuzzy search engine.
 * Searches label, description, and keywords fields.
 * No external dependencies. Target: < 1KB gzipped.
 *
 * Scoring bonuses:
 * - Exact prefix match (highest)
 * - Word boundary match
 * - Consecutive character matches
 *
 * Query and fields are compared folded (see `foldText`): accents, Unicode
 * compatibility forms, case and repeated spaces do not matter.
 *
 * A query of several words also matches items where every word matches some
 * field, in any order ("overview billing" finds "Billing Overview"), scored
 * 0.9 × the weakest word. They come after the items that match the whole
 * query, and never score above the lowest of those.
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

      const normalizedQuery = foldText(query)
      // Only marks or a spacing accent (a dead key while typing): nothing to match.
      if (!normalizedQuery) return []
      // Distinct words, longest first: most items fail the any-order check on
      // it, and a repeated word is checked once.
      const words = [...new Set(normalizedQuery.split(' '))].sort((a, b) => b.length - a.length)
      const severalWords = normalizedQuery.includes(' ')
      const results: ScoredItem[] = []
      const anyOrder: ScoredItem[] = []
      let floor = 1

      for (const item of items) {
        // `hidden` only excludes items from the empty-query browse list (handled above).
        // With a non-empty query, hidden items are still searchable — just not browsable.
        let score = scoreItem(normalizedQuery, item)
        if (score > 0) {
          results.push({ item, score })
          floor = Math.min(floor, score)
        } else if (severalWords) {
          // Every word must match some field, in any order.
          score = 1
          for (const word of words) {
            score = Math.min(score, scoreItem(word, item))
            if (!score) break
          }
          if ((score *= 0.9) >= 0.15) anyOrder.push({ item, score })
        }
      }

      // Any-order matches follow, best first, scored at most the lowest
      // whole-query match so the list stays sorted by score.
      results.sort(byScore)
      for (const scored of anyOrder.sort(byScore)) {
        scored.score = Math.min(scored.score, floor)
        results.push(scored)
      }

      return results
    },
  }
}

// Sort by score descending, then by priority descending.
// Scores are rounded to a fixed grid first so "approximately equal"
// is a transitive relation (an epsilon compare is not, and can produce
// inconsistent orderings under TimSort).
function byScore(a: ScoredItem, b: ScoredItem): number {
  const aScore = Math.round(a.score * 1000)
  const bScore = Math.round(b.score * 1000)
  if (aScore !== bScore) return bScore - aScore
  return (b.item.priority ?? 0) - (a.item.priority ?? 0)
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

  // Score against label (highest weight). Items from plain JS or JSON can lack
  // a string label, description or keywords: those fields are skipped.
  if (typeof item.label === 'string') {
    bestScore = Math.max(bestScore, fuzzyScore(query, fold(item.label)) * 1.0)
  }

  // Score against description (medium weight)
  if (typeof item.description === 'string') {
    bestScore = Math.max(bestScore, fuzzyScore(query, fold(item.description)) * 0.7)
  }

  // Score against original keywords (medium-high weight)
  if (Array.isArray(item.keywords)) {
    for (const kw of item.keywords) {
      if (typeof kw !== 'string') continue
      bestScore = Math.max(bestScore, fuzzyScore(query, fold(kw)) * 0.85)
    }
  }

  // Score against synonym-expanded keywords (lower weight)
  const synonymKeywords = (item.meta?._synonymKeywords as string[] | undefined)
  if (synonymKeywords) {
    for (const kw of synonymKeywords) {
      bestScore = Math.max(bestScore, fuzzyScore(query, fold(kw)) * 0.55)
    }
  }

  const finalScore = Math.min(bestScore, 1)

  // Reject very low-confidence matches
  if (finalScore < 0.15) return 0

  return finalScore
}

/**
 * Fuzzy match a query against a folded target string and its word initials.
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
function fuzzyScore(query: string, [target, wordInitials]: [string, string]): number {
  if (query === target) return 1 // Exact match
  if (target.startsWith(query)) return 0.95 // Prefix match
  if (target.includes(query)) return 0.8 // Substring match

  // Check word boundary matches
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
