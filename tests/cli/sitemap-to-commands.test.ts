import { describe, it, expect } from 'vitest'
import { sitemapToCommands } from '../../src/adapters/sitemap'
import type { Sitemap, SitemapRoute } from '../../src/core/types'

const billing: SitemapRoute = {
  id: 'billing--overview',
  path: '/billing/overview',
  label: 'Overview',
  keywords: ['billing', 'overview'],
  group: 'Billing',
  source: 'app/billing/overview/page.tsx',
}

function sitemapOf(routes: SitemapRoute[]): Sitemap {
  return { version: 1, generatedAt: '2026-10-10T00:00:00.000Z', framework: 'nextjs-app', routes }
}

function route(path: string, id: string): SitemapRoute {
  return { id, path, label: id, keywords: [] }
}

describe('sitemapToCommands', () => {
  it('turns each route into a command whose href is its path', () => {
    expect(sitemapToCommands(sitemapOf([billing]))).toEqual([
      {
        id: 'billing--overview',
        label: 'Overview',
        keywords: ['billing', 'overview'],
        group: 'Billing',
        href: '/billing/overview',
      },
    ])
  })

  it('accepts the routes array as well as the whole sitemap', () => {
    expect(sitemapToCommands([billing])).toEqual(sitemapToCommands(sitemapOf([billing])))
  })

  it('fills :name segments from params and keeps the placeholder id in every locale', () => {
    const routes = [route('/:locale', 'locale'), route('/:locale/billing', 'locale--billing')]

    const en = sitemapToCommands(routes, { params: { locale: 'en' } })
    const de = sitemapToCommands(routes, { params: { locale: 'de' } })

    expect(en.map((c) => c.href)).toEqual(['/en', '/en/billing'])
    expect(de.map((c) => c.href)).toEqual(['/de', '/de/billing'])
    expect(de.map((c) => c.id)).toEqual(['locale', 'locale--billing'])
    expect(en.map((c) => c.id)).toEqual(de.map((c) => c.id))
  })

  it("drops a segment whose param is '' (a default locale without a prefix)", () => {
    const routes = [route('/:locale', 'locale'), route('/:locale/billing', 'locale--billing')]

    expect(sitemapToCommands(routes, { params: { locale: '' } }).map((c) => c.href)).toEqual([
      '/',
      '/billing',
    ])
  })

  it('inserts param values as given, without encoding them', () => {
    const [command] = sitemapToCommands([route('/:org/settings', 'org--settings')], {
      params: { org: 'a b%20' },
    })
    expect(command.href).toBe('/a b%20/settings')
  })

  it('skips routes with an unfilled param or a catch-all segment', () => {
    const routes = [
      route('/users/:id', 'users--id'),
      route('/:org/:project', 'org--project'),
      route('/docs/*', 'docs'),
      route('/settings', 'settings'),
    ]

    expect(sitemapToCommands(routes, { params: { org: 'acme' } }).map((c) => c.href)).toEqual([
      '/settings',
    ])
  })

  it('reads only the own properties of params, not Object.prototype', () => {
    const routes = [route('/:constructor/a', 'constructor--a'), route('/:toString', 'tostring')]

    expect(sitemapToCommands(routes, { params: {} })).toEqual([])
    expect(
      sitemapToCommands(routes, { params: { constructor: 'x', toString: 'y' } }).map((c) => c.href),
    ).toEqual(['/x/a', '/y'])
  })
})
