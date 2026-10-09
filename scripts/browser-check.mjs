#!/usr/bin/env node
// Drives a real browser over static builds, with a pinned playwright-core installed
// into a temp dir (not a repo dependency) and the installed Google Chrome.
//
//   node scripts/browser-check.mjs docs <out dir>
//     Serves the docs export under /cmdk-engine like GitHub Pages, loads every page and
//     fails on any console error, uncaught error (hydration mismatches included) or
//     failed request. Requests every internal link and the shadcn registry items. Then
//     opens the palette with the keyboard and the navbar button, and fails if
//     navigating with it loads the page in full.
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

/** Every exported page as its URL: index.html -> /, a/index.html -> /a/, a.html -> /a. */
function exportedPages(root, dir = root) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name.startsWith('_') || entry.name === '404' ? [] : exportedPages(root, file)
    }
    if (!entry.name.endsWith('.html') || entry.name === '404.html') return []
    const page = path.relative(root, file).split(path.sep).join('/')
    return ['/' + page.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')]
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
    const links = new Set()
    for (const url of pages) {
      errors.length = 0
      await page.goto(origin + base + url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(200)
      problems.push(...errors.map((e) => `${url}: ${e}`))
      for (const href of await page.$$eval('a[href]', (anchors) => anchors.map((a) => a.href))) {
        const link = new URL(href)
        if (link.origin === origin) links.add(link.pathname)
      }
    }
    console.log(`browser-check: loaded ${pages.length} pages: ${pages.join(', ')}`)

    // Every link to this site, and the registry items, must resolve.
    const registry = [`${base}/r/command-palette.json`, `${base}/r/command-palette-base-ui.json`]
    for (const link of [...links, ...registry]) {
      const res = await page.request.get(origin + link)
      if (!res.ok()) problems.push(`${link}: ${res.status()}`)
    }
    console.log(`browser-check: requested ${links.size} internal links and the registry items`)

    // Keyboard: open, filter, and navigate with the site's own routes, in place: a
    // full page load means Next could not fetch the route's payload.
    errors.length = 0
    await page.goto(origin + base + '/', { waitUntil: 'networkidle' })
    for (const [query, label, to] of [
      ['api reference', 'API Reference', '/docs/api'],
      ['home', 'Home', '/'],
    ]) {
      await page.evaluate(() => (window.__sameDocument = true))
      await page.keyboard.press(`${MOD}+KeyK`)
      await page.locator('[cmdk-dialog]').waitFor()
      await page.keyboard.type(query)
      await page.locator('[cmdk-item][data-selected="true"]', { hasText: label }).waitFor()
      await page.keyboard.press('Enter')
      const target = (base + to).replace(/\/$/, '')
      await page.waitForURL((url) => url.pathname.replace(/\/$/, '') === target)
      await page.waitForLoadState('networkidle')
      const sameDocument = await page.evaluate(() => window.__sameDocument).catch(() => false)
      if (!sameDocument) problems.push(`palette: going to ${to} loaded the page in full`)
      await page.locator('[cmdk-dialog]').waitFor({ state: 'detached' })
    }

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
  if (problems.length > 0) fail(`\n  ${problems.join('\n  ')}`)
  console.log('browser-check: no console errors; every link and registry item resolves')
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
