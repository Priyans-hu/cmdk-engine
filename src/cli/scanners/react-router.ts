import { readdirSync, readFileSync, statSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import type { SitemapRoute } from '../../core/types'
import { pathToLabel, pathToGroup, pathToId } from '../../core/utils'
import {
  groupValue,
  lineAt,
  objectProps,
  splitCommas,
  stringValue,
  stripTypeSuffix,
  toTree,
  tokenize,
  type Group,
  type Node,
  type Token,
} from '../lexer'
import {
  SOURCE_FILE_RE,
  allowsDynamicPath,
  isIgnoredDir,
  deduplicateRoutes,
  toSource,
  type ScanOptions,
} from './shared'

/**
 * Scan a directory for React Router route definitions.
 *
 * Reads each file statically (nothing is executed) and finds:
 * - route objects with a string `path`, as passed to createBrowserRouter,
 *   with the `label`, `keywords` and `group` of their own `handle.command`
 * - `<Route path="...">` elements, with a `handle={{ command: ... }}` prop
 *
 * A relative path is joined to its parent route's full path when it sits in that
 * route's `children` array, or in its `<Route>` element. Without a parent in the
 * same file (routes split across files, descendant `<Routes>`), it is skipped.
 *
 * Like the runtime `scanRoutes`, a route with a `:param` is skipped unless
 * `includeDynamic` names its params or it declares its own `handle.command`.
 * Catch-all routes (`/docs/*`) are always skipped.
 */
export function scanReactRouterFiles(dir: string, options: ScanOptions = {}): SitemapRoute[] {
  const files = findSourceFiles(dir)
  const routes: SitemapRoute[] = []

  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    routes.push(...extractRoutes(content, file, options))
  }

  return deduplicateRoutes(routes)
}

function findSourceFiles(dir: string, files: string[] = [], visited = new Set<string>()): string[] {
  try {
    // Guard against symlink loops by tracking real paths already visited.
    const real = realpathSync(dir)
    if (visited.has(real)) return files
    visited.add(real)

    for (const entry of readdirSync(dir)) {
      if (isIgnoredDir(entry)) continue

      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        findSourceFiles(fullPath, files, visited)
      } else if (SOURCE_FILE_RE.test(entry)) {
        files.push(fullPath)
      }
    }
  } catch {
    // Directory doesn't exist or no permission
  }

  return files
}

/** The parts of a route's own `handle.command` that the sitemap keeps */
interface CommandMeta {
  label?: string
  keywords?: string[]
  group?: string
}

/** A route found in a file, before it becomes a sitemap entry */
interface FoundRoute {
  path: string
  /** Whether it declares a `handle.command`, which keeps it even with a `:param` */
  hasCommand: boolean
  command?: CommandMeta
}

/** Extract the routes of one source file. */
function extractRoutes(content: string, filePath: string, options: ScanOptions): SitemapRoute[] {
  const source = toSource(filePath)
  // JSX only exists in .js/.jsx/.tsx files; in .ts files `<` is a type or an operator
  const { tokens, error } = tokenize(content, { jsx: !/\.[mc]?ts$/.test(filePath) })
  if (error) {
    console.warn(
      `Warning: ${source}:${lineAt(content, error.offset)}: ${error.message}; ` +
        'routes after it were not read.',
    )
  }

  const found: FoundRoute[] = []
  findObjectRoutes(toTree(tokens), found)
  findJsxRoutes(tokens, found)

  return found
    .filter(
      ({ path, hasCommand }) =>
        allowsDynamicPath(path, options.includeDynamic) || (hasCommand && !path.includes('*')),
    )
    .map(({ path, command }) => {
      const route = createRoute(path, source)
      if (command?.label) route.label = command.label
      if (command?.keywords) route.keywords = [...route.keywords, ...command.keywords]
      if (command?.group) route.group = command.group
      return route
    })
}

/** Route objects, `{ path: '/x', handle: { command: {...} } }`, anywhere in the file */
function findObjectRoutes(nodes: Node[], found: FoundRoute[]): void {
  for (const node of nodes) {
    if (node.type !== 'group') continue
    if (node.open === '{' && stringValue(objectProps(node).get('path')) !== undefined) {
      visitRoute(node, null, found)
    } else {
      findObjectRoutes(node.items, found)
    }
  }
}

/** A route object whose parent's full path is `parentPath` (null when unknown) */
function visitRoute(route: Group, parentPath: string | null, found: FoundRoute[]): void {
  const props = objectProps(route)
  const path = stringValue(props.get('path'))
  // A pathless (layout or index) route renders at its parent's URL
  const fullPath = path ? joinPath(parentPath, path) : parentPath
  if (path && fullPath !== null) found.push({ path: fullPath, ...readHandle(props.get('handle')) })

  const children = groupValue(props.get('children'), '[')
  for (const item of route.items) {
    if (item !== children) {
      findObjectRoutes([item], found)
      continue
    }
    for (const child of splitCommas(children.items)) {
      const [object, extra] = stripTypeSuffix(child)
      if (object?.type === 'group' && object.open === '{' && !extra) {
        visitRoute(object, fullPath, found)
      } else {
        findObjectRoutes(child, found)
      }
    }
  }
}

/** `<Route path="/x">` elements and their `handle={{ command: {...} }}` */
function findJsxRoutes(tokens: Token[], found: FoundRoute[]): void {
  // The full path of each open <Route> (null when unknown), for its children
  const open: (string | null)[] = []
  for (const token of tokens) {
    if (token.type === 'jsxEnd' && token.name === 'Route') open.pop()
    if (token.type !== 'jsx' || token.name !== 'Route') continue

    const { path } = token.attrs
    const parentPath = open.length > 0 ? open[open.length - 1] : null
    const fullPath = typeof path === 'string' && path ? joinPath(parentPath, path) : parentPath
    if (typeof path === 'string' && path && fullPath !== null) {
      const handle = token.exprs.handle
      found.push({ path: fullPath, ...readHandle(handle && toTree(handle)) })
    }
    if (!token.selfClosing) open.push(fullPath)
  }
}

/** Join a relative path to its parent's full path, as React Router does; null without a parent */
function joinPath(parentPath: string | null, path: string): string | null {
  if (path.startsWith('/')) return path
  if (parentPath === null) return null
  return (parentPath.endsWith('/') ? parentPath : parentPath + '/') + path
}

/** Whether a `handle` value declares a `command`, and that command's label, keywords and group */
function readHandle(handle: Node[] | undefined): Pick<FoundRoute, 'hasCommand' | 'command'> {
  const handleObject = groupValue(handle, '{')
  const value = handleObject && objectProps(handleObject).get('command')
  const command = groupValue(value, '{')
  if (!command) return { hasCommand: !!value?.length && !isFalsyLiteral(value) }

  const props = objectProps(command)
  const keywords = groupValue(props.get('keywords'), '[')
  return {
    hasCommand: true,
    command: {
      label: stringValue(props.get('label')),
      group: stringValue(props.get('group')),
      keywords:
        keywords &&
        splitCommas(keywords.items)
          .map((item) => stringValue(item))
          .filter((keyword): keyword is string => keyword !== undefined),
    },
  }
}

/** `undefined`, `null`, `false`, `0` or `''`: a `command` that does not opt a route in */
function isFalsyLiteral([node, extra]: Node[]): boolean {
  if (extra) return false
  if (node.type === 'name') return ['undefined', 'null', 'false'].includes(node.value)
  return (node.type === 'number' || node.type === 'string') && !node.value
}

function createRoute(path: string, source: string): SitemapRoute {
  return {
    id: pathToId(path),
    path,
    label: pathToLabel(path),
    keywords: generateKeywords(path),
    group: pathToGroup(path),
    source,
  }
}

function generateKeywords(path: string): string[] {
  // Split path into segments and create keywords from each
  return path
    .split('/')
    .filter(Boolean)
    .filter((seg) => !seg.startsWith(':') && !seg.startsWith('*'))
    .map((seg) => seg.toLowerCase().replace(/[-_]/g, ' '))
}
