import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CmdkEngineConfig } from '../core/types'

/**
 * Load a cmdk-engine config file.
 *
 * Supports:
 * - .ts/.mts/.cts files (via string-literal-aware regex extraction — no TS compiler)
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
    // For TS files, extract the config via string-literal-aware parsing.
    // This avoids needing the TS compiler at runtime.
    return parseTypeScriptConfig(fullPath)
  }

  throw new Error(`Unsupported config format: ${fullPath}`)
}

/** Strip a leading UTF-8 BOM (common in Windows-authored files). */
function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

// A NUL sentinel that never appears in real config source, used to mask string
// literals so structural regexes can't corrupt string contents.
const PH = String.fromCharCode(0)

/**
 * Replace every string literal ('...', "...", `...`) with a placeholder token,
 * returning the structural skeleton plus the decoded string values. This lets
 * downstream regex transforms (comment stripping, key quoting) run without ever
 * corrupting string contents that contain `//`, `:`, `'`, `{`, or `,`.
 */
function maskStrings(input: string): { skeleton: string; values: string[] } {
  const values: string[] = []
  let out = ''
  let i = 0

  while (i < input.length) {
    const ch = input[i]
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch
      let body = ''
      let j = i + 1
      while (j < input.length && input[j] !== quote) {
        if (input[j] === '\\') {
          body += input[j] + (input[j + 1] ?? '')
          j += 2
        } else {
          body += input[j]
          j++
        }
      }
      values.push(decodeStringBody(body))
      out += `${PH}${values.length - 1}${PH}`
      i = j + 1
    } else {
      out += ch
      i++
    }
  }

  return { skeleton: out, values }
}

/** Decode common escape sequences in a captured string-literal body. */
function decodeStringBody(body: string): string {
  const map: Record<string, string> = {
    n: '\n',
    t: '\t',
    r: '\r',
    b: '\b',
    f: '\f',
    v: '\v',
    '0': '\0',
    '\\': '\\',
    "'": "'",
    '"': '"',
    '`': '`',
  }
  let out = ''
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '\\' && i + 1 < body.length) {
      const next = body[i + 1]
      out += map[next] ?? next
      i++
    } else {
      out += body[i]
    }
  }
  return out
}

/**
 * Extract the defineConfig()/export default argument and parse it.
 * Works for common config patterns without needing a full TS compiler.
 */
function parseTypeScriptConfig(filePath: string): CmdkEngineConfig {
  const raw = stripBom(readFileSync(filePath, 'utf-8'))

  // Mask strings first so comment stripping and object extraction never touch
  // string contents (e.g. a URL value like 'https://…' is not a comment).
  const { skeleton, values } = maskStrings(raw)
  const noComments = skeleton
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  const match =
    noComments.match(/defineConfig\s*\(\s*(\{[\s\S]*\})\s*\)/) ??
    noComments.match(/export\s+default\s+(\{[\s\S]*\})/)

  if (!match) {
    throw new Error('Could not parse config file. Use defineConfig() or export default {}.')
  }

  return evalConfigObject(match[1], values)
}

/**
 * Turn a masked object skeleton back into a real config object: quote bare keys,
 * drop trailing commas, then restore string placeholders as JSON strings.
 */
function evalConfigObject(skeleton: string, values: string[]): CmdkEngineConfig {
  try {
    const jsonStr = skeleton
      // Drop trailing commas
      .replace(/,\s*([}\]])/g, '$1')
      // Quote bare identifier keys (string-literal keys are already placeholders)
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
      // Restore string placeholders as valid JSON strings
      .replace(new RegExp(`${PH}(\\d+)${PH}`, 'g'), (_, n) =>
        JSON.stringify(values[Number(n)] ?? ''),
      )

    return JSON.parse(jsonStr) as CmdkEngineConfig
  } catch (error) {
    console.warn(
      `Warning: Could not parse config file (${(error as Error).message}). Using defaults.`,
    )
    return {}
  }
}
