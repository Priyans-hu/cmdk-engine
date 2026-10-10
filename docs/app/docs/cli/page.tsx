import Link from 'next/link'
import { ApiTable } from '@/components/api-table'
import { CodeBlock } from '@/components/code-block'
import { Since } from '@/components/since'

export const metadata = { title: 'CLI' }

const c = (text: string) => <code>{text}</code>

export default function CLI() {
  return (
    <>
      <h1>CLI</h1>
      <p>
        <code>cmdk-engine</code> scans your route files and writes a sitemap: a file listing every
        route with a label, keywords and group. Use it when your routes live in files, as in
        Next.js, or to keep a committed list of routes in sync in CI. It needs Node.js 20 or later.
      </p>
      <CodeBlock
        language="bash"
        code={`npx cmdk-engine init      # create cmdk-engine.config.ts
npx cmdk-engine scan      # scan routes and write the sitemap
npx cmdk-engine validate  # check the config file`}
      />

      <h2>Frameworks</h2>
      <ApiTable
        head={['Framework', 'What it scans', 'Default routes directory']}
        rows={[
          [
            'react-router',
            <>
              Source files, for route objects and <code>&lt;Route&gt;</code> elements with a string{' '}
              <code>path</code>, with the <code>label</code>, <code>keywords</code> and{' '}
              <code>group</code> of their own <code>handle.command</code>. Relative child paths are
              joined to their parent route in the same file. Routes with a <code>:param</code> are
              skipped unless <code>includeDynamic</code> or their own <code>handle.command</code>{' '}
              keeps them, and catch-all routes are always skipped.
            </>,
            <>
              <code>src/routes</code> if it exists, otherwise <code>src</code>
            </>,
          ],
          [
            'nextjs-app',
            <>
              Each <code>page</code> file under the App Router. Route groups such as{' '}
              <code>(auth)</code> and <code>@slot</code> folders add no segment. Private{' '}
              <code>_folders</code>, intercepting <code>(.)</code> routes and <code>api/</code> are
              skipped. <code>[[...slug]]</code> gives its parent&apos;s URL, and other dynamic
              segments need <code>includeDynamic</code>.
            </>,
            <>
              <code>src/app</code> if it exists, otherwise <code>app</code>
            </>,
          ],
          [
            'nextjs-pages',
            <>
              Each file under the Pages Router, except files that start with <code>_</code> (such as{' '}
              <code>_app</code>) and the top-level <code>api/</code> directory. Dynamic segments
              need <code>includeDynamic</code>.{' '}
            </>,
            <>
              <code>src/pages</code> if it exists, otherwise <code>pages</code>
            </>,
          ],
        ]}
      />
      <p>
        When you do not name a framework, a <code>next.config</code> file means Next.js (the App
        Router if an <code>app</code> or <code>src/app</code> directory exists, otherwise the Pages
        Router). Anything else is treated as React Router.
      </p>

      <h2>Commands</h2>
      <h3>
        <code>cmdk-engine init</code>
      </h3>
      <p>
        Creates a config file from a template. It refuses to overwrite an existing one unless you
        pass <code>--force</code>.
      </p>
      <ApiTable
        head={['Option', 'Default', 'Description']}
        rows={[
          ['-c, --config <path>', c('cmdk-engine.config.ts'), 'Where to create the file.'],
          ['-f, --force', 'off', 'Overwrite an existing config file.'],
        ]}
      />
      <h3>
        <code>cmdk-engine scan</code>
      </h3>
      <p>
        Scans the routes and writes the sitemap. It stops with an error, and leaves the existing
        output alone, when it finds no routes: a mistyped directory or framework is the usual cause.
      </p>
      <ApiTable
        head={['Option', 'Default', 'Description']}
        rows={[
          [
            '-c, --config <path>',
            c('cmdk-engine.config.ts'),
            'The config file. Not finding one you named is an error; the default is optional.',
          ],
          [
            '-o, --output <path>',
            <>
              the config&apos;s <code>output</code>, else{' '}
              <code>src/generated/command-routes.json</code>
            </>,
            'Where to write the sitemap.',
          ],
          [
            '-f, --format <format>',
            c('json'),
            <>
              <code>json</code> or <code>ts</code>. With <code>ts</code> the file is a module that
              exports <code>commandRoutes</code>.
            </>,
          ],
          [
            '--framework <name>',
            'auto-detected',
            <>
              <code>react-router</code>, <code>nextjs-app</code> or <code>nextjs-pages</code>.
            </>,
          ],
          ['--routes-dir <dir>', 'per framework', 'The directory to scan.'],
          [
            <>
              --include-dynamic [names...] <Since />
            </>,
            'off',
            <>
              Keep routes with these <code>:param</code> segments, for example <code>locale</code>
              (every <code>:param</code> when no name is given). Names can be separated by spaces or
              commas. The flag overrides the config value.
            </>,
          ],
          ['--allow-empty', 'off', 'Write the sitemap even when no routes are found.'],
          ['--no-default-exclude', 'off', 'Keep the routes that are normally left out (below).'],
        ]}
      />
      <h3>
        <code>cmdk-engine validate</code>
      </h3>
      <p>
        Checks the config file. It prints <code>Config is valid.</code>, or lists the problems and
        exits with status 1. It also checks that every <code>exclude</code> entry is a string or a
        RegExp, and that <code>includeDynamic</code> is <code>true</code>, <code>false</code> or an
        array of names. It takes <code>-c, --config &lt;path&gt;</code>.
      </p>

      <h2>Config file</h2>
      <p>
        The config file is optional. Without one, everything is detected. Wrap it in{' '}
        <code>defineConfig</code> to type-check it; the type is <code>CmdkEngineConfig</code>, which
        is not the provider&apos;s <code>CommandEngineConfig</code>.
      </p>
      <CodeBlock
        language="ts"
        filename="cmdk-engine.config.ts"
        code={`import { defineConfig } from 'cmdk-engine'

export default defineConfig({
  framework: 'react-router',
  routesDir: './src/routes',
  output: './src/generated/command-routes.json',
  overrides: {
    '/billing/overview': { keywords: ['money', 'payment'], group: 'Billing' },
  },
  exclude: ['/admin/*', '/internal'],
})`}
      />
      <ApiTable
        head={['Field', 'Description']}
        rows={[
          [
            'framework',
            <>
              <code>react-router</code>, <code>nextjs-app</code> or <code>nextjs-pages</code>.
              Detected when omitted.
            </>,
          ],
          ['routesDir', 'The directory to scan.'],
          ['output', 'Where to write the sitemap.'],
          [
            'overrides',
            <>
              Per-route changes, keyed by path. Only <code>label</code>, <code>keywords</code>{' '}
              (added to the route&apos;s own) and <code>group</code> are applied; other fields are
              ignored.
            </>,
          ],
          [
            'exclude',
            <>
              Routes to leave out, on top of the defaults. Each entry is an exact string, a glob or
              a RegExp. In a glob, <code>*</code> matches within one path segment and{' '}
              <code>**</code> across segments. Excluding a path also excludes the paths below it,
              and a trailing <code>/*</code> also matches the base: <code>/admin/*</code> excludes{' '}
              <code>/admin</code> and everything under it. <code>/admin*</code> also matches{' '}
              <code>/administration</code>.{' '}
            </>,
          ],
          [
            <>
              includeDynamic <Since />
            </>,
            <>
              <code>true</code>, <code>false</code> or an array of <code>:param</code> names. Keeps
              routes with those segments, such as everything under a Next.js <code>[locale]</code>{' '}
              folder: <code>[&apos;locale&apos;]</code> gives <code>/:locale/billing</code>.{' '}
              <code>true</code> keeps every <code>:param</code> route, and catch-all segments are
              never kept. Default <code>false</code>. The <code>--include-dynamic</code> flag
              overrides it. See Dynamic routes below.
            </>,
          ],
          [
            'synonyms',
            <>
              Checked by <code>validate</code> but not used by <code>scan</code>. Put synonyms in
              the provider&apos;s <code>config.synonyms</code>.
            </>,
          ],
        ]}
      />
      <p>
        A <code>.js</code>, <code>.mjs</code> or <code>.cjs</code> config is imported, so it runs,
        and a <code>.json</code> config is read as data. A <code>.ts</code> config is read without
        running it, so its values must be static: strings, numbers, booleans, arrays, objects,
        RegExp literals and top-level <code>const</code>s (and spreads of them), with{' '}
        <code>as const</code> and <code>satisfies</code> allowed. For computed values such as{' '}
        <code>process.env</code>, use <code>cmdk-engine.config.mjs</code>. A config the CLI cannot
        read fails <code>scan</code> and <code>validate</code> with exit status 1 and names the
        line.
      </p>

      <h2>Output</h2>
      <p>
        The sitemap lists the routes sorted by path, and each carries the file it came from. With
        the JSON format, a scan that finds the same routes as the file already on disk keeps that
        file&apos;s <code>generatedAt</code>, so a committed sitemap only changes when your routes
        do.
      </p>
      <CodeBlock
        language="json"
        filename="src/generated/command-routes.json"
        code={`{
  "version": 1,
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "framework": "react-router",
  "routes": [
    {
      "id": "billing--overview",
      "path": "/billing/overview",
      "label": "Billing Dashboard",
      "keywords": ["billing", "overview", "money", "payment"],
      "group": "Billing",
      "source": "src/routes/routes.tsx"
    },
    {
      "id": "settings--team",
      "path": "/settings/team",
      "label": "Team",
      "keywords": ["settings", "team", "people", "members"],
      "group": "Settings",
      "source": "src/routes/routes.tsx"
    }
  ]
}`}
      />

      <p>
        Ids keep letters, digits and <code>-</code>, so <code>/billing/overview</code> gives{' '}
        <code>billing--overview</code>. When two routes would share an id (<code>/a_b</code> and{' '}
        <code>/ab</code> both give <code>ab</code>), the scan keeps it for the last of them in path
        order, which keeps its frecency and Recent history, gives the others <code>ab-2</code>,{' '}
        <code>ab-3</code> and so on, and prints a warning for each.
      </p>

      <h2>Use the output</h2>
      <p>
        <code>sitemapToCommands</code> from <code>cmdk-engine/adapters/sitemap</code> turns the
        sitemap into commands. Register them once, at the app level:
      </p>
      <CodeBlock
        language="tsx"
        code={`import { useCommandRegister } from 'cmdk-engine/react'
import { sitemapToCommands } from 'cmdk-engine/adapters/sitemap'
import sitemap from './generated/command-routes.json'

const routeCommands = sitemapToCommands(sitemap)

function RouteCommands() {
  useCommandRegister(routeCommands)
  return null
}`}
      />
      <p>
        Each route becomes <code>{'{ id, label, keywords, group, href }'}</code>, and selecting one
        calls your <code>onNavigate</code>. Commit the JSON, or run the scan in a{' '}
        <code>prebuild</code> script. The adapter is described on the{' '}
        <Link href="/docs/adapters">Adapters</Link> page.
      </p>

      <h2>
        Dynamic routes and [locale] <Since />
      </h2>
      <p>
        A command needs a real URL, so the scan skips routes with a <code>:param</code> (
        <code>/users/:id</code>, <code>app/[id]/page.tsx</code>). To keep routes under a segment you
        can fill at runtime, such as a Next.js <code>[locale]</code> folder, name it in{' '}
        <code>includeDynamic</code> or pass <code>--include-dynamic locale</code>.{' '}
        <code>app/[locale]/billing/page.tsx</code> then becomes <code>/:locale/billing</code>, which{' '}
        <code>params</code> fills:
      </p>
      <CodeBlock language="bash" code={`npx cmdk-engine scan --include-dynamic locale`} />
      <CodeBlock
        language="tsx"
        code={`import { useMemo } from 'react'
import { useCommandRegister } from 'cmdk-engine/react'
import { sitemapToCommands } from 'cmdk-engine/adapters/sitemap'
import sitemap from './generated/command-routes.json'

export function LocaleRouteCommands({ locale }: { locale: string }) {
  const commands = useMemo(() => sitemapToCommands(sitemap, { params: { locale } }), [locale])
  useCommandRegister(commands)
  return null
}`}
      />
      <ul>
        <li>
          <code>params</code> values are inserted as given, and <code>&apos;&apos;</code> drops the
          segment (a default locale served without a prefix).
        </li>
        <li>
          Ids keep the placeholder (<code>locale--billing</code>), so frecency is shared across
          locales.
        </li>
        <li>
          <code>includeDynamic: true</code> keeps every <code>:param</code> route. A route whose
          param you do not fill is skipped, and catch-alls (<code>[...slug]</code>,{' '}
          <code>/docs/*</code>) are never kept.
        </li>
        <li>
          A React Router route with its own <code>handle.command</code> is kept, as with the runtime{' '}
          <code>scanRoutes</code>.
        </li>
      </ul>

      <h2>What the scan reads</h2>
      <p>The scan reads your files without running them.</p>
      <ul>
        <li>
          <strong>React Router:</strong> route objects with a string <code>path</code> (as passed to{' '}
          <code>createBrowserRouter</code>) and <code>{'<Route path="...">'}</code> elements, with
          the <code>label</code>, <code>keywords</code> and <code>group</code> of their own{' '}
          <code>handle.command</code>. Relative child paths are joined to their parent route in the
          same file (<code>children</code> arrays and nested <code>{'<Route>'}</code>s). It does not
          read paths built at runtime, routes imported from another file, index routes, or a{' '}
          <code>handle</code> returned by <code>lazy()</code>.
        </li>
        <li>
          <strong>Next.js:</strong> <code>app/**/page.*</code> (<code>nextjs-app</code>) and{' '}
          <code>pages/**</code> (<code>nextjs-pages</code>). Route groups and <code>@slot</code>{' '}
          folders add no segment. Private <code>_folders</code>, intercepting <code>(.)</code>{' '}
          routes and <code>api/</code> are skipped. <code>[[...slug]]</code> gives its parent&apos;s
          URL; other dynamic routes need <code>includeDynamic</code>.
        </li>
      </ul>

      <h2>Routes that are left out</h2>
      <p>
        The scanner skips routes that are almost never useful as commands. This is the same list the
        runtime <Link href="/docs/adapters">React Router adapter</Link> uses:
      </p>
      <ul>
        <li>
          <strong>Auth routes:</strong> <code>/login</code>, <code>/logout</code>,{' '}
          <code>/signin</code>, <code>/signout</code>, <code>/signup</code>, <code>/register</code>,{' '}
          <code>/forgot-password</code>, <code>/reset-password</code> and <code>/verify-email</code>
          .
        </li>
        <li>
          <strong>Callbacks:</strong> <code>/oauth/callback</code>, <code>/auth/callback</code> and{' '}
          <code>/callback</code>.
        </li>
        <li>
          <strong>Error pages:</strong> <code>/404</code>, <code>/500</code>, <code>/error</code>{' '}
          and <code>/not-found</code>.
        </li>
      </ul>
      <p>
        Pass <code>--no-default-exclude</code> to keep them, and use <code>exclude</code> in the
        config to choose your own.
      </p>

      <h2>In CI and on commit</h2>
      <p>
        Run the scan in CI and fail when the committed sitemap is out of date. Because a scan of
        unchanged routes leaves the file untouched, <code>git diff</code> is a reliable check:
      </p>
      <CodeBlock
        language="yaml"
        code={`- run: npx cmdk-engine validate
- run: npx cmdk-engine scan
- run: git diff --exit-code src/generated/command-routes.json`}
      />
      <p>
        To regenerate it on every commit with <a href="https://typicode.github.io/husky">husky</a>{' '}
        9, run <code>npx husky init</code>, then put this in <code>.husky/pre-commit</code>:
      </p>
      <CodeBlock
        language="bash"
        filename=".husky/pre-commit"
        code={`npx cmdk-engine scan && git add src/generated/command-routes.json`}
      />
      <p>
        With lint-staged, use a function task. A plain command string would get the staged file
        names appended, and <code>scan</code> takes no file arguments:
      </p>
      <CodeBlock
        language="js"
        filename="lint-staged.config.mjs"
        code={`export default {
  'src/routes/**/*.{ts,tsx}': () => [
    'npx cmdk-engine scan',
    'git add src/generated/command-routes.json',
  ],
}`}
      />
    </>
  )
}
