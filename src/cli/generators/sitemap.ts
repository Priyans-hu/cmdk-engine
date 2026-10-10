import type { Sitemap, SitemapRoute } from '../../core/types'

/**
 * Generate a sitemap object from discovered routes.
 */
export function generateSitemap(
  routes: SitemapRoute[],
  framework: string,
  generatedAt: string = new Date().toISOString(),
): Sitemap {
  return {
    version: 1,
    generatedAt,
    framework,
    routes: sortRoutes(routes),
  }
}

/**
 * Sort routes by path. Non-mutating and locale-independent (ordinal), so generated
 * output is byte-identical across machines/CI regardless of the system locale.
 */
export function sortRoutes(routes: SitemapRoute[]): SitemapRoute[] {
  return [...routes].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}
