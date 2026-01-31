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
      <p>Built-in lightweight fuzzy search engine. Scores by exact match, prefix, substring, word boundary, and character matching. Under 1 KB.</p>

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
  search,      // Current query string
  setSearch,   // Update query
  results,     // ScoredItem[] (filtered, ranked)
  flatResults, // Same as results (flat list)
  groups,      // Active CommandGroup[]
  isOpen,      // Palette visibility
  open, close, toggle,
  recordUsage, // Record command selection
} = useCommandPalette()`}
      />

      <h3><code>useCommandRegister(commands, deps?)</code></h3>
      <p>Register commands from a component. Auto-cleans up on unmount. Pass a dependency array to re-register when data changes.</p>

      <h3><code>useFrecency()</code></h3>
      <p>Direct access to frecency engine: <code>recordUsage</code>, <code>getScore</code>, <code>clear</code>.</p>

      <h2>Adapters</h2>

      <h3><code>CommandPalette</code> (<code>cmdk-engine/adapters/cmdk</code>)</h3>
      <p>Pre-wired cmdk component. Sets <code>shouldFilter={'{false}'}</code> automatically so cmdk-engine owns all filtering and ranking.</p>

      <h3><code>scanRoutes(routes)</code> (<code>cmdk-engine/adapters/react-router</code>)</h3>
      <p>Scan a React Router route tree and extract CommandItem objects. Reads <code>handle.command</code> metadata from route definitions.</p>
    </>
  )
}
