export default function Home() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem' }}>cmdk-engine</h1>
      <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem', lineHeight: 1.6 }}>
        The smart command palette engine for React.
        <br />
        Built on <a href="https://cmdk.paco.me">cmdk</a>. Auto-discover routes, fuzzy search with
        synonyms, RBAC filtering, frecency ranking, CLI tooling.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem' }}>
        <a
          href="/cmdk-engine/docs/getting-started"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#111',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Get Started
        </a>
        <a
          href="https://github.com/Priyans-hu/cmdk-engine"
          style={{
            padding: '0.75rem 1.5rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#333',
            fontWeight: 600,
          }}
        >
          GitHub
        </a>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          textAlign: 'left',
        }}
      >
        <Feature title="Route Discovery" description="Auto-scan React Router & Next.js routes via CLI or runtime adapters." />
        <Feature title="Fuzzy Search" description="Built-in lightweight search with synonym expansion. Under 1KB." />
        <Feature title="RBAC Filtering" description="Filter commands by user permissions. Any/all modes supported." />
        <Feature title="Frecency Ranking" description="Exponential decay algorithm. Frequently used commands appear first." />
        <Feature title="CLI Tooling" description="Scan routes, generate sitemaps, validate configs. Pre-commit hook ready." />
        <Feature title="< 5KB Core" description="Framework-agnostic core with zero runtime dependencies. Tree-shakeable." />
      </div>

      <pre
        style={{
          textAlign: 'left',
          background: '#f6f8fa',
          padding: '1.5rem',
          borderRadius: '8px',
          marginTop: '3rem',
          overflow: 'auto',
        }}
      >
        {`npm install cmdk-engine cmdk`}
      </pre>
    </div>
  )
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>{title}</h3>
      <p style={{ margin: 0, color: '#666', fontSize: '0.9rem', lineHeight: 1.5 }}>{description}</p>
    </div>
  )
}
