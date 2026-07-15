import { readdirSync, statSync, realpathSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { SitemapRoute } from '../../core/types'
import { pathToLabel, pathToGroup, pathToId } from '../../core/utils'
import { SOURCE_FILE_RE, deduplicateRoutes, isIgnoredDir, toSource } from './shared'

/**
 * Scan a Next.js pages/ directory for routes.
 *
 * Convention: Each .tsx/.jsx/.ts/.js file = route.
 * - pages/index.tsx → /
 * - pages/dashboard.tsx → /dashboard
 * - pages/billing/overview.tsx → /billing/overview
 * - pages/[id].tsx → /:id (dynamic)
 * - pages/_app.tsx, pages/_document.tsx → skipped
 * - pages/api/ → skipped
 */
export function scanNextJsPagesDir(dir: string): SitemapRoute[] {
  const routes: SitemapRoute[] = []
  walkPagesDir(dir, dir, routes)
  return deduplicateRoutes(routes)
}

function walkPagesDir(
  currentDir: string,
  baseDir: string,
  routes: SitemapRoute[],
  visited = new Set<string>(),
): void {
  let entries: string[]
  try {
    const real = realpathSync(currentDir)
    if (visited.has(real)) return
    visited.add(real)
    entries = readdirSync(currentDir)
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = join(currentDir, entry)

    if (isIgnoredDir(entry)) continue
    // Only the top-level pages/api holds Next.js API routes.
    if (entry === 'api' && currentDir === baseDir) continue
    // Skip framework special files (_app, _document, _error).
    if (entry.startsWith('_')) continue

    try {
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        walkPagesDir(fullPath, baseDir, routes, visited)
      } else if (SOURCE_FILE_RE.test(entry)) {
        const relativePath = relative(baseDir, fullPath)
        const routePath = fileToRoutePath(relativePath)

        // Skip dynamic routes
        if (routePath.includes(':') || routePath.includes('*')) continue

        routes.push({
          id: pathToId(routePath || '/'),
          path: routePath || '/',
          label: routePath ? pathToLabel(routePath) : 'Home',
          keywords: generateKeywords(routePath),
          group: routePath ? pathToGroup(routePath) : undefined,
          source: toSource(fullPath),
        })
      }
    } catch {
      // Skip inaccessible files
    }
  }
}

function fileToRoutePath(filePath: string): string {
  // Remove extension
  const withoutExt = filePath.replace(SOURCE_FILE_RE, '')

  const segments = withoutExt.split(sep).filter(Boolean)
  const routeSegments: string[] = []

  segments.forEach((segment, index) => {
    // A trailing "index" file maps to its parent directory.
    if (segment === 'index' && index === segments.length - 1) return

    // Dynamic segments: [id] → :id, [[...slug]] / [...slug] → *slug
    if (segment.startsWith('[') && segment.endsWith(']')) {
      let param = segment.slice(1, -1)
      if (param.startsWith('[') && param.endsWith(']')) param = param.slice(1, -1) // optional catch-all
      if (param.startsWith('...')) {
        routeSegments.push(`*${param.slice(3)}`)
      } else {
        routeSegments.push(`:${param}`)
      }
      return
    }

    routeSegments.push(segment)
  })

  return '/' + routeSegments.join('/')
}

function generateKeywords(path: string): string[] {
  return path
    .split('/')
    .filter(Boolean)
    .filter((seg) => !seg.startsWith(':') && !seg.startsWith('*'))
    .map((seg) => seg.toLowerCase().replace(/[-_]/g, ' '))
}
