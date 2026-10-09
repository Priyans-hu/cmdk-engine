import Link from 'next/link'
import type { ReactNode } from 'react'
import { CommandMenu } from '@/components/command-menu'

const LOCALES = ['en', 'de']

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <CommandMenu locale={locale}>
      <header>
        <nav>
          <Link href={`/${locale}`}>Home</Link>
          <Link href={`/${locale}/billing`}>Billing</Link>
          <Link href={`/${locale}/settings`}>Settings</Link>
          <Link href={`/${locale}/team`}>Team</Link>
        </nav>
        <nav>
          {LOCALES.map((other) => (
            <Link key={other} href={`/${other}`} aria-current={other === locale || undefined}>
              {other.toUpperCase()}
            </Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </CommandMenu>
  )
}
