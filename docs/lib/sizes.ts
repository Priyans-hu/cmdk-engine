/**
 * Bundle size figures shown across the docs site, kept in one place.
 *
 * Minified + brotli, measured with size-limit. Each entry's figure is its own
 * code, without the sibling entries and peers it imports.
 */
export const SIZES = {
  core: '3.7 kB',
  react: '4.4 kB',
  cmdkAdapter: '1.8 kB',
  reactRouterAdapter: '1.1 kB',
  baseUiAdapter: '1.8 kB',
  sitemapAdapter: '0.23 kB',
  matchSorter: '0.55 kB',
  /** Provider, register hook, cmdk adapter and shortcut, without react, react-dom and cmdk */
  quickStartStack: '8.3 kB',
  /** Base UI Autocomplete alone, with Dialog, and cmdk with its Radix dialog */
  baseUiAutocomplete: '44 kB',
  baseUiWithDialog: '48 kB',
  cmdkWithRadixDialog: '14 kB',
  /** The claim made for createFuzzySearch() */
  fuzzySearch: '1 kB',
} as const

/** The one-sentence stack size used in the page descriptions and the hero */
export const STACK_SENTENCE = `The Quick Start stack (provider, register hook, cmdk adapter and shortcut) is about ${SIZES.quickStartStack} min + brotli on top of React and cmdk.`
