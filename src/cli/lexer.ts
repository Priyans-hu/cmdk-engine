/**
 * A small JS/TS/JSX tokenizer for the CLI's static readers: route files and
 * `cmdk-engine.config.ts`. It knows where strings, templates, regexes, comments
 * and JSX text begin and end, so their contents are never read as code. It
 * evaluates nothing.
 */

/** JSX attribute: its string value, `true` when bare, `null` for any other expression */
export type JsxAttr = string | true | null

export type Token =
  /** '...', "..." and `...` without `${}`, with escapes decoded */
  | { type: 'string'; value: string; start: number }
  /** A template literal with `${}` */
  | { type: 'template'; start: number }
  | { type: 'regex'; pattern: string; flags: string; start: number }
  | { type: 'number'; value: number; start: number }
  /** Identifiers and keywords */
  | { type: 'name'; value: string; start: number }
  | { type: 'punct'; value: string; start: number }
  /** A JSX opening tag. `exprs` holds the tokens of each `{...}` attribute value. */
  | {
      type: 'jsx'
      name: string
      attrs: Record<string, JsxAttr>
      exprs: Record<string, Token[]>
      selfClosing: boolean
      start: number
    }
  | { type: 'jsxEnd'; name: string; start: number }

type JsxToken = Extract<Token, { type: 'jsx' }>

export interface TokenizeResult {
  tokens: Token[]
  /** Set when the source ends inside a string, template or comment. `tokens` holds what came before. */
  error?: { message: string; offset: number }
}

// Keywords after which `/` starts a regex and `<` starts JSX
const EXPRESSION_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await',
  'default',
  'export',
])

const NAME_START = /[A-Za-z_$\u0080-￿]/
const NAME_PART = /[\w$\u0080-￿]/
const JSX_NAME = /[\w$.:-]/
const NUMBER = /(?:0[xXoObB][\da-fA-F_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?)n?/y

const ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v' }

class LexError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(message)
  }
}

/** Thrown inside a JSX attempt so the `<` is read as an operator instead */
class NotJsx extends Error {}

/**
 * Tokenize JavaScript or TypeScript source. JSX is read only when `jsx` is set
 * (`.tsx`, `.jsx`, `.js` files); in `.ts` files `<` is always an operator.
 */
export function tokenize(source: string, options: { jsx?: boolean } = {}): TokenizeResult {
  const jsx = options.jsx ?? false
  const tokens: Token[] = []
  let i = source.startsWith('#!') ? source.indexOf('\n') + 1 || source.length : 0

  function skipTrivia(): void {
    while (i < source.length) {
      const ch = source[i]
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '﻿') {
        i++
      } else if (ch === '/' && source[i + 1] === '/') {
        const end = source.indexOf('\n', i)
        i = end === -1 ? source.length : end
      } else if (ch === '/' && source[i + 1] === '*') {
        const end = source.indexOf('*/', i + 2)
        if (end === -1) throw new LexError('unterminated comment', i)
        i = end + 2
      } else {
        return
      }
    }
  }

  function readString(quote: string): string {
    const start = i
    let value = ''
    i++
    while (i < source.length && source[i] !== quote && source[i] !== '\n') {
      if (source[i] === '\\') value += readEscape()
      else value += source[i++]
    }
    if (source[i] !== quote) throw new LexError('unterminated string', start)
    i++
    return value
  }

  // Reads the escape sequence at a backslash and returns the text it stands for
  function readEscape(): string {
    const next = source[i + 1] ?? ''
    i += 2
    if (next === '\r' && source[i] === '\n') i++
    if (next === '\n' || next === '\r') return ''
    if (next in ESCAPES) return ESCAPES[next]
    if (next === '0' && !/\d/.test(source[i] ?? '')) return '\0'
    let hex: string | undefined
    if (next === 'x') {
      hex = source.slice(i, (i += 2))
    } else if (next === 'u' && source[i] === '{') {
      const end = source.indexOf('}', i)
      hex = source.slice(i + 1, end)
      i = end + 1
    } else if (next === 'u') {
      hex = source.slice(i, (i += 4))
    }
    return hex === undefined ? next : String.fromCodePoint(parseInt(hex, 16) || 0)
  }

  // Reads a template literal. `${}` expressions are lexed, to find where they end, and dropped.
  function readTemplate(): Token {
    const start = i
    let value = ''
    let cooked = true
    i++
    while (i < source.length && source[i] !== '`') {
      if (source[i] === '\\') {
        value += readEscape()
      } else if (source[i] === '$' && source[i + 1] === '{') {
        cooked = false
        i += 2
        lexExpression([], true)
      } else {
        value += source[i++]
      }
    }
    if (source[i] !== '`') throw new LexError('unterminated template', start)
    i++
    return cooked ? { type: 'string', value, start } : { type: 'template', start }
  }

  // Reads a regex literal at `/`, or returns null when the line ends first (then it divides)
  function readRegex(): Token | null {
    const start = i
    let inClass = false
    let j = i + 1
    for (; j < source.length; j++) {
      const ch = source[j]
      if (ch === '\n') return null
      if (ch === '\\') j++
      else if (ch === '[') inClass = true
      else if (ch === ']') inClass = false
      else if (ch === '/' && !inClass) break
    }
    if (j >= source.length) return null
    i = j + 1
    while (i < source.length && /[a-z]/i.test(source[i])) i++
    return {
      type: 'regex',
      pattern: source.slice(start + 1, j),
      flags: source.slice(j + 1, i),
      start,
    }
  }

  function readWhile(pattern: RegExp): string {
    const start = i
    while (i < source.length && pattern.test(source[i])) i++
    return source.slice(start, i)
  }

  // Whether the previous token ends an operand, so `/` divides and `<` compares
  function endsOperand(prev: Token | undefined): boolean {
    if (!prev) return false
    if (prev.type === 'punct') return prev.value === ')' || prev.value === ']' || prev.value === '}'
    if (prev.type === 'name') return !EXPRESSION_KEYWORDS.has(prev.value)
    return true
  }

  /**
   * Lex tokens into `out` until the end of the source or, with `untilBrace`, the
   * `}` that closes the current `{...}` (consumed, not pushed).
   */
  function lexExpression(out: Token[], untilBrace: boolean): void {
    let depth = 0
    let prev: Token | undefined
    const push = (token: Token): void => {
      out.push(token)
      prev = token
    }

    for (;;) {
      skipTrivia()
      if (i >= source.length) {
        if (untilBrace) throw new LexError('unterminated expression', i)
        return
      }
      const ch = source[i]
      const start = i

      if (ch === '"' || ch === "'") {
        push({ type: 'string', value: readString(ch), start })
      } else if (ch === '`') {
        push(readTemplate())
      } else if (NAME_START.test(ch)) {
        push({ type: 'name', value: readWhile(NAME_PART), start })
      } else if (/\d/.test(ch) || (ch === '.' && /\d/.test(source[i + 1] ?? ''))) {
        NUMBER.lastIndex = i
        const text = NUMBER.exec(source)?.[0] ?? ch
        i += text.length
        push({ type: 'number', value: Number(text.replace(/[_n]/g, '')), start })
      } else if (ch === '/' && !endsOperand(prev)) {
        const regex = readRegex()
        if (regex) {
          push(regex)
        } else {
          i++
          push({ type: 'punct', value: '/', start })
        }
      } else if (
        ch === '<' &&
        jsx &&
        !endsOperand(prev) &&
        /[A-Za-z_$>]/.test(source[i + 1] ?? '')
      ) {
        const length = out.length
        try {
          prev = readJsxElement(out)
        } catch (error) {
          if (!(error instanceof NotJsx) && !(error instanceof LexError)) throw error
          i = start + 1
          out.length = length
          push({ type: 'punct', value: '<', start })
        }
      } else {
        const value = source.startsWith('...', i)
          ? '...'
          : source.startsWith('=>', i) || source.startsWith('?.', i)
            ? source.slice(i, i + 2)
            : ch
        i += value.length
        if (value === '{') depth++
        if (value === '}' && depth-- === 0 && untilBrace) return
        push({ type: 'punct', value, start })
      }
    }
  }

  /**
   * Reads the JSX element at `<`: pushes its opening tag, then the tokens of its
   * attribute expressions and children, then its closing tag. Throws NotJsx if
   * the source there is not an element after all.
   */
  function readJsxElement(out: Token[]): JsxToken {
    const start = i
    i++
    const name = readJsxName()
    const open: JsxToken = { type: 'jsx', name, attrs: {}, exprs: {}, selfClosing: false, start }
    out.push(open)

    for (;;) {
      skipTrivia()
      const ch = source[i]
      if (ch === '/' && source[i + 1] === '>') {
        i += 2
        open.selfClosing = true
        return open
      }
      if (ch === '>') {
        i++
        break
      }
      if (ch === '{') {
        // A spread attribute, {...props}
        i++
        lexExpression(out, true)
        continue
      }
      if (ch === undefined || !NAME_START.test(ch)) throw new NotJsx()
      const attr = readWhile(JSX_NAME)
      skipTrivia()
      if (source[i] !== '=') {
        open.attrs[attr] = true
        continue
      }
      i++
      skipTrivia()
      const quote = source[i]
      if (quote === '"' || quote === "'") {
        // JSX attribute strings have no escapes
        const end = source.indexOf(quote, i + 1)
        if (end === -1) throw new NotJsx()
        open.attrs[attr] = source.slice(i + 1, end)
        i = end + 1
      } else if (quote === '{') {
        i++
        const expr: Token[] = []
        lexExpression(expr, true)
        out.push(...expr)
        open.exprs[attr] = expr
        open.attrs[attr] = expr.length === 1 && expr[0].type === 'string' ? expr[0].value : null
      } else {
        throw new NotJsx()
      }
    }

    // Children: text is skipped; `{...}` and nested elements are lexed
    for (;;) {
      if (i >= source.length) throw new NotJsx()
      if (source[i] === '<' && source[i + 1] === '/') {
        const end = i
        i += 2
        skipTrivia()
        const endName = readJsxName()
        skipTrivia()
        if (endName !== name || source[i] !== '>') throw new NotJsx()
        i++
        out.push({ type: 'jsxEnd', name, start: end })
        return open
      }
      if (source[i] === '<') {
        readJsxElement(out)
      } else if (source[i] === '{') {
        i++
        lexExpression(out, true)
      } else {
        while (i < source.length && source[i] !== '<' && source[i] !== '{') i++
      }
    }
  }

  // A tag name; a fragment, <>, has an empty one
  function readJsxName(): string {
    const name = readWhile(JSX_NAME)
    if (!name && source[i] !== '>') throw new NotJsx()
    return name
  }

  try {
    lexExpression(tokens, false)
    return { tokens }
  } catch (error) {
    if (!(error instanceof LexError)) throw error
    return { tokens, error: { message: error.message, offset: error.offset } }
  }
}

/** 1-based line of an offset, for messages */
export function lineAt(source: string, offset: number): number {
  return source.slice(0, offset).split('\n').length
}

// ------------------------------------------------------------
// Bracket tree
// ------------------------------------------------------------

/** The nodes between a matching `{}`, `[]` or `()` pair */
export interface Group {
  type: 'group'
  open: '{' | '[' | '('
  items: Node[]
  start: number
}

export type Node = Token | Group

const OPENER_OF: Record<string, Group['open']> = { '}': '{', ']': '[', ')': '(' }

/** Nest tokens into bracket groups. A stray closer is dropped; an unclosed group runs to the end. */
export function toTree(tokens: Token[]): Node[] {
  const root: Node[] = []
  const stack: { open: string; items: Node[] }[] = [{ open: '', items: root }]
  for (const token of tokens) {
    const value = token.type === 'punct' ? token.value : ''
    if (value === '{' || value === '[' || value === '(') {
      const group: Group = { type: 'group', open: value, items: [], start: token.start }
      stack[stack.length - 1].items.push(group)
      stack.push({ open: value, items: group.items })
    } else if (value in OPENER_OF) {
      let k = stack.length - 1
      while (k > 0 && stack[k].open !== OPENER_OF[value]) k--
      if (k > 0) stack.length = k
    } else {
      stack[stack.length - 1].items.push(token)
    }
  }
  return root
}

const isName = (node: Node | undefined, value: string): boolean =>
  node?.type === 'name' && node.value === value

/**
 * Split nodes at top-level commas. After `as` or `satisfies`, commas inside a
 * type's `<...>` do not split (`satisfies Record<string, Meta>`).
 */
export function splitCommas(items: Node[]): Node[][] {
  const parts: Node[][] = [[]]
  let angle = 0
  let inType = false
  for (const node of items) {
    if (node.type === 'punct' && node.value === ',' && angle === 0) {
      parts.push([])
      inType = false
      continue
    }
    if (isName(node, 'as') || isName(node, 'satisfies')) inType = true
    if (inType && node.type === 'punct' && node.value === '<') angle++
    if (inType && node.type === 'punct' && node.value === '>' && angle > 0) angle--
    parts[parts.length - 1].push(node)
  }
  return parts
}

/** A value without a trailing TS `as T`, `satisfies T` or `!` */
export function stripTypeSuffix(value: Node[]): Node[] {
  const end = value.findIndex(
    (node, k) =>
      k > 0 &&
      (isName(node, 'as') ||
        isName(node, 'satisfies') ||
        (node.type === 'punct' && node.value === '!')),
  )
  return end === -1 ? value : value.slice(0, end)
}

/** The `key: value` properties of an object literal (shorthands, spreads and methods skipped) */
export function objectProps(group: Group): Map<string, Node[]> {
  const props = new Map<string, Node[]>()
  for (const [key, colon, ...value] of splitCommas(group.items)) {
    if (
      (key?.type === 'name' || key?.type === 'string') &&
      colon?.type === 'punct' &&
      colon.value === ':'
    ) {
      props.set(key.value, value)
    }
  }
  return props
}

/** The value when it is one string literal (TS suffixes ignored) */
export function stringValue(value: Node[] | undefined): string | undefined {
  const [node, extra] = stripTypeSuffix(value ?? [])
  return node?.type === 'string' && !extra ? node.value : undefined
}

/** The value when it is one bracket group of the given kind (TS suffixes ignored) */
export function groupValue(value: Node[] | undefined, open: Group['open']): Group | undefined {
  const [node, extra] = stripTypeSuffix(value ?? [])
  return node?.type === 'group' && node.open === open && !extra ? node : undefined
}
