import type { CommandItem, SynonymMap } from './types'

/**
 * Create a keyword engine for synonym expansion and user alias management.
 *
 * The engine enriches command items with additional searchable keywords
 * based on a synonym dictionary and optional user-defined aliases.
 */
export function createKeywordEngine(
  synonyms: SynonymMap = {},
  userAliases: Map<string, string[]> = new Map(),
) {
  return {
    /**
     * Expand a search query using the synonym dictionary.
     * Returns the original query plus any synonym matches.
     *
     * e.g., query "money" with synonyms { billing: ["money", "payment"] }
     * returns ["money", "billing"]
     */
    expandQuery(query: string): string[] {
      const q = query.toLowerCase().trim()
      if (!q) return []

      const expanded = new Set<string>([q])

      for (const [key, values] of Object.entries(synonyms)) {
        const lowerValues = values.map((v) => v.toLowerCase())
        // If query matches a synonym value, add the key
        if (lowerValues.includes(q)) {
          expanded.add(key.toLowerCase())
        }
        // If query matches a key, add all synonym values
        if (key.toLowerCase() === q) {
          for (const v of lowerValues) {
            expanded.add(v)
          }
        }
      }

      return Array.from(expanded)
    },

    /**
     * Enrich a command item's keywords with synonyms and user aliases.
     * Returns a new CommandItem with original keywords preserved and
     * synonym-expanded keywords stored separately in meta._synonymKeywords.
     * This lets the search engine score original keywords higher.
     */
    enrichItem(item: CommandItem): CommandItem {
      const originalKeywords = new Set<string>(item.keywords ?? [])
      const synonymKeywords = new Set<string>()

      // Add synonyms for existing keywords
      for (const kw of item.keywords ?? []) {
        const kwLower = kw.toLowerCase()
        if (synonyms[kwLower]) {
          for (const syn of synonyms[kwLower]) {
            if (!originalKeywords.has(syn)) synonymKeywords.add(syn)
          }
        }
        for (const [key, values] of Object.entries(synonyms)) {
          if (values.map((v) => v.toLowerCase()).includes(kwLower)) {
            if (!originalKeywords.has(key)) synonymKeywords.add(key)
          }
        }
      }

      // Add synonyms for the label
      const labelLower = item.label.toLowerCase()
      for (const [key, values] of Object.entries(synonyms)) {
        if (key.toLowerCase() === labelLower) {
          for (const v of values) {
            if (!originalKeywords.has(v)) synonymKeywords.add(v)
          }
        }
        if (values.map((v) => v.toLowerCase()).includes(labelLower)) {
          if (!originalKeywords.has(key)) synonymKeywords.add(key)
        }
      }

      // Add user aliases as original keywords (user explicitly added these)
      const aliases = userAliases.get(item.id)
      if (aliases) {
        for (const alias of aliases) {
          originalKeywords.add(alias)
        }
      }

      return {
        ...item,
        keywords: Array.from(originalKeywords),
        meta: {
          ...item.meta,
          ...(synonymKeywords.size > 0
            ? { _synonymKeywords: Array.from(synonymKeywords) }
            : {}),
        },
      }
    },

    /**
     * Enrich all items in a list.
     */
    enrichAll(items: CommandItem[]): CommandItem[] {
      return items.map((item) => this.enrichItem(item))
    },

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
     * Set the synonym dictionary.
     */
    setSynonyms(newSynonyms: SynonymMap): void {
      Object.keys(synonyms).forEach((k) => delete synonyms[k])
      Object.assign(synonyms, newSynonyms)
    },
  }
}
