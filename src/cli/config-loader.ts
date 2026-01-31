import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CmdkEngineConfig } from '../core/types'

/**
 * Load a cmdk-engine config file.
 *
 * Supports:
 * - .ts files (via simple regex extraction — no TS compiler needed)
 * - .json files
 * - .js/.mjs files (via dynamic import)
 */
export async function loadConfig(configPath: string): Promise<CmdkEngineConfig> {
  const fullPath = resolve(configPath)

  if (!existsSync(fullPath)) {
    // No config file is fine — return defaults
    return {}
  }

  if (fullPath.endsWith('.json')) {
    const content = readFileSync(fullPath, 'utf-8')
    return JSON.parse(content) as CmdkEngineConfig
  }

  if (fullPath.endsWith('.js') || fullPath.endsWith('.mjs')) {
    const mod = await import(fullPath)
    return (mod.default ?? mod) as CmdkEngineConfig
  }

  if (fullPath.endsWith('.ts')) {
    // For TS files, we extract the config using simple parsing
    // This avoids needing the TS compiler at runtime
    return parseTypeScriptConfig(fullPath)
  }

  throw new Error(`Unsupported config format: ${fullPath}`)
}

/**
 * Simple TS config parser that extracts the defineConfig() argument.
 * Works for common config patterns without needing a full TS compiler.
 */
function parseTypeScriptConfig(filePath: string): CmdkEngineConfig {
  const content = readFileSync(filePath, 'utf-8')

  // Remove single-line comments
  const noComments = content.replace(/\/\/.*$/gm, '')

  // Try to find the defineConfig call
  const defineConfigMatch = noComments.match(/defineConfig\s*\(\s*(\{[\s\S]*\})\s*\)/)
  if (!defineConfigMatch) {
    // Try to find export default { ... }
    const defaultExportMatch = noComments.match(/export\s+default\s+(\{[\s\S]*\})/)
    if (!defaultExportMatch) {
      throw new Error('Could not parse config file. Use defineConfig() or export default {}.')
    }
    return evalConfigObject(defaultExportMatch[1])
  }

  return evalConfigObject(defineConfigMatch[1])
}

/**
 * Safely evaluate a config object string.
 * Only supports JSON-like objects with string, number, boolean, array, and object values.
 */
function evalConfigObject(objStr: string): CmdkEngineConfig {
  // Clean up the string to make it valid JSON
  let jsonStr = objStr
    // Remove trailing commas
    .replace(/,\s*([}\]])/g, '$1')
    // Quote unquoted keys
    .replace(/(\w+)\s*:/g, '"$1":')
    // Replace single quotes with double quotes
    .replace(/'/g, '"')
    // Remove TS type annotations
    .replace(/:\s*\w+\[\]\s*(?=[,}])/g, ': []')

  try {
    return JSON.parse(jsonStr) as CmdkEngineConfig
  } catch {
    // If JSON parse fails, return empty config
    console.warn('Warning: Could not parse config file. Using defaults.')
    return {}
  }
}
