import { readFileSync } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-static'

/** Serves the README as plain text for tools that want the full reference in one file. */
export function GET() {
  const file = path.join(process.cwd(), '..', 'README.md')
  // The README's test markers are comments for the repo's tests, not content.
  const text = readFileSync(file, 'utf8').replace(/<!-- readme-test: \w+ -->\r?\n/g, '')
  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
