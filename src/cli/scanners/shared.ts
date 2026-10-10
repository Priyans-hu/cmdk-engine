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

/** The `includeDynamic` scan option: `true` for every `:name`, or the names to keep. */
export type IncludeDynamic = boolean | readonly string[]

/** Options every scanner accepts. */
export interface ScanOptions {
  includeDynamic?: IncludeDynamic
}

/**
 * Whether a route path may go into the sitemap. A path with a catch-all (`*`)
 * segment never does: no single URL stands for it. A path with `:name` segments
 * does when `includeDynamic` is `true` or lists every one of its names.
 */
export function allowsDynamicPath(path: string, includeDynamic: IncludeDynamic = false): boolean {
  if (path.includes('*')) return false
  const names = (path.match(/:[^/?]+/g) ?? []).map((segment) => segment.slice(1))
  return (
    names.length === 0 ||
    includeDynamic === true ||
    (typeof includeDynamic === 'object' && names.every((name) => includeDynamic.includes(name)))
  )
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
