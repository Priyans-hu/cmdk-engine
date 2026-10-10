import Link from 'next/link'
import { ApiTable } from '@/components/api-table'
import { CodeBlock } from '@/components/code-block'
import { Since } from '@/components/since'

export const metadata = { title: 'API Reference' }

const c = (text: string) => <code>{text}</code>

export default function APIReference() {
  return (
    <>
      <h1>API Reference</h1>
      <p>
        Everything you pass to the provider and every hook, plus the command object. The
        framework-agnostic building blocks are on the <Link href="/docs/core">Core API</Link> page,
        and the UI and router adapters on <Link href="/docs/adapters">Adapters</Link>.
      </p>
      <ApiTable
        head={['Import', 'Contains']}
        rows={[
          ['cmdk-engine', 'The core engine and all types'],
          ['cmdk-engine/react', 'CommandEngineProvider and the hooks'],
          ['cmdk-engine/adapters/cmdk', 'CommandPalette and useCommandPaletteShortcut for cmdk'],
          ['cmdk-engine/adapters/base-ui', 'The same two exports for Base UI'],
          ['cmdk-engine/adapters/react-router', 'scanRoutes'],
          ['cmdk-engine/adapters/sitemap', 'sitemapToCommands'],
          ['cmdk-engine/search/match-sorter', 'createMatchSorterSearch'],
        ]}
      />

      <h2>CommandItem</h2>
      <p>
        A command. Register commands with <code>useCommandRegister</code>, or put them in{' '}
        <code>children</code> of another command. Only <code>id</code> and <code>label</code> are
        required.
      </p>
      <ApiTable
        head={['Field', 'Type', 'Description']}
        rows={[
          ['id', c('string'), 'Unique id. It is also the frecency key, so keep it stable.'],
          [
            'label',
            c('string'),
            'The text shown in the palette. Searched with the highest weight.',
          ],
          ['description', c('string'), 'Secondary text, also searched.'],
          ['icon', c('ReactNode'), 'A string, emoji or element shown before the label.'],
          ['keywords', c('string[]'), 'Extra search terms.'],
          ['group', c('string'), 'The heading to list the command under. Matches a groups id.'],
          [
            'priority',
            c('number'),
            'Higher first: breaks score ties, and orders the empty-query list.',
          ],
          [
            'href',
            c('string'),
            'Where to go when selected. Handled by onNavigate, or window.location.',
          ],
          ['action', c('(item) => void | Promise<void>'), 'Runs when selected. Wins over href.'],
          ['disabled', c('boolean'), 'Shown, but selecting it does nothing.'],
          ['hidden', c('boolean'), 'Left out of the empty-query list, but still found by a query.'],
          [
            'permissions',
            c('string[]'),
            'Permissions needed to see the command. See accessControl.',
          ],
          ['accessMode', c("'any' | 'all'"), 'Overrides accessCheckMode for this command.'],
          [
            'when',
            c('boolean | () => boolean'),
            'A visibility gate. When it is false the command is removed: not searchable, not browsable.',
          ],
          [
            'shortcut',
            c('string[]'),
            'Keys shown in the row, such as ["g", "h"]. Display only: nothing binds these keys.',
          ],
          ['meta', c('Record<string, unknown>'), 'Your own data. The engine passes it through.'],
          ['scope', c('string[]'), 'Paths or tags where the command ranks higher. See context.'],
          ['children', c('CommandItem[]'), 'Makes the command a sub-menu. See Nested Commands.'],
          [
            'parentId',
            c('string'),
            'Deprecated. Never set or read by the engine; kept so existing code compiles. Keep your own parent id in meta.',
          ],
        ]}
      />

      <h2>CommandEngineProvider</h2>
      <p>
        Initializes the engine and makes it available to every hook and adapter below it. It takes{' '}
        <code>children</code> and an optional <code>config</code> prop of type{' '}
        <code>CommandEngineConfig</code>. Every option is optional.
      </p>
      <ApiTable
        head={['Option', 'Type', 'Default', 'Description']}
        rows={[
          [
            'searchEngine',
            c('SearchEngine'),
            'built-in fuzzy search',
            <>
              See <Link href="/docs/search">Search</Link>.
            </>,
          ],
          [
            'accessControl',
            c('AccessControlProvider'),
            'none',
            <>
              Decides which commands the user may see, from each command&apos;s{' '}
              <code>permissions</code>. Build one with{' '}
              <code>createSimpleAccessProvider([...])</code>. This is a UI filter, not a security
              boundary: enforce permissions on the server.
            </>,
          ],
          [
            'accessCheckMode',
            c("'any' | 'all'"),
            c("'any'"),
            "Whether a user needs any or all of a command's permissions.",
          ],
          [
            'synonyms',
            c('SynonymMap'),
            'none',
            <>
              A dictionary such as <code>{"{ billing: ['money', 'payment'] }"}</code>, used both
              ways. See <Link href="/docs/search">Search</Link>.
            </>,
          ],
          [
            'frecency',
            c('FrecencyOptions & RecentCommandsConfig & { enabled?: boolean }'),
            'on',
            'Usage-based ranking and the Recent group. Set enabled: false to turn it off. Options below.',
          ],
          [
            'groups',
            c('CommandGroup[]'),
            'none',
            <>
              Labels and order for headings. See{' '}
              <Link href="/docs/nested-commands">Nested Commands and Groups</Link>.
            </>,
          ],
          ['maxResults', c('number'), c('50'), 'The most results to return, across groups.'],
          [
            'onSelect',
            c('(item) => void'),
            'none',
            <>
              Runs for every selected command <strong>instead of</strong> its <code>action</code>{' '}
              and instead of <code>onNavigate</code>. See the precedence below.
            </>,
          ],
          [
            'onNavigate',
            c('(href, item) => void'),
            c('window.location.href = href'),
            <>
              Runs for a selected command that has an <code>href</code> and no <code>action</code>.
              Pass your router here to navigate without a reload.{' '}
            </>,
          ],
          [
            <>
              onSelectError <Since />
            </>,
            c('(error: unknown, item: CommandItem) => void'),
            'none',
            <>
              Called when the handler a selection runs (<code>onSelect</code>, <code>action</code>{' '}
              or <code>onNavigate</code>) throws or returns a rejected promise. The palette still
              closes. Without it, a throw propagates and a rejection stays unhandled. Async source
              failures go to <code>asyncErrors</code> instead.
            </>,
          ],
          [
            'context',
            c('CommandContext'),
            'none',
            <>
              The current location, <code>{'{ path?, tags? }'}</code>, for scope boosting.
            </>,
          ],
          [
            'contextBoostWeight',
            c('number'),
            c('0.2'),
            'How much to boost commands in scope, from 0 to 1.',
          ],
          [
            't',
            c('(key, params?) => string'),
            'English',
            'Translates the built-in UI strings. See the i18n keys below.',
          ],
          [
            'locale',
            c('string'),
            'none',
            'Deprecated. Never read: nothing in cmdk-engine depends on the locale. Kept so existing configs compile. Localize UI strings with t.',
          ],
          [
            'searchHistory',
            c('SearchHistoryConfig'),
            'off',
            'Records past queries. Options below.',
          ],
          [
            <>
              asyncSources <Since />
            </>,
            c('AsyncSource[]'),
            'none',
            'Commands loaded for each query, such as a server-side search. Details below.',
          ],
        ]}
      />
      <p>
        <strong>Keep the config stable.</strong> The engines are rebuilt whenever one of{' '}
        <code>searchEngine</code>, <code>accessControl</code>, <code>accessCheckMode</code>,{' '}
        <code>synonyms</code>, <code>frecency</code>, <code>groups</code>,{' '}
        <code>contextBoostWeight</code>, <code>t</code> or <code>searchHistory</code> changes
        identity. Define the config once at module scope, or <code>useMemo</code> it, instead of
        writing an inline object in a component that re-renders. Callbacks, <code>maxResults</code>,{' '}
        <code>context</code> and <code>asyncSources</code> are read live, so they can be inline.
      </p>

      <h3>
        <code>frecency</code>
      </h3>
      <p>
        Commands you use often and recently rank higher. Usage is saved to <code>localStorage</code>{' '}
        and falls back to memory where it is unavailable: during SSR, in sandboxed iframes, when the
        browser blocks cookies, or when <code>window.localStorage</code> is <code>null</code> or
        rejects writes.
      </p>
      <ApiTable
        head={['Option', 'Default', 'Description']}
        rows={[
          [
            <>
              enabled <Since />
            </>,
            c('true'),
            'false turns frecency off: nothing is stored or read, results are not ranked by past use, and no Recent group shows, even with showRecent.',
          ],
          [
            'storage',
            c('localStorage'),
            'A custom FrecencyStorage backend. The provider defaults to localStorage, and to memory where it is unavailable.',
          ],
          [
            'storageKey',
            c("'cmdk-frecency'"),
            "The full localStorage key, not a prefix. Every app on the origin shares the default, so namespace it per user if several people sign in on one browser. Only the provider's default storage uses it.",
          ],
          [
            'halfLife',
            '7 days',
            'How fast old usage decays: a use counts half as much after this long.',
          ],
          [
            'maxAge',
            '30 days',
            'Days after its last use before an entry leaves Recent. It is removed from storage on the next recorded use.',
          ],
          [
            'showRecent',
            c('false'),
            'Show a Recent group when the search box is empty. It comes first, above any groups you configured.',
          ],
          [
            'recentCount',
            c('5'),
            'How many recent commands to show: the most recently used ones that are available on the current page.',
          ],
          [
            'recentLabel',
            c('"Recent"'),
            'The heading of the Recent group (the group.recent translation key).',
          ],
        ]}
      />
      <CodeBlock
        language="tsx"
        code={`const config = {
  frecency: {
    showRecent: true,
    recentCount: 5,
    recentLabel: 'Recent',
  },
}`}
      />
      <p>
        To turn frecency off, set <code>enabled: false</code>:
      </p>
      <CodeBlock language="tsx" code={`const config = { frecency: { enabled: false } }`} />

      <h3>
        <code>searchHistory</code>
      </h3>
      <p>
        Off by default. When enabled, a query is recorded when the user selects a command, and kept
        in <code>localStorage</code>. Read it with <code>useSearchHistory()</code>.
      </p>
      <ApiTable
        head={['Option', 'Default', 'Description']}
        rows={[
          ['enabled', c('false'), 'Turn recording on.'],
          ['maxEntries', c('20'), 'How many queries to keep.'],
          ['minQueryLength', c('2'), 'Shorter queries are not recorded.'],
          ['storageKey', c("'cmdk-search-history'"), 'The full localStorage key, not a prefix.'],
        ]}
      />

      <h3>
        <code>context</code>
      </h3>
      <p>
        A command with a <code>scope</code> is boosted while searching when the scope matches the
        context. A scope entry matches the context <code>path</code> when it equals it or is a
        parent of it (<code>/billing</code> matches <code>/billing/overview</code>), or when a glob
        such as <code>/billing/*</code> covers it (below <code>/billing</code>, not{' '}
        <code>/billing</code> itself). It matches the context <code>tags</code> when it equals one
        of them.
      </p>

      <h3>
        <code>asyncSources</code> <Since />
      </h3>
      <p>
        Commands loaded for each query, such as a server-side search. The provider loads every
        source once per query for all consumers, at the root level only: it debounces, aborts stale
        requests on query change, close, drill-down and unmount, and reports failures per source in{' '}
        <code>asyncErrors</code>. A failing source never breaks the palette.
      </p>
      <CodeBlock
        language="tsx"
        code={`import type { AsyncSource } from 'cmdk-engine'

const issueSearch: AsyncSource = {
  id: 'issues',
  load: async (query, { signal }) => {
    const res = await fetch(\`/api/issues?q=\${encodeURIComponent(query)}\`, { signal })
    const issues: { id: string; title: string }[] = await res.json()
    return issues.map((issue) => ({
      id: \`issue-\${issue.id}\`,
      label: issue.title,
      href: \`/issues/\${issue.id}\`,
    }))
  },
  shouldFilter: false, // the server already matched the query
  group: 'Issues',
}

export const config = { asyncSources: [issueSearch] }`}
      />
      <ApiTable
        head={['Option', 'Default', 'Description']}
        rows={[
          ['id', 'required', 'Keys asyncErrors. Changing the set of ids restarts loading.'],
          [
            'load(query, { signal })',
            'required',
            'Returns the items. Pass signal to fetch so stale requests are cancelled.',
          ],
          ['trigger(query)', 'non-empty trimmed query', 'Whether to load for this query.'],
          ['debounceMs', c('200'), 'Delay after the last query change.'],
          [
            'shouldFilter',
            c('true'),
            'true: items are searched and ranked with your commands and count toward maxResults. false: the server matched them, so they are shown as returned, after the local results.',
          ],
          [
            'maxResults',
            c('10'),
            'The most items shown from this source when shouldFilter is false.',
          ],
          ['group', "each item's group", 'A group for every item from this source.'],
        ]}
      />
      <ul>
        <li>
          <code>isLoading</code> is true from the moment a trigger passes (debounce included) until
          every source settles. The adapters show a <code>palette.loading</code> row meanwhile;
          override it with <code>renderLoading</code>.
        </li>
        <li>
          <code>asyncErrors</code> maps a source id to its last error, cleared on that source&apos;s
          next success.
        </li>
        <li>
          Loaded items need a non-empty string <code>id</code> and <code>label</code>. Items without
          them (children included) are dropped, the rest still show, and{' '}
          <code>asyncErrors[id]</code> says so, for example &quot;2 items dropped: missing
          label&quot;. A numeric <code>id</code> counts as a missing id. Other fields are checked
          too: non-string <code>keywords</code> entries are removed; an object <code>icon</code>,{' '}
          <code>description</code> or <code>group</code> that is not a React element is removed;{' '}
          <code>shortcut</code> and <code>scope</code> keep only their string entries; and an item
          whose <code>children</code> is not an array becomes a plain item. <code>permissions</code>{' '}
          follow the rules for registered commands: null, undefined and an empty string mean no
          restriction, a string is one permission, array entries become strings, and any other value
          hides the item.
        </li>
        <li>
          <code>when</code>, permissions and <code>hidden</code> apply to loaded items too.
          Unfiltered items skip search, frecency, the context boost and <code>maxResults</code>, and
          their groups come after the local groups, in server order.
        </li>
        <li>
          Registered commands win on duplicate ids, then earlier sources. Loaded items are never
          recorded in frecency.
        </li>
        <li>
          <code>load</code>, <code>trigger</code> and <code>debounceMs</code> are read when needed,
          so an inline config does not restart loads. <code>trigger</code> runs during render (twice
          under StrictMode in development), so keep it pure and cheap. A trigger that passes on an
          empty query loads as soon as the provider mounts, even for a palette that has never been
          opened.
        </li>
      </ul>
      <p>
        <strong>Loaded items are untrusted.</strong> Only relative, <code>http(s):</code>,{' '}
        <code>mailto:</code> and <code>tel:</code> hrefs are kept; any other <code>href</code> is
        removed when the items arrive, children included, so it never reaches{' '}
        <code>window.location</code> or a custom <code>renderItem</code> anchor. For deep links such
        as <code>myapp://...</code>, return an <code>action</code>, or an allowed <code>href</code>{' '}
        that your <code>onNavigate</code> maps. Only <code>href</code> is filtered, so render labels
        and descriptions as text, never as HTML.
      </p>

      <h2>Selecting a command</h2>
      <p>
        <code>select(item)</code>, which the adapters call for you, does this in order:
      </p>
      <ol>
        <li>
          If the command has <code>children</code>, open them and stop. Nothing else runs, and it is
          not reported as a selection.
        </li>
        <li>
          Record frecency (not for loaded items), and the query in search history if it is enabled.
        </li>
        <li>
          Run one handler: the <code>onSelect</code> passed to <code>CommandPalette</code> or to{' '}
          <code>select()</code>; else <code>config.onSelect</code>; else the command&apos;s{' '}
          <code>action</code>; else <code>onNavigate(href, item)</code>, or{' '}
          <code>window.location.href = href</code> without one.
        </li>
        <li>Close the palette and clear the query.</li>
      </ol>
      <p>
        If a handler throws, or returns a rejected promise (an async <code>action</code>, say), the
        error goes to <code>onSelectError(error, item)</code> when you set it. The palette closes
        right away and does not wait for an async handler. Without <code>onSelectError</code>, a
        throw propagates and a rejection stays unhandled, as before.
      </p>
      <CodeBlock
        language="tsx"
        code={`import type { CommandItem } from 'cmdk-engine'

const config = {
  onSelectError: (error: unknown, item: CommandItem) => {
    console.error(item.label, 'failed', error) // or show a toast
  },
}`}
      />
      <p>
        Because <code>config.onSelect</code> replaces the default handling, adding one for analytics
        silently stops every <code>action</code> and <code>href</code> from running. To track
        selections without replacing anything, use <code>useCommandPaletteEvents</code> below. If
        you do want one handler for everything, call the default yourself:
      </p>
      <CodeBlock
        language="tsx"
        code={`import type { CommandItem } from 'cmdk-engine'

const config = {
  onSelect: (item: CommandItem) => {
    console.log('command selected', item.id) // your analytics call
    if (item.action) item.action(item)
    else if (item.href) window.location.assign(item.href)
  },
}`}
      />

      <h2>Hooks</h2>
      <p>
        All hooks must be called in a component under <code>CommandEngineProvider</code>, and not in
        the component that renders it.
      </p>

      <h3>
        <code>useCommandPalette()</code>
      </h3>
      <p>The main hook: the current results and the controls to drive a palette.</p>
      <ApiTable
        head={['Member', 'Type', 'Description']}
        rows={[
          ['search', c('string'), 'The current query.'],
          ['setSearch', c('(query: string) => void'), 'Update the query.'],
          [
            'results',
            c('ScoredItem[]'),
            'The filtered, ranked results, capped by maxResults, with loaded items appended.',
          ],
          ['flatResults', c('ScoredItem[]'), 'The same array as results. An alias; use results.'],
          [
            'groupedResults',
            c('GroupedResult[]'),
            'The results as { group, items }, in display order.',
          ],
          ['groups', c('CommandGroup[]'), 'The groups that have results.'],
          ['isOpen', c('boolean'), 'Whether the palette is open.'],
          ['isLoading', c('boolean'), 'True while an async source is loading.'],
          [
            'asyncErrors',
            c('Record<string, Error>'),
            'The last error per async source id, including dropped-item notices.',
          ],
          ['breadcrumbs', c('CommandItem[]'), 'The sub-menu path.'],
          ['depth', c('number'), '0 at the root.'],
          [
            'open, close, toggle',
            c('() => void'),
            'Open, close or toggle. close also clears the query and returns to the root.',
          ],
          [
            'select',
            c('(itemOrId, options?) => void'),
            'Select a command, as described above. options.onSelect takes priority over config.onSelect.',
          ],
          ['recordUsage', c('(commandId: string) => void'), 'Record frecency yourself.'],
          [
            'drillDown, drillUp, resetPath',
            c('(item) => void, () => void, () => void'),
            'Move through nested commands.',
          ],
        ]}
      />

      <h3>
        <code>useCommandRegister(commands, deps?)</code>
      </h3>
      <p>
        Registers commands while the component is mounted, and removes them when it unmounts.
        Register app-wide navigation in a layout that stays mounted, and page commands in the page.
      </p>
      <ul>
        <li>
          Without <code>deps</code>, it re-registers whenever a registered field changes: ids, text,
          hrefs, groups, priority, disabled, hidden, keywords, permissions, access mode, shortcut,
          scope, text icons, children, or the result of <code>when</code>, which is evaluated on
          each render, so keep it pure. An <code>action</code> always calls the latest closure, so
          it never goes stale.
        </li>
        <li>
          Element icons and <code>meta</code> are not compared: pass <code>deps</code> when they
          change. Pass <code>deps</code>, such as <code>{'[flags.beta]'}</code>, to take control of
          when it re-registers.
        </li>
      </ul>
      <CodeBlock
        language="tsx"
        code={`import { useCommandRegister } from 'cmdk-engine/react'

function SettingsCommands({ plan }: { plan: string }) {
  // when is evaluated on each render, so the command appears and disappears with plan
  useCommandRegister([{ id: 'sso', label: 'SSO Settings', when: () => plan === 'enterprise' }])
  return null
}`}
      />

      <h3>
        <code>useFrecency()</code>
      </h3>
      <p>
        Direct access to the frecency engine: <code>recordUsage(id)</code>,{' '}
        <code>getScore(id)</code>, <code>getRecent(count?)</code> and <code>clear()</code>.
      </p>
      <h3>
        <code>useSearchHistory()</code>
      </h3>
      <p>
        <code>getRecent(count?)</code>, <code>remove(query)</code> and <code>clear()</code>. Needs{' '}
        <code>searchHistory.enabled</code> to have anything to read.
      </p>
      <h3>
        <code>useCommandContext()</code>
      </h3>
      <p>
        Returns <code>{'{ context, boostWeight }'}</code>, read-only. To change the context, pass a
        new <code>config.context</code> to the provider.
      </p>
      <h3>
        <code>useEngineContext(caller?)</code>
      </h3>
      <p>
        The engine singletons, for custom UIs and advanced use: <code>registry</code>,{' '}
        <code>search</code>, <code>keywords</code>, <code>accessFilter</code>, <code>frecency</code>
        , <code>groupManager</code>, <code>contextEngine</code>, <code>searchHistory</code>,{' '}
        <code>t</code> and the current <code>config</code>. For example,{' '}
        <code>registry.registerMany(commands)</code> registers commands outside a component. It
        throws outside the provider. The optional <code>caller</code> is the name the error message
        shows; the built-in hooks pass their own.
      </p>
      <h3>
        <code>usePaletteState(caller?)</code>
      </h3>
      <p>
        The shared UI state, which every palette and shortcut under the provider reads and writes:{' '}
        <code>isOpen</code>, <code>setIsOpen</code>, <code>search</code>, <code>setSearch</code>,{' '}
        <code>activePath</code> and <code>setActivePath</code>. It takes the same optional{' '}
        <code>caller</code> as <code>useEngineContext</code>. It is the light way to open the
        palette from your own button, without running the results pipeline:
      </p>
      <CodeBlock
        language="tsx"
        code={`import { usePaletteState } from 'cmdk-engine/react'

function OpenPaletteButton() {
  const { setIsOpen } = usePaletteState()
  return <button onClick={() => setIsOpen(true)}>Search</button>
}`}
      />

      <h3>
        <code>useCommandPaletteEvents(onEvent)</code> <Since />
      </h3>
      <p>
        Reports what happens in the palette, for analytics, without any telemetry in the package.
        Call it once, in any component inside the provider. Without it, nothing is reported. The
        latest <code>onEvent</code> is always called, so it can be an inline function. An error it
        throws never breaks the palette: it is rethrown on a timer, where it reaches the console and
        error trackers.
      </p>
      <CodeBlock
        language="tsx"
        code={`import { useCommandPaletteEvents } from 'cmdk-engine/react'

function PaletteAnalytics() {
  useCommandPaletteEvents((event) => {
    if (event.type === 'search' && event.resultCount === 0) {
      console.log('no results for', event.query) // your analytics call
    }
  })
  return null
}`}
      />
      <ApiTable
        head={['Event', 'When', 'Fields']}
        rows={[
          ['open', 'The palette opens.', 'none'],
          ['close', 'The palette closes.', 'none'],
          [
            'search',
            'The results for a query settle: every async source it triggered has loaded or failed.',
            <>
              <code>query</code> (trimmed, never empty), <code>resultCount</code> (<code>0</code>:
              nothing found)
            </>,
          ],
          [
            'select',
            'A command is selected. Opening a sub-menu is not a selection.',
            <>
              <code>item</code>, <code>query</code>, <code>sourceId</code> (the async source of a
              loaded item)
            </>,
          ],
          [
            'asyncError',
            'An async source fails or drops items.',
            <>
              <code>sourceId</code>, <code>error</code>
            </>,
          ],
        ]}
      />
      <p>
        <code>search</code> fires for every settled query while the user types, so debounce it
        before sending it anywhere. New event types may be added in minor releases, so ignore types
        you do not know. The events are typed as <code>CommandPaletteEvent</code>, exported from{' '}
        <code>cmdk-engine</code>.
      </p>

      <h2>Translations</h2>
      <p>
        The built-in UI strings go through <code>config.t(key, params?)</code>. Pass your own to
        localize them. <code>getTranslationKeys()</code> lists every key:
      </p>
      <ApiTable
        head={['Key', 'Default', 'Used for']}
        rows={[
          ['palette.label', 'Command palette', 'The accessible name of the palette and dialog.'],
          ['palette.placeholder', 'Type a command or search...', 'The input placeholder.'],
          ['palette.empty', 'No results found.', 'The empty state.'],
          ['palette.loading', 'Loading...', 'The loading row while async sources load.'],
          [
            'palette.list',
            'Suggestions',
            'The accessible name of the results list, in both adapters.',
          ],
          ['palette.close', 'Close', 'The visually hidden close button of the Base UI dialog.'],
          ['breadcrumbs.back', 'Go back', 'The back button in a sub-menu.'],
          ['group.recent', 'Recent', 'The Recent group heading.'],
          [
            'group.other',
            'Other',
            'For your own UI. The built-in palettes do not show it; the ungrouped heading is always Other.',
          ],
          [
            'search.history',
            'Recent Searches',
            'For your own UI. The built-in palettes do not show it.',
          ],
        ]}
      />
      <p>
        A <code>t</code> that returns the key for a key it does not know shows that key as the text,
        so give every key you use a string. The one exception is <code>palette.list</code>: if{' '}
        <code>t</code> returns its key unchanged (the <code>dictionary[key] ?? key</code> pattern)
        or an empty string, the list keeps its default name, &quot;Suggestions&quot;.
      </p>

      <h2>Types</h2>
      <p>
        All types are exported from <code>cmdk-engine</code>. Two names are easy to confuse:{' '}
        <code>CommandEngineConfig</code> is the provider&apos;s <code>config</code> prop, and{' '}
        <code>CmdkEngineConfig</code> is the CLI config file (<code>cmdk-engine.config.ts</code>).
      </p>
      <CodeBlock
        language="ts"
        code={`import type {
  CommandItem,
  CommandRegistry,
  CommandGroup,
  CommandContext,
  CommandPaletteState,
  CommandPaletteEvent,
  CommandEngineConfig, // the provider's config prop
  CmdkEngineConfig, // the CLI config file
  SearchEngine,
  ScoredItem,
  GroupedResult,
  GroupedResults,
  AccessControlProvider,
  AccessCheckMode,
  AsyncSource,
  FrecencyOptions,
  FrecencyEntry,
  FrecencyStorage,
  RecentCommandsConfig,
  SearchHistoryConfig,
  SearchHistoryEntry,
  SynonymMap,
  TranslationFn,
  RouteCommandMeta,
  Sitemap,
  SitemapRoute,
} from 'cmdk-engine'`}
      />
    </>
  )
}
