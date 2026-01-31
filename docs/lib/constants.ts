export interface NavSection {
  title: string
  items: { label: string; href: string }[]
}

export const DOCS_NAV: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Getting Started', href: '/docs/getting-started' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { label: 'API Reference', href: '/docs/api' },
      { label: 'Examples', href: '/docs/examples' },
    ],
  },
]

export const DOCS_ORDER = [
  { label: 'Getting Started', href: '/docs/getting-started' },
  { label: 'API Reference', href: '/docs/api' },
  { label: 'Examples', href: '/docs/examples' },
]

export const FEATURES = [
  {
    icon: '🔍',
    title: 'Route Discovery',
    description: 'Auto-scan React Router, Next.js App Router, and Pages Router. CLI generates your command sitemap.',
  },
  {
    icon: '⚡',
    title: 'Fuzzy Search',
    description: 'Built-in lightweight fuzzy search with scoring: exact > prefix > substring > word-boundary > fuzzy.',
  },
  {
    icon: '🔐',
    title: 'RBAC Filtering',
    description: 'Filter commands by user permissions. Supports any/all modes with a pluggable access provider.',
  },
  {
    icon: '📈',
    title: 'Frecency Ranking',
    description: 'Frequently and recently used commands float to the top. Exponential decay algorithm, zero config.',
  },
  {
    icon: '🔤',
    title: 'Keyword Synonyms',
    description: 'Bidirectional synonym engine. "money" finds "billing". User aliases supported.',
  },
  {
    icon: '📦',
    title: '< 5 KB Core',
    description: 'Tree-shakeable, zero runtime dependencies. Core engine is under 5 KB minified + brotli.',
  },
]

export interface ComparisonRow {
  feature: string
  cmdk: string | boolean
  cmdkEngine: string | boolean
}

export const COMPARISON: ComparisonRow[] = [
  { feature: 'Composable UI', cmdk: true, cmdkEngine: true },
  { feature: 'Route auto-discovery', cmdk: false, cmdkEngine: true },
  { feature: 'RBAC / permissions', cmdk: false, cmdkEngine: true },
  { feature: 'Frecency ranking', cmdk: false, cmdkEngine: true },
  { feature: 'Keyword synonyms', cmdk: false, cmdkEngine: true },
  { feature: 'Deterministic sorting', cmdk: 'Broken (#264, #375)', cmdkEngine: true },
  { feature: 'First item auto-select', cmdk: 'Broken (#280)', cmdkEngine: true },
  { feature: 'Dynamic content updates', cmdk: 'Broken (#267)', cmdkEngine: true },
  { feature: 'CLI tooling', cmdk: false, cmdkEngine: true },
  { feature: 'Framework-agnostic core', cmdk: false, cmdkEngine: true },
]

export const SITE = {
  name: 'cmdk-engine',
  description: 'The smart command palette engine for React',
  github: 'https://github.com/Priyans-hu/cmdk-engine',
  npm: 'https://www.npmjs.com/package/cmdk-engine',
}
