import { describe, it, expect } from 'vitest'
import { tokenize, toTree, objectProps, stringValue, type Token } from '../../src/cli/lexer'

const summary = (tokens: Token[]) =>
  tokens.map((t) => {
    if (t.type === 'string' || t.type === 'name' || t.type === 'punct')
      return `${t.type}:${t.value}`
    if (t.type === 'regex') return `regex:/${t.pattern}/${t.flags}`
    if (t.type === 'jsx') return `jsx:${t.name}${t.selfClosing ? '/' : ''}`
    if (t.type === 'jsxEnd') return `jsxEnd:${t.name}`
    return t.type
  })

describe('tokenize', () => {
  it('decodes string escapes and reads a template without ${} as a string', () => {
    const { tokens } = tokenize(String.raw`'it\'s' "A\x42\n" ` + '`plain` `a${b}c`')

    expect(tokens.map((t) => (t.type === 'string' ? t.value : t.type))).toEqual([
      "it's",
      'AB\n',
      'plain',
      'template',
    ])
  })

  it('tells regex literals from division', () => {
    expect(summary(tokenize('a = b / c / d').tokens)).toEqual([
      'name:a',
      'punct:=',
      'name:b',
      'punct:/',
      'name:c',
      'punct:/',
      'name:d',
    ])
    expect(summary(tokenize('x = /[\'"/]/g.test(y)').tokens).slice(0, 3)).toEqual([
      'name:x',
      'punct:=',
      `regex:/['"/]/g`,
    ])
  })

  it('skips comments but not comment-like text inside strings', () => {
    const { tokens } = tokenize("a // one\n/* two */ '/* three */' '// four'")

    expect(summary(tokens)).toEqual(['name:a', 'string:/* three */', 'string:// four'])
  })

  it('reads JSX tags, attributes and expressions, and skips JSX text', () => {
    const { tokens } = tokenize(
      `<Route path="/a" element={<L />} index><p>Don't {'x'}</p></Route>`,
      { jsx: true },
    )

    expect(summary(tokens)).toEqual([
      'jsx:Route',
      'jsx:L/',
      'jsx:p',
      'string:x',
      'jsxEnd:p',
      'jsxEnd:Route',
    ])
    expect(tokens[0]).toMatchObject({ attrs: { path: '/a', element: null, index: true } })
  })

  it('reads `<` as an operator after an operand, in .ts mode, and for generic arrows', () => {
    expect(summary(tokenize('a < b', { jsx: true }).tokens)).toEqual([
      'name:a',
      'punct:<',
      'name:b',
    ])
    expect(summary(tokenize('x = <T>y').tokens)).toContain('punct:<')
    expect(summary(tokenize('f = <T,>(v: T) => v', { jsx: true }).tokens)).toContain('punct:<')
  })

  it('reports an unterminated string with its offset and keeps the tokens before it', () => {
    const result = tokenize("ok\n'broken")

    expect(summary(result.tokens)).toEqual(['name:ok'])
    expect(result.error).toEqual({ message: 'unterminated string', offset: 3 })
  })
})

describe('toTree and objectProps', () => {
  it('reads string properties of an object literal, ignoring TS suffixes', () => {
    const [object] = toTree(tokenize("{ path: '/x' as const, 'label': \"X\", n: 1 }").tokens)
    if (object.type !== 'group') throw new Error('expected a group')

    const props = objectProps(object)
    expect(stringValue(props.get('path'))).toBe('/x')
    expect(stringValue(props.get('label'))).toBe('X')
    expect(stringValue(props.get('n'))).toBeUndefined()
  })
})
