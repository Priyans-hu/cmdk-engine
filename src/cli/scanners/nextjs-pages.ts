import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { SitemapRoute } from '../../core/types'
import { pathToLabel, pathToGroup, pathToId } from '../../core/utils'

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
  return routes
}

function walkPagesDir(currentDir: string, baseDir: string, routes: SitemapRoute[]): void {
  let entries: string[]
  try {
    entries = readdirSync(currentDir)
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = join(currentDir, entry)

    // Skip hidden, _app, _document, _error, api
    if (entry.startsWith('.') || entry === 'node_modules') continue
    if (entry === 'api' || entry === '_app.tsx' || entry === '_app.ts') continue
    if (entry === '_document.tsx' || entry === '_document.ts') continue
    if (entry === '_error.tsx' || entry === '_error.ts') continue
    if (entry.startsWith('_app.') || entry.startsWith('_document.') || entry.startsWith('_error.')) continue

    try {
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        walkPagesDir(fullPath, baseDir, routes)
      } else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.startsWith('_')) {
        const relativePath = relative(baseDir, fullPath)
        const routePath = fileToRoutePath(relativePath)

        // Skip dynamic routes
        if (routePath.includes(':') || routePath.includes('*')) continue

        const source = relative(process.cwd(), fullPath)

        routes.push({
          id: pathToId(routePath || '/'),
          path: routePath || '/',
          label: routePath ? pathToLabel(routePath) : 'Home',
          keywords: generateKeywords(routePath),
          group: routePath ? pathToGroup(routePath) : undefined,
          source,
        })
      }
    } catch {
      // Skip inaccessible files
    }
  }
}

function fileToRoutePath(filePath: string): string {
  // Remove extension
  const withoutExt = filePath.replace(/\.(tsx?|jsx?)$/, '')

  const segments = withoutExt.split(sep).filter(Boolean)
  const routeSegments: string[] = []

  for (const segment of segments) {
    // index files map to the parent directory
    if (segment === 'index') continue

    // Dynamic segments: [id] → :id
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const param = segment.slice(1, -1)
      if (param.startsWith('...')) {
        routeSegments.push(`*${param.slice(3)}`)
      } else {
        routeSegments.push(`:${param}`)
      }
      continue
    }

    routeSegments.push(segment)
  }

  return '/' + routeSegments.join('/')
}

function generateKeywords(path: string): string[] {
  return path
    .split('/')
    .filter(Boolean)
    .filter((seg) => !seg.startsWith(':') && !seg.startsWith('*'))
    .map((seg) => seg.toLowerCase().replace(/[-_]/g, ' '))
}
