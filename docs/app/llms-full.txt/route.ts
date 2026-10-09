import { readFileSync } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-static'

/** Serves the README as plain text for tools that want the full reference in one file. */
export function GET() {
  const file = path.join(process.cwd(), '..', 'README.md')
  return new Response(readFileSync(file, 'utf8'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
