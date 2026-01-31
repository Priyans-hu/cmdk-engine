export const metadata = { title: 'API Reference' }

export default function APIReference() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem', lineHeight: 1.7 }}>
      <h1>API Reference</h1>

      <h2>Core (<code>cmdk-engine</code>)</h2>

      <h3><code>createRegistry()</code></h3>
      <p>Creates a command registry — the central store for all commands.</p>
      <pre style={{ background: '#f6f8fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
{`const registry = createRegistry()
const unregister = registry.register({ id: 'cmd', label: 'My Command' })
const all = registry.getAll()
unregister() // cleanup`}
      </pre>

      <h3><code>createFuzzySearch()</code></h3>
      <p>Built-in lightweight fuzzy search engine. Scores by exact match, prefix, substring, word boundary, and character matching.</p>

      <h3><code>createKeywordEngine(synonyms, userAliases?)</code></h3>
      <p>Creates a keyword engine with bidirectional synonym lookup.</p>
      <pre style={{ background: '#f6f8fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
{`const keywords = createKeywordEngine({
  billing: ['money', 'payment'],
})
const expanded = keywords.expandQuery('money')
// ['money', 'billing']`}
      </pre>

      <h3><code>createAccessFilter(provider, mode?)</code></h3>
      <p>Creates a filter function that removes commands the user doesn't have permission to see.</p>

      <h3><code>createSimpleAccessProvider(permissions)</code></h3>
      <p>Creates an access control provider from an array or Set of permission strings.</p>

      <h3><code>createFrecencyEngine(options?)</code></h3>
      <p>Creates a frecency ranking engine with exponential decay.</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '1rem 0' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Option</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Default</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={{ padding: '0.5rem' }}><code>halfLife</code></td>
            <td style={{ padding: '0.5rem' }}>7 days</td>
            <td style={{ padding: '0.5rem' }}>Half-life for exponential decay</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={{ padding: '0.5rem' }}><code>maxAge</code></td>
            <td style={{ padding: '0.5rem' }}>30 days</td>
            <td style={{ padding: '0.5rem' }}>Max age before cleanup</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={{ padding: '0.5rem' }}><code>storage</code></td>
            <td style={{ padding: '0.5rem' }}>localStorage</td>
            <td style={{ padding: '0.5rem' }}>Custom storage backend</td>
          </tr>
        </tbody>
      </table>

      <h3><code>createGroupManager(groups?)</code></h3>
      <p>Manages command groups and their priority ordering.</p>

      <h3><code>defineConfig(config)</code></h3>
      <p>Helper function for type-checked CLI config files.</p>

      <hr style={{ margin: '2rem 0' }} />

      <h2>React (<code>cmdk-engine/react</code>)</h2>

      <h3><code>&lt;CommandEngineProvider&gt;</code></h3>
      <p>Context provider that initializes the engine. Accepts a <code>config</code> prop.</p>

      <h3><code>useCommandPalette()</code></h3>
      <p>Main hook returning the full palette state.</p>
      <pre style={{ background: '#f6f8fa', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
{`const {
  search,      // Current query string
  setSearch,   // Update query
  results,     // ScoredItem[] (filtered, ranked)
  flatResults, // Same as results (flat list)
  groups,      // Active CommandGroup[]
  isOpen,      // Palette visibility
  open, close, toggle,
  recordUsage, // Record command selection
} = useCommandPalette()`}
      </pre>

      <h3><code>useCommandRegister(commands, deps?)</code></h3>
      <p>Register commands from a component. Auto-cleans up on unmount.</p>

      <h3><code>useFrecency()</code></h3>
      <p>Direct access to frecency engine: <code>recordUsage</code>, <code>getScore</code>, <code>clear</code>.</p>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Adapters</h2>

      <h3><code>CommandPalette</code> (<code>cmdk-engine/adapters/cmdk</code>)</h3>
      <p>Pre-wired cmdk component. Sets <code>shouldFilter=false</code> automatically.</p>

      <h3><code>scanRoutes(routes)</code> (<code>cmdk-engine/adapters/react-router</code>)</h3>
      <p>Scan a React Router route tree and extract CommandItem objects.</p>
    </div>
  )
}
