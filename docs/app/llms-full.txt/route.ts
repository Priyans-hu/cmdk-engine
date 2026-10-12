import { readFileSync } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-static'

/** Serves the README and GUIDE as plain text for tools that want the full reference in one file. */
export function GET() {
  const text = ['README.md', 'GUIDE.md']
    .map((name) => readFileSync(path.join(process.cwd(), '..', name), 'utf8'))
    .join('\n')
    // The docs' test markers are comments for the repo's tests, not content.
    .replace(/<!-- readme-test: \w+ -->\r?\n/g, '')
  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
