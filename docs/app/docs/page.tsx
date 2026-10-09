import Link from 'next/link'
import { DOCS_NAV } from '@/lib/constants'

export const metadata = { title: 'Documentation' }

export default function DocsIndex() {
  return (
    <>
      <h1>Documentation</h1>
      <p>
        Guides and reference for cmdk-engine. New here? Start with{' '}
        <Link href="/docs/getting-started">Getting Started</Link>.
      </p>
      {DOCS_NAV.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <ul>
            {section.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
                {item.description ? <>: {item.description}</> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
