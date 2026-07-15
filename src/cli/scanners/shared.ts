import { relative, sep } from 'node:path'
import type { SitemapRoute } from '../../core/types'

/** Directories never worth scanning for routes (large/generated). */
export const SCAN_IGNORE = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.turbo',
  '.vercel',
  '.git',
])

/** Source-file extensions we scan: js/ts + jsx/tsx and their m/c variants. */
export const SOURCE_FILE_RE = /\.(?:[mc]?[jt]s|[jt]sx)$/

/** True for a directory entry we should skip while walking. */
export function isIgnoredDir(entry: string): boolean {
  return entry.startsWith('.') || SCAN_IGNORE.has(entry)
}

/** Deduplicate routes by path, keeping the first occurrence. */
export function deduplicateRoutes(routes: SitemapRoute[]): SitemapRoute[] {
  const seen = new Map<string, SitemapRoute>()
  for (const route of routes) {
    if (!seen.has(route.path)) seen.set(route.path, route)
  }
  return Array.from(seen.values())
}

/**
 * Compute a portable `source` path: relative to the current working directory
 * and always forward-slashed, so generated output is identical across OSes and
 * across the different framework scanners.
 */
export function toSource(fullPath: string): string {
  return relative(process.cwd(), fullPath).split(sep).join('/')
}

/**
 * Strip `//` line comments and `/* *​/` block comments so commented-out route
 * definitions aren't scanned. Protocol-style `://` (URLs) is preserved by only
 * stripping `//` that isn't immediately preceded by a colon.
 */
export function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}
