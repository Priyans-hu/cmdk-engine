#!/usr/bin/env node
// Runs the docs site and the examples on THIS repo's build instead of the npm release.
// Run `bun run build` first.
//
//   node scripts/local-build.mjs docs
//     Packs the build and unpacks it into docs/node_modules/cmdk-engine. Run it again
//     after each `bun run build`, and after any `bun install` in docs/.
//
//   node scripts/local-build.mjs example <name> [--dev] [--registry <dir>]
//     Copies examples/<name> to a temp dir outside the repo (so nothing resolves from
//     the repo's node_modules), installs it with npm against the packed build, then
//     runs `npm run build`, or `npm run dev` with --dev.
//     --registry <dir>: after the build, deletes the copy's registry item files,
//     installs them again from <dir>/*.json with the shadcn CLI, and builds again.
import { execFileSync, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SHADCN = 'shadcn@4.21.4'
const isWindows = process.platform === 'win32'

function fail(message) {
  console.error(`local-build: ${message}`)
  process.exit(1)
}

function run(command, args, cwd) {
  const { status } = spawnSync(command, args, { cwd, stdio: 'inherit', shell: isWindows })
  if (status !== 0) fail(`\`${command} ${args.join(' ')}\` failed in ${cwd}`)
}

/** Packs the build into a temp dir: exactly the files npm would publish. */
function pack() {
  if (!existsSync(path.join(ROOT, 'dist'))) fail('dist/ is missing. Run `bun run build` first.')
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cmdk-engine-pack-'))
  const json = execFileSync('npm', ['pack', '--json', '--pack-destination', dir], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: isWindows,
  })
  return path.join(dir, JSON.parse(json)[0].filename)
}

function docs() {
  const modules = path.join(ROOT, 'docs', 'node_modules')
  if (!existsSync(modules)) fail('docs/node_modules is missing. Run `bun install` in docs/ first.')
  const tarball = pack()
  const target = path.join(modules, 'cmdk-engine')
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target)
  run('tar', ['-xzf', tarball, '-C', target, '--strip-components=1'], ROOT)
  console.log(`local-build: docs/node_modules/cmdk-engine is this repo's build`)
}

function example(name, { dev, registry }) {
  const source = path.join(ROOT, 'examples', name)
  if (!name || !existsSync(path.join(source, 'package.json'))) {
    fail(`examples/${name ?? '<name>'} has no package.json`)
  }
  const tarball = pack()
  const dir = path.join(mkdtempSync(path.join(os.tmpdir(), 'cmdk-engine-example-')), name)
  cpSync(source, dir, {
    recursive: true,
    filter: (file) => !/(^|[\\/])(node_modules|dist|\.next)$/.test(path.relative(source, file)),
  })
  const manifest = path.join(dir, 'package.json')
  const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
  pkg.dependencies['cmdk-engine'] = `file:${tarball}`
  writeFileSync(manifest, JSON.stringify(pkg, null, 2) + '\n')
  run('npm', ['install', '--no-audit', '--no-fund'], dir)
  console.log(`local-build: examples/${name} is installed in ${dir} with this repo's build`)
  if (dev) return run('npm', ['run', 'dev'], dir)
  run('npm', ['run', 'build'], dir)
  if (registry) reinstallFromRegistry(dir, path.resolve(registry))
}

/** Proves each registry item installs with the real shadcn CLI and still builds. */
function reinstallFromRegistry(dir, registry) {
  const items = readdirSync(registry).filter((f) => f.endsWith('.json') && f !== 'registry.json')
  if (items.length === 0) fail(`no registry items in ${registry}`)
  for (const file of items) {
    const item = JSON.parse(readFileSync(path.join(registry, file), 'utf8'))
    const installed = item.files.map((f) =>
      path.join(dir, 'src', 'components', path.basename(f.path)),
    )
    for (const f of installed) rmSync(f)
    // The CLI would `npm install` the item's dependencies, and the cmdk-engine range
    // may not be on npm yet. The packed build is installed already.
    delete item.dependencies
    const local = path.join(os.tmpdir(), `cmdk-engine-registry-${file}`)
    writeFileSync(local, JSON.stringify(item))
    run('npx', ['--yes', SHADCN, 'add', local, '--yes', '--overwrite'], dir)
    for (const f of installed) if (!existsSync(f)) fail(`${SHADCN} add ${file} did not write ${f}`)
    console.log(`local-build: ${SHADCN} installed ${item.name}`)
  }
  run('npm', ['run', 'build'], dir)
}

const [command, name, ...flags] = process.argv.slice(2)
if (command === 'docs') docs()
else if (command === 'example') {
  const at = flags.indexOf('--registry')
  example(name, { dev: flags.includes('--dev'), registry: at === -1 ? null : flags[at + 1] })
} else fail('usage: local-build.mjs docs | example <name> [--dev] [--registry <dir>]')
