import type { AsyncSource, CommandItem } from './types'

/** Default debounce window for async sources when not specified by the source */
export const DEFAULT_ASYNC_DEBOUNCE_MS = 200

/**
 * Default trigger predicate: fire `load` whenever the trimmed query is non-empty.
 * Sources can override this to gate themselves on a prefix or other heuristic.
 */
export function defaultTrigger(query: string): boolean {
  return query.trim() !== ''
}

/** Whether an async source should fire for the given query. */
export function shouldRunSource(source: AsyncSource, query: string): boolean {
  const trigger = source.trigger ?? defaultTrigger
  return trigger(query)
}

/**
 * Merge static commands with async items, deduping by `id`.
 * Async items keep priority — if both lists contain the same id, the async
 * version wins (so a remote API can override or refine a stub command).
 */
export function mergeAsyncCommands(
  staticItems: CommandItem[],
  asyncItems: CommandItem[],
): CommandItem[] {
  if (asyncItems.length === 0) return staticItems
  const asyncIds = new Set(asyncItems.map((item) => item.id))
  const filtered = staticItems.filter((item) => !asyncIds.has(item.id))
  return [...filtered, ...asyncItems]
}

/**
 * Flatten a per-source map of async items into a single deduped list.
 * Used by the React hook to fold N parallel sources into a single command set.
 */
export function flattenAsyncItems(itemsBySource: Record<string, CommandItem[]>): CommandItem[] {
  const seen = new Set<string>()
  const merged: CommandItem[] = []
  for (const items of Object.values(itemsBySource)) {
    for (const item of items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      merged.push(item)
    }
  }
  return merged
}
