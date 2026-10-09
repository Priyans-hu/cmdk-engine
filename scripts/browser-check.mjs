#!/usr/bin/env node
// Drives a real browser over static builds, with a pinned playwright-core installed
// into a temp dir (not a repo dependency) and the installed Google Chrome.
//
//   node scripts/browser-check.mjs docs <out dir>
//     Serves the docs export under /cmdk-engine, loads every page and fails on any
//     console error or uncaught error (hydration mismatches included). Then opens the
//     palette with the keyboard and the navbar button, navigates with it, and fetches
//     the shadcn registry items.
//
//   node scripts/browser-check.mjs screenshot <vite example dist> <png>
//     Writes the README screenshot from the built vite-react-router example.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import http from 'node:http'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

const PLAYWRIGHT = 'playwright-core@1.64.0'
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control'
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
}

function fail(message) {
  console.error(`browser-check: ${message}`)
  process.exit(1)
}

function loadPlaywright() {
  const dir = path.join(os.tmpdir(), `cmdk-engine-${PLAYWRIGHT}`)
  const require = createRequire(path.join(dir, 'noop.js'))
  try {
    return require('playwright-core')
  } catch {
    mkdirSync(dir, { recursive: true })
    const args = ['install', '--no-save', '--no-audit', '--no-fund', '--prefix', dir, PLAYWRIGHT]
    const { status } = spawnSync('npm', args, {
      stdio: 'inherit',
      shell: os.platform() === 'win32',
    })
    if (status !== 0) fail(`could not install ${PLAYWRIGHT}`)
    return require('playwright-core')
  }
}

/** Serves `root` under `base` like GitHub Pages (`/a` -> a.html); `spa` falls back to index.html. */
function serve(root, base, spa) {
  const send = (res, status, file) => {
    res.writeHead(status, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    })
    res.end(readFileSync(file))
  }
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (!pathname.startsWith(base)) return res.writeHead(404).end()
    const rel = pathname.slice(base.length) || '/'
    for (const candidate of [rel, `${rel}.html`, path.posix.join(rel, 'index.html')]) {
      const file = path.join(root, candidate)
      if (file.startsWith(root) && existsSync(file) && statSync(file).isFile()) {
        return send(res, 200, file)
      }
    }
    if (spa) return send(res, 200, path.join(root, 'index.html'))
    const notFound = path.join(root, '404.html')
    return existsSync(notFound) ? send(res, 404, notFound) : res.writeHead(404).end()
  })
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` }),
    ),
  )
}

/** Every exported page as a URL path: index.html -> /, docs/api.html -> /docs/api. */
function exportedPages(root, dir = root) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name.startsWith('_') ? [] : exportedPages(root, file)
    if (!entry.name.endsWith('.html') || entry.name === '404.html') return []
    const page =
      '/' +
      path
        .relative(root, file)
        .split(path.sep)
        .join('/')
        .replace(/\.html$/, '')
    return [page.replace(/(^|\/)index$/, '') || '/']
  })
}

async function launch() {
  const { chromium } = loadPlaywright()
  return chromium.launch({ channel: 'chrome' })
}

function trackErrors(page) {
  const errors = []
  page.on('console', (message) => {
    // A failed load is reported below with its URL, which this message lacks.
    const text = message.text()
    if (message.type() === 'error' && !text.startsWith('Failed to load resource')) {
      errors.push(`console: ${text}`)
    }
  })
  page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`))
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`)
  })
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? ''
    if (!reason.includes('ERR_ABORTED')) errors.push(`failed: ${request.url()} ${reason}`)
  })
  return errors
}

async function checkDocs(outDir) {
  const root = path.resolve(outDir)
  const base = '/cmdk-engine'
  const { server, origin } = await serve(root, base, false)
  const browser = await launch()
  const problems = []
  try {
    const page = await browser.newPage()
    const errors = trackErrors(page)
    const pages = exportedPages(root)
    for (const url of pages) {
      errors.length = 0
      await page.goto(origin + base + url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(200)
      problems.push(...errors.map((e) => `${url}: ${e}`))
    }
    console.log(`browser-check: loaded ${pages.length} pages: ${pages.join(', ')}`)

    // Keyboard: open, filter, and navigate with the site's own routes.
    errors.length = 0
    await page.goto(origin + base + '/', { waitUntil: 'networkidle' })
    await page.keyboard.press(`${MOD}+KeyK`)
    await page.locator('[cmdk-dialog]').waitFor()
    await page.keyboard.type('api reference')
    await page.locator('[cmdk-item][data-selected="true"]', { hasText: 'API Reference' }).waitFor()
    await page.keyboard.press('Enter')
    await page.waitForURL(`**${base}/docs/api`)
    await page.locator('[cmdk-dialog]').waitFor({ state: 'detached' })

    // The navbar button opens it too (the only way in on touch devices).
    await page.getByTestId('docs-search-open-btn').click()
    await page.locator('[cmdk-dialog]').waitFor()
    await page.keyboard.press('Escape')
    await page.locator('[cmdk-dialog]').waitFor({ state: 'detached' })
    problems.push(...errors.map((e) => `palette: ${e}`))
    console.log('browser-check: the palette opens, filters and navigates')

    for (const name of ['command-palette', 'command-palette-base-ui']) {
      const res = await page.request.get(`${origin}${base}/r/${name}.json`)
      const item = res.ok() ? await res.json() : null
      if (item?.name !== name || !item.files?.[0]?.content) {
        problems.push(`/r/${name}.json: ${res.status()}, not a registry item`)
      }
    }
  } finally {
    await browser.close()
    server.close()
  }
  // Known Next.js export issue, also on the live site: with a basePath, the client
  // fetches the home page's RSC payload from /cmdk-engine.txt, but the export writes
  // index.txt. Next then loads the page in full. Reported, not failed.
  const known = `404: ${origin}${base}.txt?_rsc=`
  if (problems.some((p) => p.includes(known))) {
    console.warn(`browser-check: warning: ${base}.txt (the home page's RSC payload) is a 404`)
  }
  const failures = problems.filter((p) => !p.includes(known))
  if (failures.length > 0) fail(`\n  ${failures.join('\n  ')}`)
  console.log('browser-check: no console errors, registry items served')
}

async function screenshot(distDir, png) {
  const { server, origin } = await serve(path.resolve(distDir), '', true)
  const browser = await launch()
  try {
    const page = await browser.newPage({
      viewport: { width: 880, height: 523 },
      deviceScaleFactor: 2,
    })
    const errors = trackErrors(page)
    // Pick Billing once, so the Recent group has an item.
    await page.goto(origin + '/', { waitUntil: 'networkidle' })
    await page.keyboard.press(`${MOD}+KeyK`)
    await page.keyboard.type('billing')
    await page.keyboard.press('Enter')
    await page.waitForURL('**/billing')
    await page.goto(origin + '/', { waitUntil: 'networkidle' })
    await page.keyboard.press(`${MOD}+KeyK`)
    await page.locator('[cmdk-group-heading]', { hasText: 'Recent' }).waitFor()
    await page.waitForTimeout(300)
    await page.screenshot({ path: png })
    if (errors.length > 0) fail(errors.join('\n'))
    console.log(`browser-check: wrote ${png}`)
  } finally {
    await browser.close()
    server.close()
  }
}

const [command, ...args] = process.argv.slice(2)
if (command === 'docs' && args[0]) await checkDocs(args[0])
else if (command === 'screenshot' && args[1]) await screenshot(args[0], args[1])
else fail('usage: browser-check.mjs docs <out dir> | screenshot <dist dir> <png>')
