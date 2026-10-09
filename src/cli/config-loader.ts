import { existsSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import type { CmdkEngineConfig } from '../core/types'
import { isName, lineAt, splitCommas, stripTypeSuffix, toTree, tokenize, type Node } from './lexer'

/**
 * Load a cmdk-engine config file.
 *
 * Supports:
 * - .ts/.mts/.cts files, read statically without running them (see `readTypeScriptConfig`)
 * - .json files
 * - .js/.mjs/.cjs files (via dynamic import)
 */
export async function loadConfig(configPath: string): Promise<CmdkEngineConfig> {
  const fullPath = resolve(configPath)

  if (!existsSync(fullPath)) {
    // No config file is fine — return defaults
    return {}
  }

  if (fullPath.endsWith('.json')) {
    const content = stripBom(readFileSync(fullPath, 'utf-8'))
    return JSON.parse(content) as CmdkEngineConfig
  }

  if (fullPath.endsWith('.js') || fullPath.endsWith('.mjs') || fullPath.endsWith('.cjs')) {
    const mod = await import(fullPath)
    return (mod.default ?? mod) as CmdkEngineConfig
  }

  if (fullPath.endsWith('.ts') || fullPath.endsWith('.mts') || fullPath.endsWith('.cts')) {
    return readTypeScriptConfig(fullPath)
  }

  throw new Error(`Unsupported config format: ${fullPath}`)
}

/** Strip a leading UTF-8 BOM (common in Windows-authored files). */
function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

/**
 * Read a TS config statically, without a TS compiler and without running it.
 * The `export default` (or `module.exports =`) value, optionally wrapped in
 * `defineConfig(...)` and followed by `as const` or `satisfies T`, may use
 * strings, numbers, booleans, null, arrays, objects, RegExp literals, templates
 * without `${}` and top-level `const`s, spreads included. Anything that needs
 * running, such as `process.env` or a function call, throws with its line: such
 * configs belong in cmdk-engine.config.mjs.
 */
function readTypeScriptConfig(filePath: string): CmdkEngineConfig {
  const source = stripBom(readFileSync(filePath, 'utf-8'))
  const file = relative(process.cwd(), filePath) || filePath
  const { tokens, error } = tokenize(source)
  if (error) throw new Error(`${file}:${lineAt(source, error.offset)}: ${error.message}`)

  const root = toTree(tokens)

  // Whether a top-level node starts a new statement: a `;` or a statement keyword
  // at the start of a line (ASI), not one inside a type such as `import('x').T`
  const startsStatement = (node: Node, k: number): boolean => {
    if (isPunct(node, ';')) return true
    const keyword =
      node.type === 'name' &&
      (STATEMENT_KEYWORDS.has(node.value) || (node.value === 'module' && isPunct(root[k + 1], '.')))
    return (
      keyword && /^\s*$/.test(source.slice(source.lastIndexOf('\n', node.start) + 1, node.start))
    )
  }
  // The nodes of the statement that starts at `start`
  const statementAt = (start: number): Node[] => {
    const end = root.findIndex((node, k) => k > start && startsStatement(node, k))
    return root.slice(start, end === -1 ? undefined : end)
  }

  // Top-level `const|let|var name = value` declarations, and the exported value
  const declarations = new Map<string, Node[]>()
  let exported: Node[] | undefined

  for (let k = 0; k < root.length; k++) {
    const node = root[k]
    const next = root[k + 1]
    if (
      (isName(node, 'const') || isName(node, 'let') || isName(node, 'var')) &&
      next?.type === 'name'
    ) {
      const statement = statementAt(k)
      const assign = statement.findIndex((n) => isPunct(n, '='))
      if (assign !== -1) declarations.set(next.value, statement.slice(assign + 1))
    } else if (isName(node, 'export') && isName(next, 'default')) {
      exported = statementAt(k).slice(2)
    } else if (isName(node, 'module') && isPunct(next, '.') && isName(root[k + 2], 'exports')) {
      if (isPunct(root[k + 3], '=')) exported = statementAt(k).slice(4)
    }
  }

  if (!exported) {
    throw new Error(
      `${file}: no \`export default\` found. Use export default defineConfig({ ... }).`,
    )
  }

  function fail(nodes: Node[]): never {
    const start = nodes[0]?.start ?? 0
    const snippet = source
      .slice(start, start + 40)
      .split('\n')[0]
      .trim()
    throw new Error(
      `${file}:${lineAt(source, start)}: \`${snippet}\` is not a static value. ` +
        'cmdk-engine reads this file without running it; put computed config in ' +
        'cmdk-engine.config.mjs.',
    )
  }

  function evaluate(value: Node[], seen: ReadonlySet<string>): unknown {
    const nodes = stripTypeSuffix(value)
    const [first, second] = nodes

    if (isName(first, 'defineConfig') && second?.type === 'group' && nodes.length === 2) {
      const args = splitCommas(second.items).filter((arg) => arg.length > 0)
      if (second.open === '(' && args.length === 1) return evaluate(args[0], seen)
    }
    if (isPunct(first, '-') && second?.type === 'number' && nodes.length === 2) return -second.value
    if (nodes.length !== 1) fail(nodes)

    switch (first.type) {
      case 'string':
      case 'number':
        return first.value
      case 'regex':
        try {
          return new RegExp(first.pattern, first.flags)
        } catch {
          return fail(nodes)
        }
      case 'name':
        if (first.value === 'true' || first.value === 'false') return first.value === 'true'
        if (first.value === 'null') return null
        if (first.value === 'undefined') return undefined
        return resolveConst(first.value, nodes, seen)
      case 'group':
        if (first.open === '{') return evaluateObject(first.items, seen)
        if (first.open === '[') return evaluateArray(first.items, seen)
        return evaluate(first.items, seen)
    }
    return fail(nodes)
  }

  function evaluateObject(items: Node[], seen: ReadonlySet<string>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const entry of splitCommas(items)) {
      const [key, colon] = entry
      if (!key) continue
      if (isPunct(key, '...')) {
        const spread = evaluate(entry.slice(1), seen)
        if (typeof spread !== 'object' || spread === null || Array.isArray(spread)) fail(entry)
        Object.assign(result, spread)
      } else if (
        (key.type === 'name' || key.type === 'string' || key.type === 'number') &&
        isPunct(colon, ':') &&
        key.value !== '__proto__'
      ) {
        result[key.value] = evaluate(entry.slice(2), seen)
      } else if (key.type === 'name' && entry.length === 1) {
        // Shorthand: { exclude }
        result[key.value] = resolveConst(key.value, entry, seen)
      } else {
        fail(entry)
      }
    }
    return result
  }

  function evaluateArray(items: Node[], seen: ReadonlySet<string>): unknown[] {
    const result: unknown[] = []
    const entries = splitCommas(items)
    entries.forEach((entry, k) => {
      if (entry.length === 0) {
        // A trailing comma (or an empty array) is fine; a hole is not
        if (k < entries.length - 1) fail(entries[k + 1])
      } else if (isPunct(entry[0], '...')) {
        const spread = evaluate(entry.slice(1), seen)
        if (!Array.isArray(spread)) fail(entry)
        result.push(...spread)
      } else {
        result.push(evaluate(entry, seen))
      }
    })
    return result
  }

  function resolveConst(name: string, nodes: Node[], seen: ReadonlySet<string>): unknown {
    const value = declarations.get(name)
    if (!value || seen.has(name)) fail(nodes)
    return evaluate(value, new Set(seen).add(name))
  }

  return evaluate(exported, new Set()) as CmdkEngineConfig
}

const STATEMENT_KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'export',
  'import',
  'function',
  'class',
  'type',
  'interface',
  'enum',
  'declare',
])

function isPunct(node: Node | undefined, value: string): boolean {
  return node?.type === 'punct' && node.value === value
}
