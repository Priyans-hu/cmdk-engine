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
  toTree,
  tokenize,
  type Node,
  type Token,
} from '../lexer'
import { SOURCE_FILE_RE, isIgnoredDir, deduplicateRoutes, toSource } from './shared'

/**
 * Scan a directory for React Router route definitions.
 *
 * Reads each file statically (nothing is executed) and finds:
 * - route objects with a string `path`, as passed to createBrowserRouter,
 *   with the `label`, `keywords` and `group` of their own `handle.command`
 * - `<Route path="...">` elements, with a `handle={{ command: ... }}` prop
 *
 * Note: relative child paths inside nested `children` arrays are not composed
 * into full paths, so declare such routes with absolute `path` values to have
 * them discovered.
 */
export function scanReactRouterFiles(dir: string): SitemapRoute[] {
  const files = findSourceFiles(dir)
  const routes: SitemapRoute[] = []

  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    routes.push(...extractRoutes(content, file))
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
  command?: CommandMeta
}

/** Extract the routes of one source file. */
function extractRoutes(content: string, filePath: string): SitemapRoute[] {
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
    .filter(({ path }) => path.startsWith('/')) // Relative child paths: see the note above
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
    if (node.open === '{') {
      const props = objectProps(node)
      const path = stringValue(props.get('path'))
      if (path !== undefined) found.push({ path, command: readCommand(props.get('handle')) })
    }
    findObjectRoutes(node.items, found)
  }
}

/** `<Route path="/x">` elements and their `handle={{ command: {...} }}` */
function findJsxRoutes(tokens: Token[], found: FoundRoute[]): void {
  for (const token of tokens) {
    if (token.type !== 'jsx' || token.name !== 'Route') continue
    const { path } = token.attrs
    if (typeof path === 'string') {
      const handle = token.exprs.handle
      found.push({ path, command: handle && readCommand(toTree(handle)) })
    }
  }
}

/** The label, keywords and group of a `handle` value's own `command` object */
function readCommand(handle: Node[] | undefined): CommandMeta | undefined {
  const handleObject = groupValue(handle, '{')
  const command = handleObject && groupValue(objectProps(handleObject).get('command'), '{')
  if (!command) return undefined

  const props = objectProps(command)
  const keywords = groupValue(props.get('keywords'), '[')
  return {
    label: stringValue(props.get('label')),
    group: stringValue(props.get('group')),
    keywords:
      keywords &&
      splitCommas(keywords.items)
        .map((item) => stringValue(item))
        .filter((keyword): keyword is string => keyword !== undefined),
  }
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
