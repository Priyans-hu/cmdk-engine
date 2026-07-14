import type { CommandItem, SynonymMap } from './types'

/**
 * Create a keyword engine for synonym expansion and user alias management.
 *
 * The engine enriches command items with additional searchable keywords
 * based on a synonym dictionary and optional user-defined aliases.
 *
 * A normalized, lowercased bidirectional index is built once (and rebuilt on
 * `setSynonyms`) so enrichment is O(keywords) with map lookups rather than
 * O(keywords × synonym-entries) with per-iteration array allocation — this
 * runs on every keystroke via the results pipeline.
 */
export function createKeywordEngine(
  synonyms: SynonymMap = {},
  userAliases: Map<string, string[]> = new Map(),
) {
  let keyToValues = new Map<string, string[]>()
  let valueToKeys = new Map<string, Set<string>>()

  function rebuildIndex(dict: SynonymMap): void {
    keyToValues = new Map()
    valueToKeys = new Map()
    for (const [key, values] of Object.entries(dict)) {
      const k = key.toLowerCase()
      const lowerValues = values.map((v) => v.toLowerCase())
      keyToValues.set(k, [...new Set([...(keyToValues.get(k) ?? []), ...lowerValues])])
      for (const v of lowerValues) {
        let keys = valueToKeys.get(v)
        if (!keys) {
          keys = new Set()
          valueToKeys.set(v, keys)
        }
        keys.add(k)
      }
    }
  }

  rebuildIndex(synonyms)

  /**
   * Expand a search query using the synonym dictionary.
   * Returns the original query plus any synonym matches.
   *
   * e.g., query "money" with synonyms { billing: ["money", "payment"] }
   * returns ["money", "billing"]
   */
  function expandQuery(query: string): string[] {
    const q = query.toLowerCase().trim()
    if (!q) return []

    const expanded = new Set<string>([q])
    // Query matches a synonym value → add its key(s).
    for (const key of valueToKeys.get(q) ?? []) expanded.add(key)
    // Query matches a key → add all its values.
    for (const value of keyToValues.get(q) ?? []) expanded.add(value)

    return Array.from(expanded)
  }

  /**
   * Enrich a command item's keywords with synonyms and user aliases.
   * Returns a new CommandItem with original keywords preserved and
   * synonym-expanded keywords stored separately in meta._synonymKeywords.
   * This lets the search engine score original keywords higher.
   */
  function enrichItem(item: CommandItem): CommandItem {
    const originalKeywords = new Set<string>(item.keywords ?? [])
    const synonymKeywords = new Set<string>()

    const addSynonymsFor = (term: string): void => {
      const t = term.toLowerCase()
      for (const value of keyToValues.get(t) ?? []) {
        if (!originalKeywords.has(value)) synonymKeywords.add(value)
      }
      for (const key of valueToKeys.get(t) ?? []) {
        if (!originalKeywords.has(key)) synonymKeywords.add(key)
      }
    }

    for (const kw of item.keywords ?? []) addSynonymsFor(kw)
    addSynonymsFor(item.label)

    // User aliases become original keywords (user explicitly added these).
    for (const alias of userAliases.get(item.id) ?? []) originalKeywords.add(alias)

    // Rebuild meta, clearing any stale _synonymKeywords from a previous pass.
    const meta: Record<string, unknown> = { ...item.meta }
    delete meta._synonymKeywords
    if (synonymKeywords.size > 0) {
      meta._synonymKeywords = Array.from(synonymKeywords)
    }

    return {
      ...item,
      keywords: Array.from(originalKeywords),
      meta,
    }
  }

  /**
   * Enrich all items in a list.
   */
  function enrichAll(items: CommandItem[]): CommandItem[] {
    return items.map(enrichItem)
  }

  return {
    expandQuery,
    enrichItem,
    enrichAll,

    /**
     * Add a user alias for a command.
     */
    addAlias(commandId: string, alias: string): void {
      const existing = userAliases.get(commandId) ?? []
      if (!existing.includes(alias)) {
        userAliases.set(commandId, [...existing, alias])
      }
    },

    /**
     * Remove a user alias for a command.
     */
    removeAlias(commandId: string, alias: string): void {
      const existing = userAliases.get(commandId) ?? []
      userAliases.set(
        commandId,
        existing.filter((a) => a !== alias),
      )
    },

    /**
     * Get all user aliases.
     */
    getAliases(): Map<string, string[]> {
      return new Map(userAliases)
    },

    /**
     * Set the synonym dictionary (rebuilds the lookup index).
     */
    setSynonyms(newSynonyms: SynonymMap): void {
      Object.keys(synonyms).forEach((k) => delete synonyms[k])
      Object.assign(synonyms, newSynonyms)
      rebuildIndex(synonyms)
    },
  }
}
