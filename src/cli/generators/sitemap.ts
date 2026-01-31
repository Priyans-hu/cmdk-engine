import type { Sitemap, SitemapRoute } from '../../core/types'

/**
 * Generate a sitemap object from discovered routes.
 */
export function generateSitemap(routes: SitemapRoute[], framework: string): Sitemap {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    framework,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
  }
}
