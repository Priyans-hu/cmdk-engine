import { CodeBlock } from '@/components/code-block'

export const metadata = { title: 'API Reference' }

export default function APIReference() {
  return (
    <>
      <h1>API Reference</h1>
      <p>Complete API reference for all cmdk-engine exports.</p>

      <h2>Core (<code>cmdk-engine</code>)</h2>

      <h3><code>createRegistry()</code></h3>
      <p>Creates a command registry — the central store for all commands. Compatible with React&apos;s <code>useSyncExternalStore</code>.</p>
      <CodeBlock
        language="tsx"
        code={`const registry = createRegistry()
const unregister = registry.register({ id: 'cmd', label: 'My Command' })
const all = registry.getAll()
unregister() // cleanup`}
      />

      <h3><code>createFuzzySearch()</code></h3>
      <p>Built-in lightweight fuzzy search engine. Scores by exact match, prefix, substring, word boundary, and character matching. Under 1 kB minified + brotli.</p>

      <h3><code>createKeywordEngine(synonyms, userAliases?)</code></h3>
      <p>Creates a keyword engine with bidirectional synonym lookup.</p>
      <CodeBlock
        language="tsx"
        code={`const keywords = createKeywordEngine({
  billing: ['money', 'payment'],
})
const expanded = keywords.expandQuery('money')
// ['money', 'billing']`}
      />

      <h3><code>createAccessFilter(provider, mode?)</code></h3>
      <p>Creates a filter function that removes commands the user doesn&apos;t have permission to see. Supports <code>&quot;any&quot;</code> (user needs any listed permission) and <code>&quot;all&quot;</code> (user needs every listed permission) modes.</p>

      <h3><code>createSimpleAccessProvider(permissions)</code></h3>
      <p>Creates an access control provider from an array or Set of permission strings.</p>

      <h3><code>createFrecencyEngine(options?)</code></h3>
      <p>Creates a frecency ranking engine with exponential decay.</p>

      <div className="not-prose overflow-x-auto rounded-xl border border-[var(--border)] my-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-secondary)]">
              <th className="text-left px-4 py-3 font-semibold">Option</th>
              <th className="text-left px-4 py-3 font-semibold">Default</th>
              <th className="text-left px-4 py-3 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            <tr>
              <td className="px-4 py-3 font-mono text-xs">halfLife</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">7 days</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">Half-life for exponential decay</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-mono text-xs">maxAge</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">30 days</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">Max age before cleanup</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-mono text-xs">storage</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">localStorage</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">Custom storage backend</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3><code>createGroupManager(groups?)</code></h3>
      <p>Manages command groups and their priority ordering.</p>

      <h3><code>defineConfig(config)</code></h3>
      <p>Helper function for type-checked CLI config files.</p>

      <h2>React (<code>cmdk-engine/react</code>)</h2>

      <h3><code>&lt;CommandEngineProvider&gt;</code></h3>
      <p>Context provider that initializes the engine. Accepts a <code>config</code> prop with synonyms, access control, and engine options.</p>

      <h3><code>useCommandPalette()</code></h3>
      <p>Main hook returning the full palette state.</p>
      <CodeBlock
        language="tsx"
        code={`const {
  search,          // Current query string
  setSearch,       // Update query
  results,         // ScoredItem[] (filtered, ranked)
  flatResults,     // Same as results (flat list)
  groupedResults,  // GroupedResult[] — results grouped by group
  groups,          // Active CommandGroup[]
  isOpen,          // Palette visibility
  isLoading,       // True while an async source is loading
  asyncErrors,     // Record<sourceId, Error> — last error per async source
  open, close, toggle,
  select,          // Select command (frecency + handler + close)
  recordUsage,     // Record command selection manually
} = useCommandPalette()`}
      />

      <h3><code>useCommandRegister(commands, deps?)</code></h3>
      <p>Register commands from a component. Auto-cleans up on unmount. Pass a dependency array to re-register when data changes.</p>

      <h3><code>useFrecency()</code></h3>
      <p>Direct access to frecency engine: <code>recordUsage</code>, <code>getScore</code>, <code>getRecent</code>, <code>clear</code>.</p>

      <h2>Adapters</h2>

      <h3><code>CommandPalette</code> (<code>cmdk-engine/adapters/cmdk</code>)</h3>
      <p>Pre-wired cmdk component. Sets <code>shouldFilter={'{false}'}</code> automatically so cmdk-engine owns all filtering and ranking.</p>

      <h3><code>CommandPalette</code> (<code>cmdk-engine/adapters/base-ui</code>)</h3>
      <p>The same component and <code>useCommandPaletteShortcut</code> built on Base UI&apos;s Autocomplete (with <code>mode=&quot;none&quot;</code>, so cmdk-engine still owns filtering and ranking) and, with <code>dialog</code>, its Dialog. Install the optional peer <code>@base-ui/react</code> (<code>^1.1.0</code>). It takes the cmdk adapter&apos;s props except <code>vimBindings</code>, and its default markup uses the same <code>data-cmdk-engine-*</code> attributes, so switching is an import-path change.</p>
      <CodeBlock
        language="tsx"
        code={`import { CommandPalette, useCommandPaletteShortcut } from 'cmdk-engine/adapters/base-ui'

function CommandMenu() {
  useCommandPaletteShortcut() // Cmd+K / Ctrl+K
  return <CommandPalette dialog overlayClassName="backdrop" contentClassName="palette" />
}`}
      />
      <p>Differences from the cmdk adapter: no vim keys; Home and End move the caret; disabled items stay reachable by the arrow keys (Enter and click do nothing); the highlighted item has <code>data-highlighted</code>; the loading row is a <code>role=&quot;status&quot;</code> region after the list; when results change while open (async sources), the highlight keeps its position rather than its item; with an IME the query updates when composition ends. Give your app root <code>isolation: isolate</code> and, for iOS 26+ Safari, a <code>position: absolute</code> backdrop plus <code>body {'{ position: relative }'}</code>, as the <a href="https://base-ui.com/react/overview/quick-start">Base UI quick start</a> explains. The dialog&apos;s visually hidden close button is labelled by the <code>palette.close</code> translation key. Base UI costs about 48 kB min + brotli (Autocomplete and Dialog) versus about 14 kB for cmdk with its Radix dialog.</p>

      <h3><code>scanRoutes(routes, options?)</code> (<code>cmdk-engine/adapters/react-router</code>)</h3>
      <p>Scan a React Router route tree and extract CommandItem objects. Reads <code>handle.command</code> metadata from route definitions.</p>
      <CodeBlock
        language="tsx"
        code={`const commands = scanRoutes(routeConfig, {
  exclude: ['/admin/*', /^\\/debug\\//, '/internal'],
  noDefaultExclude: false,  // skip default auth/error exclusion
  includeDynamic: false,    // include :id routes
})`}
      />
      <p>By default, the scanner excludes auth routes (<code>/login</code>, <code>/signup</code>, etc.), error pages (<code>/404</code>, <code>/500</code>), and dynamic routes (<code>:id</code> segments). Exclude patterns support exact strings, globs (<code>/admin/*</code>), and RegExp.</p>

      <h2>Provider Config</h2>

      <h3><code>onSelect</code></h3>
      <p>Centralized handler called when any command is selected. Replaces per-component <code>onSelect</code> props. It also replaces the default handling: commands no longer run their <code>action</code> or reach <code>onNavigate</code> on their own. If you only need to route <code>href</code> commands, set <code>onNavigate</code> instead.</p>
      <CodeBlock
        language="tsx"
        code={`// router is your React Router data router (createBrowserRouter)
<CommandEngineProvider config={{
  onSelect: (item) => {
    if (item.action) item.action(item)
    else if (item.href) router.navigate(item.href)
  },
}}>`}
      />

      <h3><code>frecency.showRecent</code></h3>
      <p>Show a &quot;Recent&quot; group at the top when search is empty.</p>
      <CodeBlock
        language="tsx"
        code={`<CommandEngineProvider config={{
  frecency: {
    showRecent: true,
    recentCount: 5,
    recentLabel: 'Recent',
  },
}}>`}
      />

      <h3><code>asyncSources</code></h3>
      <p>Commands loaded for each query, such as a server-side search. The provider loads every source once per query for all consumers, at the root level only: it debounces (<code>debounceMs</code>, default 200), aborts stale requests on query change, close, drill-down and unmount, and reports failures per source in <code>asyncErrors</code>. <code>trigger(query)</code> decides whether to load (default: a non-empty query). It runs during render (twice under StrictMode in development), so keep it pure and cheap; a trigger that passes on an empty query loads as soon as the provider mounts, even if the palette has never been opened.</p>
      <CodeBlock
        language="tsx"
        code={`<CommandEngineProvider config={{
  asyncSources: [{
    id: 'issues',
    // Resolves to CommandItem[]
    load: (query, { signal }) =>
      fetch(\`/api/issues?q=\${encodeURIComponent(query)}\`, { signal }).then((res) => res.json()),
    shouldFilter: false, // the server already matched the query
    maxResults: 10,      // cap per source when shouldFilter is false (default 10)
    group: 'Issues',
  }],
}}>`}
      />
      <p>With the default <code>shouldFilter: true</code>, loaded items are searched and ranked with your commands and count toward <code>maxResults</code>. With <code>false</code>, they are shown as returned after the local results. Only relative, <code>http(s)</code>, <code>mailto</code> and <code>tel</code> hrefs are kept on loaded items; use <code>action</code> for deep links. Items without a non-empty string <code>id</code> and <code>label</code> are dropped, and <code>asyncErrors</code> reports how many, for example &quot;2 items dropped: missing label&quot;.</p>
    </>
  )
}
