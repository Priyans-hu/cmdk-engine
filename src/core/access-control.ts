import type { AccessCheckMode, AccessControlProvider, CommandItem } from './types'

/**
 * Create an access control filter that removes commands the user
 * doesn't have permission to see.
 *
 * This is a UI filter, not a security boundary. Always enforce
 * permissions server-side.
 *
 * @param provider - The permission checking backend
 * @param mode - 'any' = user needs any listed permission, 'all' = needs all (default: 'any')
 */
export function createAccessFilter(
  provider: AccessControlProvider,
  mode: AccessCheckMode = 'any',
): (items: CommandItem[]) => CommandItem[] {
  return (items: CommandItem[]) => {
    return items.filter((item) => {
      // No permissions required = open to all
      if (!item.permissions || item.permissions.length === 0) {
        return true
      }

      if (mode === 'all') {
        return provider.hasAllPermissions(item.permissions)
      }

      return provider.hasAnyPermission(item.permissions)
    })
  }
}

/**
 * Create a simple access control provider from a set of permissions.
 * Useful for static permission sets.
 */
export function createSimpleAccessProvider(
  userPermissions: string[] | Set<string>,
): AccessControlProvider {
  const perms = userPermissions instanceof Set ? userPermissions : new Set(userPermissions)

  return {
    hasPermission(permission: string): boolean {
      return perms.has(permission)
    },

    hasAnyPermission(permissions: string[]): boolean {
      return permissions.some((p) => perms.has(p))
    },

    hasAllPermissions(permissions: string[]): boolean {
      return permissions.every((p) => perms.has(p))
    },
  }
}
