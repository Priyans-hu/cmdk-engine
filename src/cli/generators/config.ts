import type { SitemapRoute } from '../../core/types'

/**
 * Generate a config snippet with route overrides pre-filled.
 * Useful for bootstrapping a config file from discovered routes.
 */
export function generateConfigSnippet(routes: SitemapRoute[]): string {
  const overrides = routes.map((route) => {
    return `    '${route.path}': { keywords: [${route.keywords.map((k) => `'${k}'`).join(', ')}], group: '${route.group ?? ''}' },`
  })

  return `import { defineConfig } from 'cmdk-engine'

export default defineConfig({
  output: './src/generated/command-routes.json',
  overrides: {
${overrides.join('\n')}
  },
  exclude: ['/404', '/500', '/_*'],
  synonyms: {},
})
`
}
