import type { CommandContext, ScoredItem } from './types'

/**
 * Create a context engine that boosts commands matching the current app context.
 *
 * Commands with a `scope` field (e.g., ['/billing', '/billing/*']) get a score
 * boost when the current context path matches.
 *
 * @param boostWeight - How much to boost in-scope commands (0-1, default: 0.2)
 */
export function createContextEngine(boostWeight = 0.2) {
  return {
    /**
     * Boost scores for items whose scope matches the current context.
     * Items without a scope are unaffected.
     */
    boost(items: ScoredItem[], context: CommandContext): ScoredItem[] {
      if (!context.path && (!context.tags || context.tags.length === 0)) {
        return items
      }

      return items.map(({ item, score }) => {
        if (!item.scope || item.scope.length === 0) {
          return { item, score }
        }

        const matches = matchesContext(item.scope, context)
        const boostedScore = matches
          ? Math.min(score + boostWeight, 1)
          : score

        return { item, score: boostedScore }
      })
    },
  }
}

/**
 * Check if any scope pattern matches the given context.
 */
function matchesContext(scope: string[], context: CommandContext): boolean {
  if (context.path) {
    for (const pattern of scope) {
      if (matchPath(pattern, context.path)) return true
    }
  }

  if (context.tags && context.tags.length > 0) {
    for (const pattern of scope) {
      if (context.tags.includes(pattern)) return true
    }
  }

  return false
}

/**
 * Match a scope pattern against a path.
 * Supports:
 * - Exact match: '/billing' matches '/billing'
 * - Prefix match: '/billing' matches '/billing/overview'
 * - Glob: '/billing/*' matches '/billing/overview' but not '/billing'
 */
function matchPath(pattern: string, path: string): boolean {
  // Glob pattern
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2)
    return path.startsWith(prefix + '/') && path !== prefix
  }

  // Exact or prefix match. The root pattern '/' is a prefix of every path
  // (avoids the '//' double-slash that would otherwise match nothing).
  const prefix = pattern === '/' ? '' : pattern
  return path === pattern || path.startsWith(prefix + '/')
}
