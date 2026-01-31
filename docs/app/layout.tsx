import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'cmdk-engine',
    template: '%s | cmdk-engine',
  },
  description:
    'The smart command palette engine for React. Built on cmdk. Auto-discover routes, fuzzy search, RBAC filtering, frecency ranking, CLI tooling.',
  keywords: [
    'command palette',
    'cmdk',
    'react',
    'command menu',
    'cmd-k',
    'fuzzy search',
    'rbac',
    'frecency',
    'route discovery',
  ],
  authors: [{ name: 'Priyanshu', url: 'https://github.com/Priyans-hu' }],
  openGraph: {
    type: 'website',
    title: 'cmdk-engine',
    description: 'Smart command palette engine for React, built on cmdk',
    url: 'https://priyans-hu.github.io/cmdk-engine',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <nav
          style={{
            padding: '1rem 2rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
          }}
        >
          <a href="/cmdk-engine" style={{ fontWeight: 700, fontSize: '1.2rem', textDecoration: 'none', color: '#111' }}>
            cmdk-engine
          </a>
          <a href="/cmdk-engine/docs/getting-started" style={{ textDecoration: 'none', color: '#666' }}>
            Docs
          </a>
          <a href="/cmdk-engine/docs/api" style={{ textDecoration: 'none', color: '#666' }}>
            API
          </a>
          <a href="/cmdk-engine/docs/examples" style={{ textDecoration: 'none', color: '#666' }}>
            Examples
          </a>
          <a
            href="https://github.com/Priyans-hu/cmdk-engine"
            style={{ marginLeft: 'auto', textDecoration: 'none', color: '#666' }}
          >
            GitHub
          </a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
