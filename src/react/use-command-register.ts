import { useEffect, useRef } from 'react'
import type { CommandItem } from '../core/types'
import { isCommandVisible } from '../core/access-control'
import { useEngineContext } from './context'

/**
 * Register commands from within a component.
 * Commands are automatically unregistered when the component unmounts.
 *
 * By default (no `deps`), the hook re-registers whenever a registered field
 * changes: ids, labels, descriptions, `href`, `group`, `priority`, `disabled`,
 * `hidden`, `keywords`, `permissions`, `accessMode`, `shortcut`, `scope`, text
 * icons, children, or the result of `when` (evaluated on each render). Element
 * icons and `meta` are not compared: pass `deps` when they change. Command
 * `action` callbacks always invoke the latest closure, so an `action` that
 * closes over props/state never goes stale. Pass an explicit `deps` array to
 * take manual control of when re-registration happens.
 *
 * @param commands - Commands to register
 * @param deps - Optional dependency array (re-registers when it changes)
 *
 * @example
 * ```tsx
 * function BillingPage({ orgId }: { orgId: string }) {
 *   useCommandRegister([
 *     { id: 'buy-credits', label: 'Buy Credits', action: () => openModal(orgId) },
 *   ])
 *   return <div>...</div>
 * }
 * ```
 */
export function useCommandRegister(commands: CommandItem[], deps?: unknown[]): void {
  const { registry } = useEngineContext('useCommandRegister')

  // Always hold the latest commands so wrapped actions call fresh closures.
  const commandsRef = useRef(commands)
  commandsRef.current = commands

  // When the caller doesn't manage deps, re-register on shape changes. The
  // signature omits functions/icons so a new closure each render alone doesn't
  // churn the registry (the ref keeps those fresh anyway).
  const effectDeps = deps ?? [signatureOf(commands)]

  // effectDeps is either the caller's array or [shapeSignature]; re-running on
  // its change is intentional (the ref keeps action closures fresh regardless).
  useEffect(() => {
    const wrapped = commandsRef.current.map((c) => wrapCommand(c, commandsRef))
    return registry.registerMany(wrapped)
  }, effectDeps)
}

/**
 * Wrap a command so its `action` delegates to the latest version of the command
 * (looked up by id in the live ref, read at call time) rather than the closure
 * captured at registration time.
 */
function wrapCommand(command: CommandItem, latestRef: { current: CommandItem[] }): CommandItem {
  const wrapped: CommandItem = { ...command }
  if (command.action) {
    wrapped.action = (item) => findById(latestRef.current, command.id)?.action?.(item)
  }
  if (command.children) {
    wrapped.children = command.children.map((child) => wrapCommand(child, latestRef))
  }
  return wrapped
}

function findById(commands: CommandItem[], id: string): CommandItem | undefined {
  for (const command of commands) {
    if (command.id === id) return command
    if (command.children) {
      const found = findById(command.children, id)
      if (found) return found
    }
  }
  return undefined
}

/** A stable signature of the registration-relevant fields (no functions, element icons or meta). */
function signatureOf(commands: CommandItem[]): string {
  const pick = (c: CommandItem): unknown => ({
    id: c.id,
    label: c.label,
    description: c.description,
    href: c.href,
    group: c.group,
    priority: c.priority,
    disabled: c.disabled,
    hidden: c.hidden,
    keywords: c.keywords,
    permissions: c.permissions,
    accessMode: c.accessMode,
    shortcut: c.shortcut,
    scope: c.scope,
    // Resolved, so a flipped boolean or a closure over new props re-registers.
    when: isCommandVisible(c),
    icon: typeof c.icon === 'object' ? 0 : c.icon,
    hasAction: !!c.action,
    children: c.children?.map(pick),
  })
  return JSON.stringify(commands.map(pick))
}
