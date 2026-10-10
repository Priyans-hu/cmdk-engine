// Builds the shadcn registry that the site serves at /cmdk-engine/r/, like
// `shadcn build`: one JSON per item in registry.json, with each file's content
// inlined, plus registry.json itself. The sources live in examples/shadcn, whose
// build checks them.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DOCS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(DOCS, 'public', 'r')
const registry = JSON.parse(readFileSync(path.join(DOCS, 'registry.json'), 'utf8'))

const published = (file) => ({ ...file, path: `registry/${path.basename(file.path)}` })
const write = (name, json) =>
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(json, null, 2) + '\n')

mkdirSync(OUT, { recursive: true })
for (const item of registry.items) {
  write(item.name, {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    ...item,
    files: item.files.map((file) => ({
      ...published(file),
      content: readFileSync(path.join(DOCS, file.path), 'utf8'),
    })),
  })
}
write('registry', {
  ...registry,
  items: registry.items.map((item) => ({ ...item, files: item.files.map(published) })),
})
console.log(`build-registry: ${registry.items.length} items in public/r`)
