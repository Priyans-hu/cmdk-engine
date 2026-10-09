import type { CommandItem, Sitemap, SitemapRoute } from '../../core/types'

/** Options for `sitemapToCommands` */
export interface SitemapToCommandsOptions {
  /**
   * Values for the `:name` segments that `cmdk-engine scan --include-dynamic`
   * keeps, inserted as given (not URL-encoded): `{ locale: 'en' }` turns
   * `/:locale/billing` into `/en/billing`, and `''` drops the segment
   * (`/billing`). A route with a segment left unfilled is skipped.
   */
  params?: Record<string, string>
}

/**
 * Turn the sitemap written by `cmdk-engine scan` into commands for
 * `useCommandRegister`: one `{ id, label, keywords, group, href }` per route.
 *
 * Ids are the sitemap's own and keep their `:name` placeholders whatever
 * `params` fills in (`locale--billing` in every locale), so frecency and Recent
 * are shared across locales. Routes with a catch-all (`*`) segment are skipped.
 *
 * @param sitemap - The parsed `command-routes.json`, or its `routes` array
 * @param options - Values for dynamic segments
 * @returns Commands with `href` set to the filled-in path
 */
export function sitemapToCommands(
  sitemap: Sitemap | readonly SitemapRoute[],
  options: SitemapToCommandsOptions = {},
): CommandItem[] {
  const params = options.params ?? {}
  const commands: CommandItem[] = []

  for (const route of 'routes' in sitemap ? sitemap.routes : sitemap) {
    let unfilled = route.path.includes('*')
    const href =
      route.path.replace(/\/:([^/?]+)\??/g, (_, name: string) => {
        const value = params[name]
        if (value === undefined) unfilled = true
        return value ? '/' + value : ''
      }) || '/'

    if (!unfilled) {
      const { id, label, keywords, group } = route
      commands.push({ id, label, keywords, group, href })
    }
  }

  return commands
}
