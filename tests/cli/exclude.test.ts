import { describe, it, expect } from 'vitest'
import {
  DEFAULT_EXCLUDE,
  matchesExcludePattern,
  type ExcludePattern,
} from '../../src/core/route-defaults'
import { scanRoutes } from '../../src/adapters/react-router/route-scanner'

// The 0.5.1 matcher, frozen: globs kept only the text before the first `*`
function legacyMatches(path: string, pattern: ExcludePattern): boolean {
  if (pattern instanceof RegExp) {
    pattern.lastIndex = 0
    return pattern.test(path)
  }
  if (pattern === '*') return path === '*'
  if (pattern.includes('*')) {
    const prefix = pattern.replace(/\/?\*.*$/, '')
    return path === prefix || path.startsWith(prefix + '/')
  }
  return path === pattern
}

const PATHS = [
  '/',
  '*',
  '/admin',
  '/admin/users',
  '/admin/a/b',
  '/administration',
  '/login',
  '/login/recover',
  '/login-history',
  '/signup',
  '/forgot-password',
  '/verify-email',
  '/oauth/callback',
  '/auth/callback/google',
  '/auth-logs',
  '/callback',
  '/404',
  '/500',
  '/error',
  '/error-budget',
  '/not-found',
  '/_internal',
  '/users',
  '/users/list',
  '/users/42/settings',
  '/users/a/b/settings',
  '/posts/edit',
  '/a/b/edit',
  '/edit',
  '/billing',
  '/billing/overview',
]

describe('exclude globs', () => {
  it.each([
    ['/_*', '/_internal', true],
    ['/_*', '/_internal/logs', true],
    ['/_*', '/users', false],
    ['/users/*/settings', '/users/42/settings', true],
    ['/users/*/settings', '/users/list', false],
    ['/users/*/settings', '/users/a/b/settings', false],
    ['/*/edit', '/posts/edit', true],
    ['/*/edit', '/billing', false],
    ['/*/edit', '/a/b/edit', false],
    ['/**/edit', '/edit', true],
    ['/**/edit', '/a/b/edit', true],
    ['/admin/**', '/admin/a/b', true],
    ['/admin*', '/administration', true],
    ['/a.b*', '/axb', false],
  ])('%s matches %s: %s', (pattern, path, expected) => {
    expect(matchesExcludePattern(path, pattern)).toBe(expected)
  })

  it('keeps the old result for every trailing /* glob, exact string and RegExp', () => {
    for (const pattern of ['/admin/*', '/billing/*', '/*', '/login', /^\/admin(\/|$)/]) {
      for (const path of PATHS) {
        expect(matchesExcludePattern(path, pattern), `${pattern} vs ${path}`).toBe(
          legacyMatches(path, pattern),
        )
      }
    }
  })

  it('gives DEFAULT_EXCLUDE the same results as before', () => {
    for (const path of PATHS) {
      expect(
        DEFAULT_EXCLUDE.some((p) => matchesExcludePattern(path, p)),
        path,
      ).toBe(DEFAULT_EXCLUDE.some((p) => legacyMatches(path, p)))
    }
  })

  it('applies to the runtime scanRoutes too', () => {
    const routes = ['/_internal', '/users/list', '/users/42/settings', '/billing'].map((path) => ({
      path,
    }))

    expect(
      scanRoutes(routes, { exclude: ['/_*', '/users/*/settings'] }).map((c) => c.href),
    ).toEqual(['/users/list', '/billing'])
  })
})
