/**
 * Next.js adapter for cmdk-engine.
 *
 * Phase 2: Will provide:
 * - App Router route scanning (app/ directory convention)
 * - Pages Router route scanning (pages/ directory convention)
 * - useRouter integration for navigation
 * - Server component support for static route extraction
 *
 * For now, use the core engine + React hooks directly with Next.js.
 * Route scanning is available via the CLI: `npx cmdk-engine scan`
 */

export function createNextJsAdapter() {
  throw new Error(
    'Next.js adapter is not yet implemented. Use the CLI scanner (`npx cmdk-engine scan`) ' +
      'or manually register routes via the core registry.',
  )
}
