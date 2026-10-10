import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Consumers that compile with `esModuleInterop` and `allowSyntheticDefaultImports`
// off and check libraries (`skipLibCheck: false`) get TS1259 from any default
// `React` import in our .d.ts. Node10 resolution is deprecated in TypeScript 6,
// hence `ignoreDeprecations`.
function typeErrors(files: string[]): string[] {
  const program = ts.createProgram(
    files.map((file) => path.join(ROOT, file)),
    {
      noEmit: true,
      strict: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      esModuleInterop: false,
      allowSyntheticDefaultImports: false,
      skipLibCheck: false,
      ignoreDeprecations: '6.0',
      types: [],
    },
  )
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const message = ts.flattenDiagnosticMessageText(d.messageText, ' ')
    if (!d.file || d.start === undefined) return `TS${d.code}: ${message}`
    const { line } = d.file.getLineAndCharacterOfPosition(d.start)
    return `${path.relative(ROOT, d.file.fileName)}:${line + 1} TS${d.code}: ${message}`
  })
}

describe('built package: type declarations', () => {
  it('compile without esModuleInterop for the react and adapter entries', () => {
    expect(
      typeErrors([
        'dist/react/index.d.ts',
        'dist/adapters/cmdk/index.d.ts',
        'dist/adapters/base-ui/index.d.ts',
      ]),
    ).toEqual([])
  }, 30_000)
})
