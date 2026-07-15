import type { TranslationFn } from './types'

/** Default English UI strings */
const DEFAULT_STRINGS: Record<string, string> = {
  'palette.label': 'Command palette',
  'palette.placeholder': 'Type a command or search...',
  'palette.empty': 'No results found.',
  'palette.loading': 'Loading...',
  'breadcrumbs.back': 'Go back',
  'group.recent': 'Recent',
  'group.other': 'Other',
  'search.history': 'Recent Searches',
}

/**
 * Create the default English translation function.
 * Returns the English string for known keys, or the key itself as fallback.
 */
export function createDefaultTranslation(): TranslationFn {
  return (key: string) => DEFAULT_STRINGS[key] ?? key
}

/**
 * Get the list of all known translation keys.
 * Useful for consumers building custom translation dictionaries.
 */
export function getTranslationKeys(): string[] {
  return Object.keys(DEFAULT_STRINGS)
}
