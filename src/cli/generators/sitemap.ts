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
    // Non-mutating, locale-independent (ordinal) sort so generated output is
    // byte-identical across machines/CI regardless of the system locale.
    routes: [...routes].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  }
}
