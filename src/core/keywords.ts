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
     * Returns a new CommandItem with expanded keywords array.
     */
    enrichItem(item: CommandItem): CommandItem {
      const allKeywords = new Set<string>(item.keywords ?? [])

      // Add synonyms for existing keywords
      for (const kw of item.keywords ?? []) {
        const kwLower = kw.toLowerCase()
        // If keyword matches a synonym key, add its values
        if (synonyms[kwLower]) {
          for (const syn of synonyms[kwLower]) {
            allKeywords.add(syn)
          }
        }
        // If keyword matches a synonym value, add the key
        for (const [key, values] of Object.entries(synonyms)) {
          if (values.map((v) => v.toLowerCase()).includes(kwLower)) {
            allKeywords.add(key)
          }
        }
      }

      // Add synonyms for the label
      const labelLower = item.label.toLowerCase()
      for (const [key, values] of Object.entries(synonyms)) {
        if (key.toLowerCase() === labelLower) {
          for (const v of values) allKeywords.add(v)
        }
        if (values.map((v) => v.toLowerCase()).includes(labelLower)) {
          allKeywords.add(key)
        }
      }

      // Add user aliases for this command
      const aliases = userAliases.get(item.id)
      if (aliases) {
        for (const alias of aliases) {
          allKeywords.add(alias)
        }
      }

      return {
        ...item,
        keywords: Array.from(allKeywords),
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
