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
 * Check if a path matches an exclude pattern: an exact string, a glob or a RegExp.
 *
 * In a glob, `*` matches within one path segment and `**` across segments, so a
 * `*` between two slashes stands for exactly one segment. A match also covers
 * every path below it, and a trailing `/*` also matches the base path:
 * `/admin/*` matches `/admin` and `/admin/a/b`, and `/_*` matches `/_internal`.
 */
export function matchesExcludePattern(path: string, pattern: ExcludePattern): boolean {
  if (pattern instanceof RegExp) {
    // Reset lastIndex so a consumer-supplied /g or /y regex can't carry state
    // across calls and produce intermittent false negatives.
    pattern.lastIndex = 0
    return pattern.test(path)
  }
  // Exact match for standalone '*' (React Router catch-all segment)
  if (pattern === '*') {
    return path === '*'
  }
  if (pattern.includes('*')) {
    return globToRegExp(pattern).test(path)
  }
  // Exact match
  return path === pattern
}

function globToRegExp(glob: string): RegExp {
  const source = glob
    // A trailing '/*' or '/**' also matches the base path
    .replace(/\/\*\*?$/, '')
    // Odd parts are the wildcards: '/**/' (any depth, none included), '**', '*'
    .split(/(\/\*\*(?=\/)|\*\*|\*)/)
    .map((part, k) =>
      k % 2 === 0
        ? part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        : part === '*'
          ? '[^/]*'
          : part === '**'
            ? '.*'
            : '(?:/.*)?',
    )
    .join('')
  // A match also covers every path below it
  return new RegExp(`^${source}(?:/.*)?$`)
}
