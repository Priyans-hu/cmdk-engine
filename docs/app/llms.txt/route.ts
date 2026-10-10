import { readFileSync } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-static'

/** Serves the repo's llms.txt, so there is one copy. `next build` runs from docs/. */
export function GET() {
  const file = path.join(process.cwd(), '..', 'llms.txt')
  return new Response(readFileSync(file, 'utf8'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
