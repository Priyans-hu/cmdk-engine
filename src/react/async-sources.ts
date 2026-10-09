import { createContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AsyncSource, CommandItem } from '../core/types'

const DEFAULT_DEBOUNCE_MS = 200
/** Default per-source cap for unfiltered (`shouldFilter: false`) items */
const DEFAULT_MAX_RESULTS = 10
/** The only `href` protocols kept on async items (relative URLs resolve to `http:`) */
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * Own property set on every async item (and its children) to its source id.
 * A symbol, so it never shows in `meta` and a registered command cannot
 * collide with it; `Symbol.for` keeps one identity if this code loads twice.
 * Object spread copies it, so it survives the pipeline's item copies.
 */
export const ASYNC_SOURCE: unique symbol = Symbol.for('cmdk-engine.asyncSource')

type AsyncItem = CommandItem & { [ASYNC_SOURCE]?: string }

/** What one source loaded for the current request */
export interface LoadedSource {
  items: CommandItem[]
  /** `shouldFilter` when the load started */
  filter: boolean
  /** `maxResults` when the load started (applies when `filter` is false) */
  max: number
}

/** Root commands merged with the loaded async items */
export interface AsyncItems {
  /** Registered root commands plus client-filtered async items */
  commands: CommandItem[]
  /** Unfiltered (`shouldFilter: false`) items, per source in source order */
  unfiltered: { items: CommandItem[]; max: number }[]
}

/** Async source state, shared by every `useCommandPalette()` under one provider */
export interface AsyncSourcesValue {
  /** Sources that settled for the current request, in `asyncSources` order (holes = pending) */
  loaded: (LoadedSource | undefined)[]
  /** Whether a source whose trigger passed for the current request has not settled */
  isLoading: boolean
  /** Last error per source id; an entry clears on that source's next success */
  errors: Record<string, Error>
}

interface State {
  /** Token of the effect run that owns `loaded`/`settled` (sequence guard) */
  run: object | null
  key: string | null
  loaded: (LoadedSource | undefined)[]
  settled: number
  errors: Record<string, Error>
}

const NONE: (LoadedSource | undefined)[] = []
const NO_UNFILTERED: AsyncItems['unfiltered'] = []
// Frozen: consumers receive it as `asyncErrors`, and it is shared by every provider.
const NO_ERRORS: Record<string, Error> = Object.freeze({})
const IDLE: State = { run: null, key: null, loaded: NONE, settled: 0, errors: NO_ERRORS }

export const AsyncSourcesContext = createContext<AsyncSourcesValue>({
  loaded: NONE,
  isLoading: false,
  errors: NO_ERRORS,
})

/**
 * Runs `config.asyncSources` inside the provider, so every consumer shares one
 * load per source per request. A request is the query plus the source ids, at
 * the root level only. `load`, `trigger` and `debounceMs` are read through a
 * ref: a fresh inline config with the same ids restarts nothing.
 */
export function useAsyncSources(
  sources: AsyncSource[] | undefined,
  search: string,
  atRoot: boolean,
  isOpen: boolean,
): AsyncSourcesValue {
  const sourcesRef = useRef(sources)
  // Declared before the loader effect so it runs first in the same commit.
  useEffect(() => {
    sourcesRef.current = sources
  })

  // Closing a palette that was open pauses loading at the current query, until
  // it reopens or the query changes. A palette that never opened (an inline
  // one) keeps loading.
  const [pause, setPause] = useState<{ isOpen: boolean; query: string | null }>({
    isOpen,
    query: null,
  })
  if (pause.isOpen !== isOpen || (pause.query !== null && pause.query !== search)) {
    setPause({ isOpen, query: pause.isOpen && !isOpen ? search : null })
  }

  const ids = sources ? sources.map((source) => source.id) : []
  const key =
    ids.length > 0 && atRoot && pause.query === null ? JSON.stringify([ids, search]) : null

  // Triggers run once per request, not on every render.
  const due = useMemo(() => {
    const indexes: number[] = []
    const errors: Record<string, Error> = {}
    if (key !== null) {
      sources!.forEach((source, i) => {
        try {
          if ((source.trigger ?? hasQuery)(search)) indexes.push(i)
        } catch (error) {
          errors[source.id] = toError(error)
        }
      })
    }
    return { indexes, errors }
  }, [key])

  const [state, setState] = useState<State>(IDLE)

  useEffect(() => {
    const run = {}
    let live = true
    const timers: ReturnType<typeof setTimeout>[] = []
    const controllers: AbortController[] = []

    // A new request drops the previous one's items; errors stay until a success.
    setState((prev) => {
      const errors = keepErrors(prev.errors, ids, due.errors)
      return key === null && prev.key === null && errors === prev.errors
        ? prev
        : { run, key, loaded: NONE, settled: 0, errors }
    })

    const finish = (i: number, id: string, loaded?: LoadedSource, error?: Error) => {
      if (live) setState((prev) => (prev.run === run ? settle(prev, i, id, loaded, error) : prev))
    }

    for (const i of due.indexes) {
      const { id, debounceMs = DEFAULT_DEBOUNCE_MS } = sourcesRef.current![i]
      timers.push(
        setTimeout(() => {
          const source = sourcesRef.current![i]
          const controller = new AbortController()
          controllers.push(controller)
          // The executor turns a synchronous throw from load() into a rejection.
          new Promise<Iterable<CommandItem>>((resolve) =>
            resolve(source.load(search, { signal: controller.signal })),
          )
            .then((items) => ({
              items: toAsyncItems(items, id, source.group),
              filter: source.shouldFilter !== false,
              max: source.maxResults ?? DEFAULT_MAX_RESULTS,
            }))
            .then(
              (loaded) => finish(i, id, loaded),
              (reason) =>
                finish(i, id, undefined, isAbortError(reason) ? undefined : toError(reason)),
            )
        }, debounceMs),
      )
    }

    return () => {
      live = false
      timers.forEach(clearTimeout)
      controllers.forEach((controller) => controller.abort())
    }
  }, [key])

  const current = key !== null && state.key === key
  const loaded = current ? state.loaded : NONE
  const isLoading = due.indexes.length > (current ? state.settled : 0)
  return useMemo(
    () => ({ loaded, isLoading, errors: state.errors }),
    [loaded, isLoading, state.errors],
  )
}

/**
 * Merge the loaded async items into the root commands, deduped by id:
 * registered commands win, then earlier sources. Client-filtered items join
 * `commands` (the same array when none were added); unfiltered ones are kept
 * per source for their own pipeline.
 */
export function mergeAsyncItems(
  commands: CommandItem[],
  loaded: (LoadedSource | undefined)[],
): AsyncItems {
  if (loaded.length === 0) return { commands, unfiltered: NO_UNFILTERED }
  const seen = new Set(commands.map((command) => command.id))
  const merged = commands.slice()
  const unfiltered: AsyncItems['unfiltered'] = []
  for (const source of loaded) {
    if (!source) continue
    const fresh = source.items.filter((item) => !seen.has(item.id) && seen.add(item.id))
    if (!source.filter) unfiltered.push({ items: fresh, max: source.max })
    else for (const item of fresh) merged.push(item)
  }
  return {
    commands: merged.length === commands.length ? commands : merged,
    unfiltered: unfiltered.length ? unfiltered : NO_UNFILTERED,
  }
}

function hasQuery(query: string): boolean {
  return query.trim() !== ''
}

function settle(prev: State, i: number, id: string, result?: LoadedSource, error?: Error): State {
  let { loaded, errors } = prev
  if (result) {
    loaded = loaded.slice()
    loaded[i] = result
    if (id in errors) {
      errors = { ...errors }
      delete errors[id]
    }
  } else if (error) {
    errors = { ...errors, [id]: error }
  }
  return { ...prev, loaded, settled: prev.settled + 1, errors }
}

/** Errors of sources still configured, plus `extra`; the same object when unchanged. */
function keepErrors(
  errors: Record<string, Error>,
  ids: string[],
  extra: Record<string, Error>,
): Record<string, Error> {
  const next: Record<string, Error> = {}
  let changed = false
  for (const id in errors) {
    if (ids.includes(id)) next[id] = errors[id]
    else changed = true
  }
  for (const id in extra) {
    next[id] = extra[id]
    changed = true
  }
  return changed ? next : errors
}

/** Copies tagged with their source id, so the hook can tell them from registered commands. */
function toAsyncItems(
  items: Iterable<CommandItem>,
  sourceId: string,
  group: string | undefined,
): CommandItem[] {
  const out: CommandItem[] = []
  for (const item of items) {
    const copy = toAsyncItem(item, sourceId)
    if (group !== undefined) copy.group = group
    out.push(copy)
  }
  return out
}

function toAsyncItem(item: CommandItem, sourceId: string): CommandItem {
  const copy: AsyncItem = { ...item, [ASYNC_SOURCE]: sourceId }
  // Remote hrefs reach window.location and custom renderItem anchors, so the
  // check happens here, once, for every consumer: anything else is stripped.
  if ('href' in copy && !isSafeHref(copy.href)) delete copy.href
  if (item.children) copy.children = item.children.map((child) => toAsyncItem(child, sourceId))
  return copy
}

/** Allowlist: relative, http(s), mailto and tel. Unparsable input is rejected. */
function isSafeHref(href: unknown): boolean {
  if (typeof href !== 'string') return false
  try {
    // The URL parser strips the whitespace and control characters that
    // obfuscate a scheme, and lowercases it.
    return SAFE_PROTOCOLS.includes(new URL(href, 'http://x').protocol)
  } catch {
    return false
  }
}

function isAbortError(reason: unknown): boolean {
  return (reason as { name?: unknown } | null)?.name === 'AbortError'
}

/** Normalize a thrown value; a non-Error keeps the original value as `cause`. */
function toError(reason: unknown): Error {
  if (reason instanceof Error) return reason
  const message = typeof reason === 'string' ? reason : 'Async source failed'
  return Object.assign(new Error(message), { cause: reason })
}
