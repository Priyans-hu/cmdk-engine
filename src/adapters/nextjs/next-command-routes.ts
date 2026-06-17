import { useNextCommandRoutes } from './use-next-command-routes'
import type { NextRoutesInput, UseNextCommandRoutesOptions } from './types'

export interface NextCommandRoutesProps extends UseNextCommandRoutesOptions {
  /** The routes to register — array, Sitemap, or `{ routes: [...] }` */
  routes: NextRoutesInput
}

/**
 * Component wrapper around `useNextCommandRoutes` for consumers
 * who prefer composition over hooks.
 *
 * Renders nothing — purely a side-effect carrier. Mount this
 * inside a `<CommandEngineProvider>`.
 *
 * @example
 * ```tsx
 * <CommandEngineProvider>
 *   <NextCommandRoutes routes={sitemap} prefetchOnMount />
 *   <CommandPalette dialog />
 * </CommandEngineProvider>
 * ```
 */
export function NextCommandRoutes(props: NextCommandRoutesProps): null {
  const { routes, ...options } = props
  useNextCommandRoutes(routes, options)
  return null
}
