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
        label: 'Next.js',
        href: '/docs/nextjs',
        description: 'Use the palette in the App Router: a client file, router.push and [locale] routes.',
      },
      {
        label: 'shadcn/ui',
        href: '/docs/shadcn',
        description: 'Add the palette to a shadcn project as a registry item, for cmdk or Base UI.',
      },
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
      {
        label: 'CLI',
        href: '/docs/cli',
        description: 'Scan your route files into a sitemap, from the command line or CI.',
      },
    ],
  },
  {
    title: 'Reference',
    items: [
      {
        label: 'API Reference',
        href: '/docs/api',
        description: 'The provider, every option, the command object and the hooks.',
      },
      {
        label: 'Core API',
        href: '/docs/core',
        description: 'The framework-agnostic building blocks: registry, frecency, groups and more.',
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
    description: 'Auto-scan React Router and Next.js routes. The CLI writes a sitemap, and sitemapToCommands turns it into commands.',
  },
  {
    icon: '⚡',
    title: 'Fuzzy Search',
    description: 'Built-in lightweight fuzzy search: exact > prefix > substring > word initials > fuzzy. Words match in any order, and accents are ignored.',
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
    description: 'Bidirectional synonym engine. "money" finds "billing", and a synonym match never outranks a direct match.',
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
  { feature: 'UI-agnostic core', cmdk: false, cmdkEngine: true },
]

export const SITE = {
  name: 'cmdk-engine',
  url: 'https://priyans-hu.github.io/cmdk-engine',
  description: 'Permission-aware command palette engine for React. Works with cmdk or Base UI.',
  github: 'https://github.com/Priyans-hu/cmdk-engine',
  npm: 'https://www.npmjs.com/package/cmdk-engine',
}
