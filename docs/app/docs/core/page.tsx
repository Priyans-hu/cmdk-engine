import Link from 'next/link'
import { ApiTable } from '@/components/api-table'
import { CodeBlock } from '@/components/code-block'

export const metadata = { title: 'Core API' }

const c = (text: string) => <code>{text}</code>

export default function CoreAPI() {
  return (
    <>
      <h1>Core API</h1>
      <p>
        <code>cmdk-engine</code> is plain TypeScript with zero runtime dependencies. The React
        provider is built from the pieces on this page. Use them directly to drive another UI, in
        tests, or on the server. For the provider, hooks and the command object, see the{' '}
        <Link href="/docs/api">API Reference</Link>.
      </p>
      <CodeBlock
        language="ts"
        code={`import { createRegistry, createFuzzySearch } from 'cmdk-engine'

const registry = createRegistry()
const unregister = registry.register({ id: 'home', label: 'Home', href: '/' })

const results = createFuzzySearch().search('ho', registry.getAll())
// [{ item: { id: 'home', ... }, score: 0.95 }]

unregister() // remove the command again`}
      />

      <h2>
        <code>createRegistry()</code>
      </h2>
      <p>
        The command store. It is a small publish and subscribe store that works with React&apos;s{' '}
        <code>useSyncExternalStore</code>. Subscribers are notified once per microtask, however many
        changes happened.
      </p>
      <ApiTable
        head={['Method', 'Description']}
        rows={[
          [
            'register(command)',
            'Add a command, or replace the one with the same id. Returns a function that removes it.',
          ],
          ['registerMany(commands)', 'Add several. Returns a function that removes them all.'],
          [
            'update(id, partial)',
            'Merge fields into a command. The id cannot change. Does nothing for an unknown id.',
          ],
          ['unregister(id)', 'Remove a command.'],
          ['getAll()', 'The registered commands.'],
          ['getById(id)', 'One command, or undefined.'],
          ['getByGroup(groupId)', 'The commands whose group is groupId.'],
          [
            'subscribe(listener)',
            'Call listener after changes. Returns a function that unsubscribes.',
          ],
          ['getSnapshot()', 'A stable array that changes only when the commands change.'],
        ]}
      />

      <h2>
        <code>createFuzzySearch()</code>
      </h2>
      <p>
        The built-in search engine: an object with <code>search(query, items)</code> that returns{' '}
        <code>ScoredItem[]</code>. How it scores is on the <Link href="/docs/search">Search</Link>{' '}
        page, together with <code>createMatchSorterSearch</code> and how to write your own engine.
      </p>

      <h2>
        <code>createKeywordEngine(synonyms?, userAliases?)</code>
      </h2>
      <p>
        Synonym expansion and aliases. <code>synonyms</code> is a <code>SynonymMap</code>;{' '}
        <code>userAliases</code> is an optional <code>Map&lt;commandId, string[]&gt;</code>.
      </p>
      <CodeBlock
        language="ts"
        code={`import { createKeywordEngine } from 'cmdk-engine'

const keywords = createKeywordEngine({ billing: ['money', 'payment'] })
keywords.expandQuery('money') // ['money', 'billing']
keywords.expandQuery('billing') // ['billing', 'money', 'payment']`}
      />
      <ApiTable
        head={['Method', 'Description']}
        rows={[
          [
            'expandQuery(query)',
            'The query plus its synonyms. An empty query gives an empty array.',
          ],
          [
            'enrichItem(item), enrichAll(items)',
            'Copies of the commands with synonym-derived terms added, which the search engine weights lower than your own keywords.',
          ],
          [
            'addAlias(commandId, alias), removeAlias(commandId, alias)',
            'Add or remove a keyword for one command.',
          ],
          ['getAliases()', 'A copy of the alias map.'],
          ['setSynonyms(map)', 'Replace the synonym dictionary.'],
        ]}
      />
      <p>
        Inside React, the provider owns a keyword engine built from <code>config.synonyms</code>; it
        is reachable as <code>useEngineContext().keywords</code>. An alias added there shows up at
        the next results update. Adding one does not itself re-render anything.
      </p>

      <h2>Access control</h2>
      <ApiTable
        head={['Function', 'Description']}
        rows={[
          [
            'createAccessFilter(provider, mode?)',
            <>
              Returns <code>(items) =&gt; items</code> that removes commands the user may not see.{' '}
              <code>mode</code> is {c("'any'")} (the default) or {c("'all'")}; a command&apos;s own{' '}
              <code>accessMode</code> overrides it. Commands without <code>permissions</code> always
              pass.
            </>,
          ],
          [
            'createSimpleAccessProvider(permissions)',
            <>
              An <code>AccessControlProvider</code> from an array or a <code>Set</code> of
              permission strings. For dynamic permissions, write your own object with{' '}
              <code>hasPermission</code>, <code>hasAnyPermission</code> and{' '}
              <code>hasAllPermissions</code>.
            </>,
          ],
          [
            'isCommandVisible(item)',
            <>
              Resolves a command&apos;s <code>when</code> gate: true when there is none, or it
              resolves truthy.
            </>,
          ],
          [
            'filterVisible(items)',
            <>
              Removes commands whose <code>when</code> is false.
            </>,
          ],
        ]}
      />
      <p>This is a UI filter, not a security boundary. Enforce permissions on the server.</p>

      <h2>Frecency</h2>
      <h3>
        <code>createFrecencyEngine(options?)</code>
      </h3>
      <p>
        Ranks by frequency and recency. A command&apos;s score is{' '}
        <code>count * 2^(-daysSinceLastUse / halfLife)</code>, so ten uses yesterday beat a hundred
        a month ago.
      </p>
      <ApiTable
        head={['Option', 'Default', 'Description']}
        rows={[
          [
            'storage',
            'in memory',
            <>
              A <code>FrecencyStorage</code>. The React provider defaults to{' '}
              <code>localStorage</code> instead.
            </>,
          ],
          ['halfLife', '7 days', 'How fast old usage decays.'],
          [
            'maxAge',
            '30 days',
            <>
              Entries last used longer ago than this are removed by <code>cleanup()</code>.
            </>,
          ],
        ]}
      />
      <p>
        <code>FrecencyOptions</code> also has a <code>storageKey</code>, but only the provider reads
        it. In the core, pass <code>createLocalStorageFrecencyStorage(key)</code> as{' '}
        <code>storage</code>.
      </p>
      <ApiTable
        head={['Method', 'Description']}
        rows={[
          ['recordUsage(id)', 'Count one use now.'],
          ['getScore(id)', 'The decayed score, or 0 if the command was never used.'],
          ['getRecent(count = 5)', 'The most recently used ids, newest first.'],
          [
            'rank(items, weight = 0.3)',
            <>
              Blends each result&apos;s search score with its frecency, relative to the highest
              frecency in the list: <code>score * (1 - weight) + normalized * weight</code>.{' '}
              <code>weight</code> runs from 0 to 1. Returns the list sorted by the blended score.
            </>,
          ],
          ['cleanup()', 'Remove entries last used more than maxAge days ago.'],
          ['clear()', 'Remove all usage.'],
        ]}
      />
      <h3>Storage backends</h3>
      <ApiTable
        head={['Function', 'Description']}
        rows={[
          ['createInMemoryStorage()', 'Keeps usage in memory. Good for tests and SSR.'],
          [
            'createLocalStorageFrecencyStorage(storageKey = "cmdk-frecency")',
            'Keeps usage in localStorage under one full key (not a prefix). Where localStorage is unavailable it does nothing, and data it cannot read is ignored.',
          ],
        ]}
      />
      <p>
        A custom backend implements <code>FrecencyStorage</code>: <code>get(key)</code>,{' '}
        <code>set(key, entry)</code>, <code>getAll()</code>, <code>clear()</code> and, optionally,{' '}
        <code>delete(key)</code>.
      </p>

      <h2>
        <code>createGroupManager(groups?)</code>
      </h2>
      <p>
        Holds the group definitions and groups scored results under them. The rules are on{' '}
        <Link href="/docs/nested-commands">Nested Commands and Groups</Link>.
      </p>
      <ApiTable
        head={['Method', 'Description']}
        rows={[
          ['addGroup(group), removeGroup(id)', 'Add or replace a group, or remove one.'],
          [
            'getGroup(id), getAllGroups()',
            'Look up a group, or list all defined groups by priority.',
          ],
          [
            'groupResults(items, query?)',
            <>
              Group scored items. Returns <code>GroupedResult[]</code>: ordered by priority for an
              empty query, by best match while searching, with ungrouped items last.
            </>,
          ],
          ['extractGroups(commands)', 'The distinct groups that at least one command uses.'],
        ]}
      />

      <h2>
        <code>createContextEngine(boostWeight = 0.2)</code>
      </h2>
      <p>
        <code>boost(items, context)</code> adds <code>boostWeight</code> (capped at a score of 1) to
        each scored command whose <code>scope</code> matches the <code>CommandContext</code>.
        Commands without a scope are unchanged. The matching rules are under <code>context</code> in
        the <Link href="/docs/api">API Reference</Link>.
      </p>

      <h2>Search history</h2>
      <p>
        <code>createSearchHistory(config?)</code> keeps past queries in <code>localStorage</code>;{' '}
        <code>createInMemorySearchHistory(config?)</code> keeps them in memory. Both take a{' '}
        <code>SearchHistoryConfig</code> and return the same methods:
      </p>
      <ApiTable
        head={['Method', 'Description']}
        rows={[
          [
            'record(query, resultCount)',
            'Save a query. Repeats move to the front, queries shorter than minQueryLength are skipped, and only maxEntries are kept.',
          ],
          ['getRecent(count?)', 'Past queries, newest first.'],
          ['remove(query)', 'Forget one query.'],
          ['clear()', 'Forget all of them.'],
        ]}
      />

      <h2>Translations</h2>
      <p>
        <code>createDefaultTranslation()</code> returns the English <code>t</code> function: the
        string for a known key, or the key itself. <code>getTranslationKeys()</code> lists every
        key; the table is in the <Link href="/docs/api">API Reference</Link>.
      </p>

      <h2>Route helpers</h2>
      <p>
        The scanners use these to turn a path into a command. They are exported so your own scanner
        can match.
      </p>
      <ApiTable
        head={['Function', 'Example']}
        rows={[
          [
            'pathToId(path)',
            <>
              <code>/billing/overview</code> gives <code>billing--overview</code>, and{' '}
              <code>/</code> gives <code>home</code>
            </>,
          ],
          [
            'pathToLabel(path)',
            <>
              <code>/billing/overview</code> gives &quot;Overview&quot;, and <code>/</code> gives
              &quot;Home&quot;
            </>,
          ],
          [
            'pathToGroup(path)',
            <>
              <code>/billing/overview</code> gives &quot;Billing&quot;; a one-segment path gives
              undefined
            </>,
          ],
          [
            'pathSegmentToLabel(segment)',
            <>
              <code>user-settings</code> and <code>userSettings</code> give &quot;User
              Settings&quot;, and <code>APIKeys</code> gives &quot;API Keys&quot;
            </>,
          ],
        ]}
      />

      <h2>
        <code>defineConfig(config)</code>
      </h2>
      <p>
        Returns its argument, typed as <code>CmdkEngineConfig</code>, so your{' '}
        <code>cmdk-engine.config.ts</code> is type-checked. That is the CLI config, not the
        provider&apos;s <code>CommandEngineConfig</code>. See <Link href="/docs/cli">CLI</Link>.
      </p>
    </>
  )
}
