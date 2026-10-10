import { describe, expect, it } from 'vitest'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import ts from 'typescript'

// The core, match-sorter and sitemap entries do not need React, so their published types
// must compile without React's types and with `skipLibCheck: false`. Each check
// copies one built .d.ts into a fresh directory and type checks a small consumer.
const ROOT = resolve(__dirname, '..')

// Each consumer defines `make`, which takes a CommandItem
const CORE = `import type { CommandItem } from './entry'
const make = (item: CommandItem) => item
`
const MATCH_SORTER = `import { createMatchSorterSearch } from './entry'
type Item = Parameters<ReturnType<typeof createMatchSorterSearch>['search']>[1][number]
const make = (item: Item) => item
`
const SITEMAP = `import { sitemapToCommands } from './entry'
type Item = ReturnType<typeof sitemapToCommands>[number]
const make = (item: Item) => item
`
const ENTRIES = [
  ['core/index.d.ts', CORE],
  ['core/index.d.cts', CORE],
  ['core/search-match-sorter.d.ts', MATCH_SORTER],
  ['core/search-match-sorter.d.cts', MATCH_SORTER],
  ['adapters/sitemap/index.d.ts', SITEMAP],
  ['adapters/sitemap/index.d.cts', SITEMAP],
]

const VALID = `export const item = make({ id: 'a', label: 'A', icon: 'star' })
`
// With React's types, `icon` stays a ReactNode, so a plain object is rejected
const INVALID_ICON = `// @ts-expect-error a plain object is not a ReactNode
export const bad = make({ id: 'b', label: 'B', icon: {} as object })
`

function typeErrors(dir: string, entry: string, consumer: string): string[] {
  copyFileSync(join(ROOT, 'dist', entry), join(dir, 'entry.d.ts'))
  writeFileSync(join(dir, 'consumer.ts'), consumer)
  const program = ts.createProgram([join(dir, 'consumer.ts')], {
    strict: true,
    skipLibCheck: false,
    noEmit: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: [],
  })
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
}

describe('core types without React', () => {
  it.each(ENTRIES)('%s compiles with no React types installed', (entry, consumer) => {
    // The OS temp dir has no node_modules above it, so `react` cannot resolve
    const dir = mkdtempSync(join(tmpdir(), 'cmdk-engine-types-'))
    try {
      expect(typeErrors(dir, entry, consumer + VALID)).toEqual([])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 30_000)

  it.each(ENTRIES)('%s keeps icon a ReactNode with React types installed', (entry, consumer) => {
    // Inside the repo, `react` resolves to the dev dependency and its types
    const base = join(ROOT, 'node_modules', '.cache')
    mkdirSync(base, { recursive: true })
    const dir = mkdtempSync(join(base, 'cmdk-engine-types-'))
    try {
      expect(typeErrors(dir, entry, consumer + VALID + INVALID_ICON)).toEqual([])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 30_000)
})
