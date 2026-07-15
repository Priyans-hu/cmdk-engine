/**
 * Schedule a microtask-batched callback. Multiple calls within the same
 * microtask only execute the callback once.
 */
export function createBatchScheduler(): (fn: () => void) => void {
  let scheduled = false

  return (fn: () => void) => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      fn()
    })
  }
}

/**
 * Convert a path segment to a readable label.
 * Handles kebab-case, snake_case, camelCase, PascalCase.
 *
 * Examples:
 *  "user-settings" -> "User Settings"
 *  "phone_numbers" -> "Phone Numbers"
 *  "phoneNumbers"  -> "Phone Numbers"
 *  "BillingOverview" -> "Billing Overview"
 */
export function pathSegmentToLabel(segment: string): string {
  return (
    segment
      // Split acronym boundaries first: "APIKeys" -> "API Keys"
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      // Insert space before uppercase letters in camelCase/PascalCase
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      // Replace hyphens and underscores with spaces
      .replace(/[-_]/g, ' ')
      // Capitalize first letter of each word
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
  )
}

/**
 * Convert a full path to a readable label.
 * Uses the last meaningful (non-dynamic) segment.
 *
 * "/billing/overview" -> "Overview"
 * "/settings" -> "Settings"
 * "/" -> "Home"
 */
export function pathToLabel(path: string): string {
  if (path === '/' || path === '') return 'Home'

  const segments = path.split('/').filter(Boolean)
  // Filter out dynamic segments like :id, [id], etc.
  const meaningful = segments.filter((s) => !s.startsWith(':') && !s.startsWith('['))
  const last = meaningful[meaningful.length - 1]

  return last ? pathSegmentToLabel(last) : 'Home'
}

/**
 * Convert a full path to a group name.
 * Uses the first meaningful segment.
 *
 * "/billing/overview" -> "Billing"
 * "/settings/team" -> "Settings"
 */
export function pathToGroup(path: string): string | undefined {
  // Ignore dynamic segments (:id, [id]) so a route like `/:tenantId/billing`
  // groups under "Billing", not a stray ":Tenant Id".
  const segments = path
    .split('/')
    .filter(Boolean)
    .filter((s) => !s.startsWith(':') && !s.startsWith('['))
  const first = segments[0]

  if (!first || segments.length <= 1) return undefined
  return pathSegmentToLabel(first)
}

/**
 * Generate a stable ID from a route path.
 * "/billing/overview" -> "billing-overview"
 */
export function pathToId(path: string): string {
  return path
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/\//g, '--')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase() || 'home'
}
