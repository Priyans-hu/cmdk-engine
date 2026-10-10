import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import React from 'react'
import type { EventEmitter } from 'node:events'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'

// Docs-as-test: README code fences marked with an HTML comment on the line before
// them run against the BUILT package. `<!-- readme-test: typecheck -->` type-checks a
// fence; `<!-- readme-test: render -->` also renders it. Neither shows on GitHub or npm.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const README = readFileSync(path.join(ROOT, 'README.md'), 'utf8')
// Outside lint's reach, and resolves `react` from the repo's node_modules.
const CACHE_DIR = path.join(ROOT, 'node_modules', '.cache', 'cmdk-engine-readme-test')

interface Fence {
  mode: 'render' | 'typecheck'
  /** README line of the fence's first code line */
  line: number
  code: string
}

const MARKER = /<!-- readme-test: (render|typecheck) -->/g
const MARKED_FENCE = /<!-- readme-test: (render|typecheck) -->\r?\n```tsx?\r?\n([\s\S]*?)\r?\n```/g

function lineOf(index: number) {
  return README.slice(0, index).split('\n').length
}

function markedFences(): Fence[] {
  const fences = Array.from(README.matchAll(MARKED_FENCE), (m) => ({
    mode: m[1] as Fence['mode'],
    line: lineOf(m.index) + 2,
    code: m[2],
  }))
  // A marker that does not sit directly above a ts/tsx fence would be skipped silently.
  const markers = Array.from(README.matchAll(MARKER), (m) => lineOf(m.index))
  const used = new Set(fences.map((f) => f.line - 2))
  const stray = markers.filter((line) => !used.has(line))
  if (stray.length > 0) {
    throw new Error(
      `README.md: readme-test marker not directly above a ts/tsx fence, line ${stray}`,
    )
  }
  return fences
}

/** Type-checks the fences as in-memory files inside the package, so `cmdk-engine/*` resolves to dist/. */
function typeErrors(fences: Fence[]): string[] {
  const files = new Map(
    fences.map((f) => [path.join(ROOT, 'tests-dist', `readme-line-${f.line}.tsx`), f]),
  )
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    types: [],
  }
  const host = ts.createCompilerHost(options)
  const { fileExists, readFile, getSourceFile } = host
  host.fileExists = (file) => files.has(file) || fileExists(file)
  host.readFile = (file) => files.get(file)?.code ?? readFile(file)
  host.getSourceFile = (file, version, ...rest) => {
    const fence = files.get(file)
    return fence
      ? ts.createSourceFile(file, fence.code, version)
      : getSourceFile(file, version, ...rest)
  }
  const program = ts.createProgram([...files.keys()], options, host)
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const message = ts.flattenDiagnosticMessageText(d.messageText, '\n')
    const fence = d.file && files.get(d.file.fileName)
    if (!fence || d.start === undefined) return message
    const { line } = d.file!.getLineAndCharacterOfPosition(d.start)
    return `README.md:${fence.line + line}: ${message}`
  })
}

/** `cmdk-engine/react` -> the file package.json `exports` gives an ESM importer. */
function resolveExport(specifier: string): string {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const target = pkg.exports['.' + specifier.slice('cmdk-engine'.length)]?.import?.default
  if (!target) throw new Error(`README imports '${specifier}', which package.json does not export`)
  return pathToFileURL(path.join(ROOT, target)).href
}

/** Compiles a fence to an ES module that imports the built package, and loads it. */
async function importFence(fence: Fence) {
  const { outputText } = ts.transpileModule(fence.code, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  })
  const code = outputText.replace(
    /from (['"])(cmdk-engine(?:\/[^'"]*)?)\1/g,
    (_, quote: string, specifier: string) => `from ${quote}${resolveExport(specifier)}${quote}`,
  )
  mkdirSync(CACHE_DIR, { recursive: true })
  const file = path.join(CACHE_DIR, `readme-line-${fence.line}.mjs`)
  writeFileSync(file, code)
  return import(/* @vite-ignore */ pathToFileURL(file).href)
}

interface JsdomGlobal {
  jsdom?: { virtualConsole: EventEmitter }
}

// cmdk uses ResizeObserver + scrollIntoView internally — mock them for jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView = vi.fn()
})

afterAll(() => rmSync(CACHE_DIR, { recursive: true, force: true }))

describe('README fences against the built package', () => {
  const fences = markedFences()

  it('marks the Quick Start for rendering', () => {
    expect(fences.filter((f) => f.mode === 'render')).toHaveLength(1)
  })

  it('type-checks every marked fence', () => {
    expect(typeErrors(fences)).toEqual([])
  })

  it('renders the Quick Start: Cmd+K opens it, typing filters, Enter navigates and closes', async () => {
    const fence = fences.find((f) => f.mode === 'render')
    if (!fence) throw new Error('README.md has no <!-- readme-test: render --> fence')
    const { default: App } = await importFence(fence)
    render(<App />)
    expect(screen.queryByRole('dialog')).toBeNull()

    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', code: 'KeyK', metaKey: true })
    })
    const input = await screen.findByRole('combobox')
    expect(screen.getByText('Home')).toBeTruthy()
    expect(screen.getByText('Billing Overview')).toBeTruthy()

    fireEvent.change(input, { target: { value: 'invoices' } })
    await waitFor(() => expect(screen.queryByText('Home')).toBeNull())
    expect(screen.getByText('Billing Overview')).toBeTruthy()

    // jsdom does not navigate; it reports the attempt from `window.location.assign`.
    // Its default listener would print that report, so it is detached meanwhile.
    const virtualConsole = (window as unknown as JsdomGlobal).jsdom?.virtualConsole
    if (!virtualConsole) throw new Error('vitest no longer exposes the JSDOM instance as `jsdom`')
    const reported: string[] = []
    const onError = (error: Error) => reported.push(error.message)
    const defaults = virtualConsole.listeners('jsdomError')
    virtualConsole.removeAllListeners('jsdomError')
    virtualConsole.on('jsdomError', onError)
    try {
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' })
      })
    } finally {
      virtualConsole.off('jsdomError', onError)
      for (const listener of defaults) virtualConsole.on('jsdomError', listener)
    }
    expect(reported).toEqual(['Not implemented: navigation to another Document'])
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
