/**
 * Default route exclusion patterns shared between the runtime React Router
 * adapter and the CLI scanners.
 *
 * Single source of truth — keeps the adapter and CLI in sync so the README's
 * "smart defaults" claim holds for both.
 */

/** An exclude pattern — exact string, glob with `*`, or RegExp */
export type ExcludePattern = string | RegExp

/**
 * Paths that are almost never useful as commands.
 * Covers auth flows, error pages, OAuth callbacks, and the React Router
 * catch-all `*` segment.
 */
export const DEFAULT_EXCLUDE: ExcludePattern[] = [
  /^\/(login|logout|signin|signout|signup|register)(\/|$)/,
  /^\/(forgot|reset)-password(\/|$)/,
  /^\/verify-email(\/|$)/,
  /^\/(oauth|auth)\/callback(\/|$)/,
  '/callback',
  '/404',
  '/500',
  '/error',
  '/not-found',
  '*',
]

/**
 * Check if a path matches an exclude pattern.
 * Supports exact strings, globs with `*` (e.g. `/admin/*`), and RegExp.
 */
export function matchesExcludePattern(path: string, pattern: ExcludePattern): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(path)
  }
  // Exact match for standalone '*' (React Router catch-all segment)
  if (pattern === '*') {
    return path === '*'
  }
  // Glob: '/admin/*' matches '/admin/anything' and '/admin/deep/nested'
  if (pattern.includes('*')) {
    const prefix = pattern.replace(/\/?\*.*$/, '')
    return path === prefix || path.startsWith(prefix + '/')
  }
  // Exact match
  return path === pattern
}
