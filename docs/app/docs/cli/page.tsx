import Link from 'next/link'
import { ApiTable } from '@/components/api-table'
import { CodeBlock } from '@/components/code-block'

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
              Source files, for route objects and <code>&lt;Route&gt;</code> elements with a{' '}
              <code>path</code> string, and their <code>handle.command</code> metadata.
            </>,
            <>
              <code>src/routes</code> if it exists, otherwise <code>src</code>
            </>,
          ],
          [
            'nextjs-app',
            <>
              Each <code>page</code> file under the App Router. Route groups such as{' '}
              <code>(auth)</code> are not part of the path, and dynamic segments such as{' '}
              <code>[id]</code> are skipped.
            </>,
            <>
              <code>src/app</code> if it exists, otherwise <code>app</code>
            </>,
          ],
          [
            'nextjs-pages',
            <>
              Each file under the Pages Router, except files that start with <code>_</code> (such as{' '}
              <code>_app</code>) and the top-level <code>api/</code> directory. Dynamic segments are
              skipped.
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
          ['--allow-empty', 'off', 'Write the sitemap even when no routes are found.'],
          ['--no-default-exclude', 'off', 'Keep the routes that are normally left out (below).'],
        ]}
      />
      <h3>
        <code>cmdk-engine validate</code>
      </h3>
      <p>
        Checks the config file. It prints <code>Config is valid.</code>, or lists the problems and
        exits with status 1. It takes <code>-c, --config &lt;path&gt;</code>.
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
              Routes to leave out, on top of the defaults. Each entry is an exact string or a glob
              ending in <code>/*</code>.
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
        A <code>.js</code>, <code>.mjs</code> or <code>.cjs</code> config is imported, so it runs. A{' '}
        <code>.ts</code> or <code>.json</code> config is read as data and never run.
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
