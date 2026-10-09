import type { MetadataRoute } from 'next'
import { DOCS_ORDER, SITE } from '@/lib/constants'

export const dynamic = 'force-static'

/** Every page, from the same nav list the sidebar uses. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/docs', ...DOCS_ORDER.map((page) => page.href)]
  return paths.map((path) => ({ url: `${SITE.url}${path}` }))
}
