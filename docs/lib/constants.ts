import { SIZES } from './sizes'

export interface NavItem {
  label: string
  href: string
  /** One line for the /docs index */
  description?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const DOCS_NAV: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Getting Started',
        href: '/docs/getting-started',
        description: 'Install, register commands, add the palette and the shortcut.',
      },
      {
        label: 'Styling',
        href: '/docs/styling',
        description: 'Starter CSS and Tailwind, class name props and the attributes you can target.',
      },
    ],
  },
  {
    title: 'Guides',
    items: [
      {
        label: 'Search',
        href: '/docs/search',
        description: 'How results are found and ranked, synonyms, match-sorter and custom engines.',
      },
      {
        label: 'Nesting and groups',
        href: '/docs/nested-commands',
        description: 'Sub-menus with breadcrumbs, and headings for long command lists.',
      },
    ],
  },
  {
    title: 'Reference',
    items: [
      {
        label: 'API Reference',
        href: '/docs/api',
        description: 'Every export, option and hook.',
      },
      {
        label: 'Adapters',
        href: '/docs/adapters',
        description: 'The cmdk, Base UI and React Router adapters, with props and differences.',
      },
      {
        label: 'Examples',
        href: '/docs/examples',
        description: 'React Router, RBAC, a custom UI and a pre-commit hook.',
      },
    ],
  },
]

/** Every docs page in reading order. The sidebar, previous/next links and the /docs index follow DOCS_NAV. */
export const DOCS_ORDER: NavItem[] = DOCS_NAV.flatMap((section) => section.items)

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
    title: `${SIZES.core} Core`,
    description: `Tree-shakeable, zero runtime dependencies. Core engine is ${SIZES.core} minified + brotli; the Quick Start stack (provider, register hook, cmdk adapter and shortcut) is ${SIZES.quickStartStack}.`,
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
  { feature: 'Deterministic sorting', cmdk: 'Open upstream issues (#264, #375)', cmdkEngine: true },
  { feature: 'First item auto-select', cmdk: 'Open upstream issue (#280)', cmdkEngine: true },
  { feature: 'Dynamic content updates', cmdk: 'Open upstream issue (#267)', cmdkEngine: true },
  { feature: 'CLI tooling', cmdk: false, cmdkEngine: true },
  { feature: 'Framework-agnostic core', cmdk: false, cmdkEngine: true },
]

export const SITE = {
  name: 'cmdk-engine',
  url: 'https://priyans-hu.github.io/cmdk-engine',
  description: 'Permission-aware command palette engine for React. Works with cmdk or Base UI.',
  github: 'https://github.com/Priyans-hu/cmdk-engine',
  npm: 'https://www.npmjs.com/package/cmdk-engine',
}
